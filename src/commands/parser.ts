/**
 * Command parser — maps /arkon <text> to an ARKON MCP tool call.
 *
 * Supports structured commands (regex fast path) and falls back to
 * returning null so the caller can invoke Claude for intent parsing.
 */

export interface ParsedCommand {
  tool: string
  args: Record<string, unknown>
  label: string // human-readable action name for Slack messages
}

export function parseCommand(text: string): ParsedCommand | null {
  const t = text.trim()

  // review PR <id> in <repo>
  let m = t.match(/^review\s+PR?\s+#?(\d+)\s+in\s+(.+)$/i)
  if (m) return {
    tool: 'arkon_review_pr',
    args: { pr_id: Number(m[1]), repo: m[2].trim() },
    label: `Review PR #${m[1]} in ${m[2].trim()}`,
  }

  // security-scan PR <id> in <repo>
  m = t.match(/^security[-\s]scan\s+PR?\s+#?(\d+)\s+in\s+(.+)$/i)
  if (m) return {
    tool: 'arkon_security_scan',
    args: { pr_id: Number(m[1]), repo: m[2].trim() },
    label: `Security scan PR #${m[1]} in ${m[2].trim()}`,
  }

  // sprint-report [sprint] [audience]
  m = t.match(/^sprint[-\s]report(?:\s+"?([^"]+)"?)?(?:\s+(team|management|cio))?$/i)
  if (m) return {
    tool: 'arkon_sprint_report',
    args: {
      ...(m[1] ? { sprint: m[1].trim() } : {}),
      audience: (m[2] ?? 'team').toLowerCase(),
    },
    label: `Sprint report${m[1] ? ` — ${m[1].trim()}` : ''} (${m[2] ?? 'team'})`,
  }

  // release-notes <sprint>
  m = t.match(/^release[-\s]notes\s+"?([^"]+)"?$/i)
  if (m) return {
    tool: 'arkon_release_notes',
    args: { sprint: m[1].trim() },
    label: `Release notes — ${m[1].trim()}`,
  }

  // tech-debt [repo]
  m = t.match(/^tech[-\s]debt(?:\s+(\S+))?$/i)
  if (m) return {
    tool: 'arkon_tech_debt_report',
    args: m[1] ? { repo: m[1].trim() } : {},
    label: `Tech debt${m[1] ? ` — ${m[1].trim()}` : ''}`,
  }

  // postmortem <incident-id>
  m = t.match(/^postmortem\s+#?(\d+)$/i)
  if (m) return {
    tool: 'arkon_postmortem',
    args: { incident_id: Number(m[1]) },
    label: `Postmortem — incident #${m[1]}`,
  }

  // perf-test <service> [env]
  m = t.match(/^perf[-\s]test\s+(\S+)(?:\s+(dev|qa|prod))?$/i)
  if (m) return {
    tool: 'arkon_perf_test_plan',
    args: { service: m[1].trim(), ...(m[2] ? { environment: m[2].toLowerCase() } : {}) },
    label: `Perf test plan — ${m[1].trim()}${m[2] ? ` (${m[2]})` : ''}`,
  }

  return null
}
