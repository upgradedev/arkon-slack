import { callMCPTool, getMcpEndpoint, listMCPTools, mcpRequest } from '../src/mcp-client'

const originalEnv = process.env

function jsonResponse(body: unknown) {
  return {
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    text: async () => JSON.stringify(body),
  }
}

describe('MCP client', () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.ARKON_MCP_URL
    delete process.env.ARKON_ENGINE_URL
    delete process.env.ARKON_ENGINE_TOKEN
    delete process.env.ARKON_MCP_BEARER_TOKEN
    delete process.env.ARKON_MCP_AUTH_HEADER
    delete process.env.ARKON_MCP_AUTH_VALUE
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('prefers the explicit MCP endpoint', () => {
    process.env.ARKON_MCP_URL = 'https://engine.example/api/alice-mcp'
    process.env.ARKON_ENGINE_URL = 'https://engine.example/api/alice'

    expect(getMcpEndpoint()).toBe('https://engine.example/api/alice-mcp')
  })

  it('builds a legacy endpoint from ARKON_ENGINE_URL', () => {
    process.env.ARKON_ENGINE_URL = 'https://engine.example/api/alice/'

    expect(getMcpEndpoint()).toBe('https://engine.example/api/alice/alice-mcp')
  })

  it('calls tools/call with tenant and custom auth headers', async () => {
    process.env.ARKON_MCP_URL = 'https://engine.example/api/alice-mcp'
    process.env.ARKON_MCP_AUTH_HEADER = 'X-Api-Key'
    process.env.ARKON_MCP_AUTH_VALUE = 'test-api-key'

    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        result: {
          content: [{ type: 'text', text: 'review complete' }],
          isError: false,
        },
      }),
    )
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await callMCPTool('arkon_review_pr', { pr_id: 123 }, 'T123')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { body: string; headers: Record<string, string> }]

    expect(result).toEqual({ text: 'review complete', isError: false })
    expect(url).toBe('https://engine.example/api/alice-mcp')
    expect(init.headers).toMatchObject({
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': '2024-11-05',
      'X-Tenant-ID': 'T123',
      'X-Api-Key': 'test-api-key',
    })
    expect(JSON.parse(init.body)).toMatchObject({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'arkon_review_pr', arguments: { pr_id: 123 } },
    })
  })

  it('throws JSON-RPC errors returned by the MCP server', async () => {
    process.env.ARKON_MCP_URL = 'https://engine.example/api/alice-mcp'
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ error: { message: 'tool unavailable' } }),
    ) as unknown as typeof fetch

    await expect(callMCPTool('arkon_review_pr', {}, 'T123')).rejects.toThrow('tool unavailable')
  })

  it('discovers tools through initialize followed by tools/list', async () => {
    process.env.ARKON_MCP_URL = 'https://engine.example/api/alice-mcp'

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'arkon-engine', version: '1.0.0' },
        },
      }))
      .mockResolvedValueOnce(jsonResponse({
        result: {
          tools: [
            { name: 'arkon_review_pr', description: 'Review a pull request' },
            { name: 'arkon_security_scan', description: 'Scan a pull request' },
          ],
        },
      }))
    global.fetch = fetchMock as unknown as typeof fetch

    const tools = await listMCPTools('T123')
    const initializeBody = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body)
    const listBody = JSON.parse((fetchMock.mock.calls[1][1] as { body: string }).body)

    expect(tools).toHaveLength(2)
    expect(tools[0].name).toBe('arkon_review_pr')
    expect(initializeBody.method).toBe('initialize')
    expect(listBody.method).toBe('tools/list')
  })

  it('parses streamable HTTP event-stream JSON-RPC responses', async () => {
    process.env.ARKON_MCP_URL = 'https://engine.example/api/alice-mcp'
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'text/event-stream' }),
      text: async () => 'event: message\ndata: {"result":{"ok":true}}\n\n',
    }) as unknown as typeof fetch

    await expect(mcpRequest<{ ok: boolean }>('ping', undefined, 'T123')).resolves.toEqual({ ok: true })
  })
})
