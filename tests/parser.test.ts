import { parseCommand } from '../src/commands/parser'

describe('parseCommand', () => {
  it('maps supported slash commands to MCP tool calls', () => {
    expect(parseCommand('review PR 123 in Customers.API')).toEqual({
      tool: 'arkon_review_pr',
      args: { pr_id: 123, repo: 'Customers.API' },
      label: 'Review PR #123 in Customers.API',
    })

    expect(parseCommand('security-scan PR #456 in Billing.Service')).toEqual({
      tool: 'arkon_security_scan',
      args: { pr_id: 456, repo: 'Billing.Service' },
      label: 'Security scan PR #456 in Billing.Service',
    })

    expect(parseCommand('sprint-report "Sprint 26" management')).toEqual({
      tool: 'arkon_sprint_report',
      args: { sprint: 'Sprint 26', audience: 'management' },
      label: 'Sprint report — Sprint 26 (management)',
    })

    expect(parseCommand('release-notes "Sprint 26"')).toEqual({
      tool: 'arkon_release_notes',
      args: { sprint: 'Sprint 26' },
      label: 'Release notes — Sprint 26',
    })

    expect(parseCommand('tech-debt Customers.API')).toEqual({
      tool: 'arkon_tech_debt_report',
      args: { repo: 'Customers.API' },
      label: 'Tech debt — Customers.API',
    })

    expect(parseCommand('postmortem 11384')).toEqual({
      tool: 'arkon_postmortem',
      args: { incident_id: 11384 },
      label: 'Postmortem — incident #11384',
    })

    expect(parseCommand('perf-test Customers.API qa')).toEqual({
      tool: 'arkon_perf_test_plan',
      args: { service: 'Customers.API', environment: 'qa' },
      label: 'Perf test plan — Customers.API (qa)',
    })
  })

  it('defaults optional arguments safely', () => {
    expect(parseCommand('sprint-report')).toEqual({
      tool: 'arkon_sprint_report',
      args: { audience: 'team' },
      label: 'Sprint report (team)',
    })

    expect(parseCommand('tech-debt')).toEqual({
      tool: 'arkon_tech_debt_report',
      args: {},
      label: 'Tech debt',
    })
  })

  it('returns null for unknown commands', () => {
    expect(parseCommand('deploy production')).toBeNull()
  })
})
