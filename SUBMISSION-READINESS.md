# Slack AgentHack Submission Readiness

This checklist tracks what is ready in this repository versus what still needs
real Slack/Devpost access or secrets. It intentionally contains placeholders
only.

## Ready in this repo

- Public repo: `https://github.com/upgradedev/arkon-slack`.
- Confirmed evidence commits include:
  - `bad20a8 Update Slack evidence readiness`.
  - `b814eef Document Slack container evidence run`.
- GitHub evidence CI is enabled and green, including `npm ci`, TypeScript build,
  Jest, production dependency audit, and Docker image build. Green runs include:
  `28312737485` and `28312077113`.
- Bolt for JavaScript app with `/arkon`, App Home, app mentions, and direct
  messages.
- Seven DevOps-oriented intents mapped to MCP `tools/call` across slash,
  mention, and DM entry points.
- Live MCP capability discovery through `initialize` plus `tools/list` via
  `/arkon tools`, `@ARKON tools`, or DM `tools`.
- Block Kit loading, result, help, and error formatting.
- Deterministic Node install through `package-lock.json`.
- Offline Jest tests for parser, Block Kit helpers, and MCP client request/error
  behavior.
- Slack app manifest draft in `manifest.json`, including bot events/scopes for
  App Home, slash commands, mentions, and DMs.
- Dockerfile for a container deployment.

## Must be supplied before Devpost submission

- Confirm entrant/team eligibility under the official rules.
- Choose the Devpost track. Default lowest-scope choice: New Slack Agent.
- Create a Slack developer sandbox app from `manifest.json`.
- Replace every `https://your-host/slack/events` placeholder with the deployed
  request URL, then reinstall/update the Slack app.
- Record the Slack App ID and sandbox URL.
- Grant sandbox access to `slackhack@salesforce.com` and
  `testing@devpost.com`.
- Configure real secret values outside git:
  `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `ARKON_MCP_URL`,
  `ARKON_TENANT_ID`, and any MCP auth token/header.
- Verify the real ARKON MCP endpoint returns valid JSON-RPC `tools/call`
  responses for all seven tools and valid `initialize` / `tools/list`
  responses for discovery.
- Produce the public demo video under 3 minutes and export the architecture
  diagram.

## Scoring gaps to consider before final recording

- Current app is an agentic Slack bot surface, but not the Slack Assistant
  side-panel product surface. If that track-specific UI is required, add it
  before final recording.
- There is no LLM planning loop in this repo; users select one of the seven
  supported actions directly.
- Replies are posted as loading/result message replacements, not true Slack
  streaming output.

Those gaps are larger than a low-risk readiness patch, but they matter for the
Technological Implementation and Design judging criteria.
