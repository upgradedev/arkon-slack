/**
 * MCP client for the ARKON Engine hosted MCP server.
 * Transport: Streamable HTTP (MCP spec 2024-11-05), JSON-RPC 2.0.
 * Endpoint: POST /alice-mcp
 */

let requestId = 0

export interface MCPCallResult {
  text: string
  isError: boolean
}

export interface MCPTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export interface MCPInitializeResult {
  protocolVersion?: string
  serverInfo?: {
    name?: string
    version?: string
  }
  capabilities?: Record<string, unknown>
}

export function getMcpEndpoint(): string {
  const explicitMcpUrl = process.env.ARKON_MCP_URL?.trim()
  if (explicitMcpUrl) return explicitMcpUrl

  const engineUrl = process.env.ARKON_ENGINE_URL?.trim()
  if (!engineUrl) throw new Error('ARKON_MCP_URL or ARKON_ENGINE_URL is not set')

  return `${engineUrl.replace(/\/+$/, '')}/alice-mcp`
}

function mcpAuthHeaders(): Record<string, string> {
  const header = process.env.ARKON_MCP_AUTH_HEADER?.trim()
  const value = process.env.ARKON_MCP_AUTH_VALUE?.trim()
  if (header && value) return { [header]: value }

  const bearerToken = process.env.ARKON_ENGINE_TOKEN?.trim() ?? process.env.ARKON_MCP_BEARER_TOKEN?.trim()
  return bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}
}

function parseMcpJson(raw: string, contentType: string): unknown {
  if (contentType.includes('text/event-stream')) {
    const dataLine = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith('data:') && !line.includes('[DONE]'))

    if (!dataLine) throw new Error('Engine returned an empty event stream')
    return JSON.parse(dataLine.slice('data:'.length).trim())
  }

  return JSON.parse(raw)
}

export async function mcpRequest<T>(
  method: string,
  params: Record<string, unknown> | undefined,
  tenantId: string,
  timeoutMs = 120_000,
): Promise<T> {
  const id = ++requestId
  const body = params === undefined
    ? { jsonrpc: '2.0', id, method }
    : { jsonrpc: '2.0', id, method, params }

  const res = await fetch(getMcpEndpoint(), {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': '2024-11-05',
      'X-Tenant-ID': tenantId,
      ...mcpAuthHeaders(),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!res.ok) {
    throw new Error(`Engine returned HTTP ${res.status}`)
  }

  const raw = await res.text()
  const json = parseMcpJson(raw, res.headers.get('content-type') ?? '') as {
    result?: T
    error?: { message: string }
  }

  if (json.error) throw new Error(json.error.message)
  if (json.result === undefined) throw new Error(`Engine returned no result for ${method}`)

  return json.result
}

export async function initializeMCP(tenantId: string): Promise<MCPInitializeResult> {
  return mcpRequest<MCPInitializeResult>(
    'initialize',
    {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'arkon-slack',
        version: process.env.npm_package_version ?? '1.0.0',
      },
    },
    tenantId,
    30_000,
  )
}

export async function listMCPTools(tenantId: string): Promise<MCPTool[]> {
  await initializeMCP(tenantId)
  const result = await mcpRequest<{ tools?: MCPTool[] }>('tools/list', undefined, tenantId, 30_000)
  return result.tools ?? []
}

export async function callMCPTool(
  toolName: string,
  args: Record<string, unknown>,
  tenantId: string,
): Promise<MCPCallResult> {
  const result = await mcpRequest<{ content?: { text?: string }[]; isError?: boolean }>(
    'tools/call',
    { name: toolName, arguments: args },
    tenantId,
    120_000,
  )

  const content = result.content ?? []
  const text = content.map((c) => c.text ?? '').join('\n').trim() || '(no output)'
  return { text, isError: result.isError ?? false }
}
