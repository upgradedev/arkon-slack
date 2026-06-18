# ARKON Slack Agent

Connects Slack to the [ARKON Engine](https://github.com/upgradedev/arkon-engine) via MCP (Model Context Protocol), bringing AI-powered DevOps automation directly into your Slack workspace.

Built for the [Slack Agent Builder Challenge](https://slackhack.devpost.com/) — July 2026.

## What it does

One slash command. Seven DevOps actions. All powered by AI.

```
/arkon review PR 123 in Customers.API
/arkon security-scan PR 123 in Customers.API
/arkon sprint-report "Sprint 26" management
/arkon release-notes "Sprint 26"
/arkon tech-debt Customers.API
/arkon postmortem 11384
/arkon perf-test Customers.API qa
```

Results are posted back to the channel with structured Block Kit formatting.

## Architecture

```
Slack Workspace
  /arkon <command>
       │ Slack Events API
       ▼
ARKON Slack Agent  (this repo — Bolt SDK / TypeScript)
  Azure Container Apps
       │ POST /alice-mcp  (MCP 2024-11-05, JSON-RPC 2.0)
       │ X-Tenant-ID: <workspace-id>
       ▼
ARKON Engine  (Go, Azure Functions — existing)
  7 MCP tools → Azure AI Foundry → Azure DevOps
```

## Quickstart

### Prerequisites
- Node.js 20+
- A Slack app with `/arkon` slash command and `app_home_opened` event subscription
- ARKON Engine deployed and accessible

### 1. Create a Slack App

Go to https://api.slack.com/apps → Create New App → From Manifest, paste:

```yaml
display_information:
  name: ARKON
  description: AI-powered DevOps automation for your team
  background_color: "#1a1a2e"
features:
  app_home:
    home_tab_enabled: true
    messages_tab_enabled: false
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
settings:
  event_subscriptions:
    request_url: https://your-host/slack/events
    bot_events:
      - app_home_opened
  interactivity:
    is_enabled: false
  org_deploy_enabled: false
  socket_mode_enabled: false
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, ARKON_ENGINE_URL, ARKON_TENANT_ID
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
  --env-vars SLACK_BOT_TOKEN=... SLACK_SIGNING_SECRET=... ARKON_ENGINE_URL=...
```

## How it works

1. User types `/arkon review PR 123 in Customers.API` in any channel
2. Slack sends the slash command to this agent (must respond within 3s)
3. Agent sends an immediate "ARKON is thinking..." loading message
4. Agent calls the ARKON Engine's MCP server (`POST /alice-mcp`) with `tools/call`
5. ARKON Engine fetches the PR from Azure DevOps, runs the AI companion review via Azure AI Foundry, and returns a structured summary
6. Agent updates the loading message with Block Kit formatted results

## MCP integration

The ARKON Engine exposes a compliant MCP 2024-11-05 server at `/alice-mcp`. This agent is a thin MCP client — it does not contain any AI logic itself. All intelligence lives in the Engine's companion pipeline.

MCP tools available: `arkon_review_pr`, `arkon_security_scan`, `arkon_sprint_report`, `arkon_release_notes`, `arkon_tech_debt_report`, `arkon_postmortem`, `arkon_perf_test_plan`

## License

MIT — E. Fousekis / Reflective
