# ARKON Slack Agent

Connects Slack to the [ARKON Engine](https://github.com/upgradedev/arkon-engine) via MCP (Model Context Protocol), bringing AI-powered DevOps automation directly into your Slack workspace.

Built for the [Slack Agent Builder Challenge](https://slackhack.devpost.com/) — July 2026.

## What it does

One Slack agent surface. Seven DevOps actions. Live MCP tool discovery. All powered by AI.

```
/arkon review PR 123 in Customers.API
/arkon security-scan PR 123 in Customers.API
/arkon sprint-report "Sprint 26" management
/arkon release-notes "Sprint 26"
/arkon tech-debt Customers.API
/arkon postmortem 11384
/arkon perf-test Customers.API qa
/arkon tools
```

The same commands work through `/arkon`, `@ARKON` mentions, and direct messages
to the app. Results are posted back with structured Block Kit formatting.

## Architecture

```
Slack Workspace
  /arkon, @ARKON, or DM
       │ Slack Events API
       ▼
ARKON Slack Agent  (this repo — Bolt SDK / TypeScript)
  Azure Container Apps
       │ initialize + tools/list + tools/call
       │ POST $ARKON_MCP_URL  (MCP 2024-11-05, JSON-RPC 2.0)
       │ X-Tenant-ID: <workspace-id>
       ▼
ARKON Engine  (Go, Azure Functions — existing)
  7 MCP tools → Azure AI Foundry → Azure DevOps
```

## Quickstart

### Prerequisites
- Node.js 20+
- A Slack app with `/arkon`, `app_home_opened`, `app_mention`, and `message.im`
  configured from `manifest.json`
- ARKON Engine deployed and accessible

### 1. Create a Slack App

Go to https://api.slack.com/apps → Create New App → From Manifest, and use
`manifest.json`. Replace every `https://your-host/slack/events` placeholder with
your deployed request URL before installing.

The manifest shape is:

```yaml
display_information:
  name: ARKON
  description: AI-powered DevOps automation for your team
  background_color: "#1a1a2e"
features:
  app_home:
    home_tab_enabled: true
    messages_tab_enabled: true
    messages_tab_read_only_enabled: false
  slash_commands:
    - command: /arkon
      url: https://your-host/slack/events
      description: Run ARKON DevOps actions
      usage_hint: "review PR 123 in Customers.API | help"
      should_escape: false
oauth_config:
  scopes:
    bot:
      - commands
      - chat:write
      - app_mentions:read
      - im:history
      - im:write
settings:
  event_subscriptions:
    request_url: https://your-host/slack/events
    bot_events:
      - app_home_opened
      - app_mention
      - message.im
  interactivity:
    is_enabled: false
  org_deploy_enabled: false
  socket_mode_enabled: false
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, ARKON_MCP_URL, ARKON_TENANT_ID
```

### 3. Run locally

```bash
npm install
npm run dev
# Expose via ngrok for Slack webhook verification:
# ngrok http 3000
```

### 4. Deploy to Azure Container Apps

```bash
docker build -t arkon-slack .
docker push <registry>/arkon-slack:latest
az containerapp create \
  --name arkon-slack \
  --resource-group <rg> \
  --image <registry>/arkon-slack:latest \
  --target-port 3000 \
  --ingress external \
  --env-vars SLACK_BOT_TOKEN=... SLACK_SIGNING_SECRET=... ARKON_MCP_URL=...
```

## How it works

1. User runs `/arkon`, mentions `@ARKON`, or DMs the app
2. Slack sends the slash command or Events API payload to this agent
3. Agent sends an immediate loading message for long-running actions
4. For `/arkon tools`, the agent calls MCP `initialize` and `tools/list`
5. For actions, the agent calls MCP `tools/call` with the selected tool and tenant ID
6. ARKON Engine fetches DevOps data, runs the AI companion workflow, and returns a structured summary
7. Agent posts Block Kit formatted results back to Slack

## MCP integration

The ARKON Engine exposes a compliant MCP 2024-11-05 server at the URL configured
by `ARKON_MCP_URL`. This agent is a thin MCP client — it does not contain any AI
logic itself. All intelligence lives in the Engine's companion pipeline. The
agent performs MCP `initialize` plus `tools/list` for live capability discovery,
and MCP `tools/call` for execution.

MCP tools available: `arkon_review_pr`, `arkon_security_scan`, `arkon_sprint_report`, `arkon_release_notes`, `arkon_tech_debt_report`, `arkon_postmortem`, `arkon_perf_test_plan`

## AgentHack readiness

See `SUBMISSION-READINESS.md` for the live readiness checklist. In short, this
repo now covers deterministic install, build/test verification, a Slack manifest
draft, App Home, slash command, mention, DM routing, Block Kit output, MCP
discovery, and MCP `tools/call` glue. The remaining submission
items require real external inputs: Slack sandbox/app credentials, the deployed
MCP endpoint and auth, sandbox access grants for the judges, Slack App ID,
architecture export, and a public demo video under 3 minutes.

## License

MIT — E. Fousekis / Reflective
