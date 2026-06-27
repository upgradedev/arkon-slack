import { errorBlocks, helpBlocks, loadingBlocks, resultBlocks } from '../src/blocks/result'

function blockText(block: unknown): string {
  return (block as { text?: { text?: string } }).text?.text ?? ''
}

describe('Block Kit helpers', () => {
  it('renders loading and help blocks without needing secrets', () => {
    expect(loadingBlocks('Review PR #123')).toHaveLength(1)
    expect(helpBlocks().map((block) => block.type)).toEqual(['header', 'divider', 'section'])
  })

  it('truncates long MCP output to fit Slack section text limits', () => {
    const blocks = resultBlocks('Review PR #123', 'a'.repeat(3100), false)
    const body = blocks[2]

    expect(body.type).toBe('section')
    expect(blockText(body)).toContain('truncated')
    expect(blockText(body).length).toBeLessThanOrEqual(3000)
  })

  it('formats user-facing errors without exposing a stack trace by default', () => {
    const blocks = errorBlocks('Review PR #123', 'Engine returned HTTP 500')
    const text = blockText(blocks[0])

    expect(text).toContain('Review PR #123 failed')
    expect(text).toContain('Engine returned HTTP 500')
    expect(text).not.toContain('at ')
  })
})
