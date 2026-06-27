import 'dotenv/config'
import { App, LogLevel } from '@slack/bolt'
import type { Block, KnownBlock } from '@slack/types'
import { callMCPTool, listMCPTools } from './mcp-client'
import { parseCommand } from './commands/parser'
import { loadingBlocks, resultBlocks, errorBlocks, helpBlocks, toolsBlocks } from './blocks/result'

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
})

type SlackBlocks = (KnownBlock | Block)[]

interface SlackClient {
  chat: {
    postMessage(args: {
      channel: string
      text: string
      blocks?: SlackBlocks
      thread_ts?: string
    }): Promise<unknown>
  }
}

interface MessageEvent {
  text?: string
  user?: string
  channel?: string
  channel_type?: string
  subtype?: string
  bot_id?: string
  team?: string
  ts?: string
  thread_ts?: string
}

interface ArkonResponder {
  sendHelp(): Promise<void>
  sendUnknown(text: string): Promise<void>
  sendLoading(action: string): Promise<void>
  sendResult(action: string, text: string, isError: boolean): Promise<void>
  sendError(action: string, message: string): Promise<void>
  sendTools(tools: { name: string; description?: string }[]): Promise<void>
}

function tenantIdFor(teamId?: string): string {
  return process.env.ARKON_TENANT_ID ?? teamId ?? 'default'
}

function stripBotMentions(text: string): string {
  return text.replace(/<@[A-Z0-9]+>\s*/g, '').trim()
}

async function handleArkonRequest(text: string, tenantId: string, responder: ArkonResponder): Promise<void> {
  const cleanText = stripBotMentions(text)

  if (!cleanText || /^help$/i.test(cleanText)) {
    await responder.sendHelp()
    return
  }

  if (/^(tools|list[-\s]?tools|capabilities)$/i.test(cleanText)) {
    try {
      const tools = await listMCPTools(tenantId)
      await responder.sendTools(tools)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await responder.sendError('Discover MCP tools', message)
    }
    return
  }

  const parsed = parseCommand(cleanText)
  if (!parsed) {
    await responder.sendUnknown(cleanText)
    return
  }

  await responder.sendLoading(parsed.label)

  try {
    const result = await callMCPTool(parsed.tool, parsed.args, tenantId)
    await responder.sendResult(parsed.label, result.text, result.isError)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await responder.sendError(parsed.label, message)
  }
}

function channelResponder(client: SlackClient, channel: string, threadTs?: string): ArkonResponder {
  const post = async (text: string, blocks?: SlackBlocks): Promise<void> => {
    const message = {
      channel,
      text,
      blocks,
      ...(threadTs ? { thread_ts: threadTs } : {}),
    }
    await client.chat.postMessage(message)
  }

  return {
    sendHelp: () => post('ARKON help', helpBlocks()),
    sendUnknown: (text) => post(`Unknown command: ${text}. Type help to see available commands.`),
    sendLoading: (action) => post(`ARKON is running: ${action}`, loadingBlocks(action)),
    sendResult: (action, text, isError) => post(`ARKON ${isError ? 'completed with errors' : 'complete'}: ${action}`, resultBlocks(action, text, isError)),
    sendError: (action, message) => post(`ARKON failed: ${action}`, errorBlocks(action, message)),
    sendTools: (tools) => post('ARKON MCP tools', toolsBlocks(tools)),
  }
}

// /arkon <command>
app.command('/arkon', async ({ command, ack, respond }) => {
  await ack()

  await handleArkonRequest(command.text.trim(), tenantIdFor(command.team_id), {
    sendHelp: () => respond({ blocks: helpBlocks(), response_type: 'ephemeral' }),
    sendUnknown: (text) => respond({
      response_type: 'ephemeral',
      text: `Unknown command: \`/arkon ${text}\`\nType \`/arkon help\` to see available commands.`,
    }),
    sendLoading: (action) => respond({
      response_type: 'in_channel',
      blocks: loadingBlocks(action),
    }),
    sendResult: (action, text, isError) => respond({
      replace_original: true,
      blocks: resultBlocks(action, text, isError),
    }),
    sendError: (action, message) => respond({
      replace_original: true,
      blocks: errorBlocks(action, message),
    }),
    sendTools: (tools) => respond({
      response_type: 'ephemeral',
      blocks: toolsBlocks(tools),
    }),
  })
})

// Channel mentions - users can @ARKON with the same natural commands.
app.event('app_mention', async ({ event, client }) => {
  const mentionEvent = event as MessageEvent
  if (!mentionEvent.channel) return

  await handleArkonRequest(
    mentionEvent.text ?? '',
    tenantIdFor(mentionEvent.team),
    channelResponder(client, mentionEvent.channel, mentionEvent.thread_ts ?? mentionEvent.ts),
  )
})

// Direct messages - gives judges a cleaner conversational test surface.
app.message(async ({ message, client }) => {
  const dmEvent = message as MessageEvent
  if (dmEvent.subtype || dmEvent.bot_id || dmEvent.channel_type !== 'im' || !dmEvent.channel) return

  await handleArkonRequest(
    dmEvent.text ?? '',
    tenantIdFor(dmEvent.team),
    channelResponder(client, dmEvent.channel),
  )
})

// App Home tab — shows available commands
app.event('app_home_opened', async ({ event, client }) => {
  await client.views.publish({
    user_id: event.user,
    view: {
      type: 'home',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: ':robot_face: ARKON DevOps Agent' },
        },
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*ARKON* connects your Slack workspace to the ARKON Engine — an AI-powered DevOps automation platform that runs code reviews, security scans, sprint reports, and more via a single slash command.\n\nType `/arkon help` in any channel to get started.',
          },
        },
        { type: 'divider' },
        ...helpBlocks().slice(2), // reuse command list from help
      ],
    },
  })
})

const port = Number(process.env.PORT ?? 3000)

;(async () => {
  await app.start(port)
  console.log(`ARKON Slack Agent running on :${port}`)
  console.log(`MCP endpoint: ${process.env.ARKON_MCP_URL ?? process.env.ARKON_ENGINE_URL ?? '(not set)'}`)
})()
