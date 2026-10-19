// Shared MCP SDK client for QA: starts the built server over stdio.
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

export async function connect(serverPath = 'mcp/dist/piano-mcp.js', env = {}) {
  const transport = new StdioClientTransport({ command: 'node', args: [serverPath], env: { ...process.env, ...env }, stderr: 'pipe' })
  const client = new Client({ name: 'piano-qa', version: '1.0.0' })
  await client.connect(transport)
  const call = async (name, args = {}) => {
    const r = await client.callTool({ name, arguments: args })
    const texts = r.content.filter((c) => c.type === 'text').map((c) => c.text)
    return { error: !!r.isError, text: texts[0] ?? '', notes: texts.slice(1), images: r.content.filter((c) => c.type === 'image'), json: (() => { try { return JSON.parse(texts[0]) } catch { return null } })() }
  }
  return { client, call, close: () => client.close() }
}
