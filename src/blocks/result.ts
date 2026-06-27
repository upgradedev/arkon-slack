/**
 * Block Kit helpers — format ARKON Engine output for Slack.
 */

import type { Block, KnownBlock } from '@slack/types'

interface ToolSummary {
  name: string
  description?: string
}

export function loadingBlocks(action: string): (KnownBlock | Block)[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:hourglass_flowing_sand: *ARKON is running:* \`${action}\`\n_This usually takes 20–60 seconds..._`,
      },
    },
  ]
}

export function resultBlocks(
  action: string,
  text: string,
  isError: boolean,
): (KnownBlock | Block)[] {
  const icon = isError ? ':warning:' : ':white_check_mark:'
  const label = isError ? 'completed with errors' : 'complete'

  // Truncate to Slack block text limit (3000 chars)
  const body = text.length > 2900 ? text.slice(0, 2900) + '\n…_(truncated)_' : text

  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${icon} ARKON — ${action}` },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: body },
    },
    { type: 'divider' },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `${icon} Action ${label} · Powered by <https://github.com/upgradedev/arkon-slack|ARKON Engine>`,
        },
      ],
    },
  ]
}

export function errorBlocks(action: string, message: string): (KnownBlock | Block)[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:x: *ARKON — ${action} failed*\n\`\`\`${message}\`\`\``,
      },
    },
  ]
}

export function helpBlocks(): (KnownBlock | Block)[] {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: ':robot_face: ARKON DevOps Agent' },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Available commands:*\n' +
          '`/arkon review PR <id> in <repo>` — Code review a pull request\n' +
          '`/arkon security-scan PR <id> in <repo>` — OWASP security scan\n' +
          '`/arkon sprint-report [sprint] [team|management|cio]` — Sprint report\n' +
          '`/arkon release-notes <sprint>` — Release notes\n' +
          '`/arkon tech-debt [repo]` — Technical debt analysis\n' +
          '`/arkon postmortem <incident-id>` — Blameless postmortem\n' +
          '`/arkon perf-test <service> [dev|qa|prod]` — k6 performance test plan\n' +
          '`/arkon tools` — Discover live MCP tools\n\n' +
          'You can also mention `@ARKON` in a channel or DM the app with the same commands.',
      },
    },
  ]
}

export function toolsBlocks(tools: ToolSummary[]): (KnownBlock | Block)[] {
  const visibleTools = tools.slice(0, 20)
  const body = visibleTools.length
    ? visibleTools
      .map((tool) => `• \`${tool.name}\`${tool.description ? ` — ${tool.description}` : ''}`)
      .join('\n')
    : '_The MCP server returned no tools._'

  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: ':hammer_and_wrench: ARKON MCP Tools' },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: tools.length > visibleTools.length
          ? `${body}\n\n_Showing first ${visibleTools.length} of ${tools.length} tools._`
          : body,
      },
    },
  ]
}
