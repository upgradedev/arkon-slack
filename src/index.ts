import 'dotenv/config'
import { App, LogLevel } from '@slack/bolt'
import { callMCPTool } from './mcp-client'
import { parseCommand } from './commands/parser'
import { loadingBlocks, resultBlocks, errorBlocks, helpBlocks } from './blocks/result'

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
})

// /arkon <command>
app.command('/arkon', async ({ command, ack, respond }) => {
  await ack()

  const text = command.text.trim()
  const tenantId = process.env.ARKON_TENANT_ID ?? command.team_id

  if (!text || text === 'help') {
    await respond({ blocks: helpBlocks(), response_type: 'ephemeral' })
    return
  }

  const parsed = parseCommand(text)
  if (!parsed) {
    await respond({
      response_type: 'ephemeral',
      text: `Unknown command: \`/arkon ${text}\`\nType \`/arkon help\` to see available commands.`,
    })
    return
  }

  // Immediate loading response — Slack requires a reply within 3s
  await respond({
    response_type: 'in_channel',
    blocks: loadingBlocks(parsed.label),
  })

  try {
    const result = await callMCPTool(parsed.tool, parsed.args, tenantId)
    await respond({
      replace_original: true,
      blocks: resultBlocks(parsed.label, result.text, result.isError),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await respond({
      replace_original: true,
      blocks: errorBlocks(parsed.label, message),
    })
  }
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
  console.log(`Engine: ${process.env.ARKON_ENGINE_URL ?? '(not set)'}`)
})()
