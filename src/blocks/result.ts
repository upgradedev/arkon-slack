/**
 * Block Kit helpers — format ARKON Engine output for Slack.
 */

import type { Block, KnownBlock } from '@slack/bolt'

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
          '`/arkon perf-test <service> [dev|qa|prod]` — k6 performance test plan',
      },
    },
  ]
}
