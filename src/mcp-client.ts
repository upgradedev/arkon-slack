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

export async function callMCPTool(
  toolName: string,
  args: Record<string, unknown>,
  tenantId: string,
): Promise<MCPCallResult> {
  const engineUrl = process.env.ARKON_ENGINE_URL
  if (!engineUrl) throw new Error('ARKON_ENGINE_URL is not set')

  const id = ++requestId
  const body = {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: { name: toolName, arguments: args },
  }

  const res = await fetch(`${engineUrl}/alice-mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000), // 2 min — AI actions can be slow
  })

  if (!res.ok) {
    throw new Error(`Engine returned HTTP ${res.status}`)
  }

  const json = (await res.json()) as {
    result?: { content?: { text?: string }[]; isError?: boolean }
    error?: { message: string }
  }

  if (json.error) throw new Error(json.error.message)

  const content = json.result?.content ?? []
  const text = content.map((c) => c.text ?? '').join('\n').trim() || '(no output)'
  return { text, isError: json.result?.isError ?? false }
}
