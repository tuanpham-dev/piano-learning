// A9 live mode through the MCP SDK client; A10 an older server build against this app. Run: node qa/shot.mjs qa/a9-a10-mcp-live.mjs
import { writeFileSync, readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { connect } from './mcp-client.mjs'
const URL = 'http://127.0.0.1:5317'
const BANNER = "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);"

export default async ({ page, log }) => {
  // Its own port, so a piano server already running for your AI client doesn't clash.
  const mcp = await connect('mcp/dist/piano-mcp.js', { PIANO_PORT: '8768' })
  await page.goto(URL); await page.click("text=I'm an adult"); await page.click("text=Let's play")
  await page.evaluate(() => localStorage.setItem('piano:ai-port', '8768'))
  await page.goto(URL + '/songs'); await page.click('text=New song'); await page.waitForURL(/edit\/draft/)
  await page.click('[data-testid=ai-connect]')
  await page.waitForSelector('text=Connected to the AI helper')
  log('A9 connected')
  log('A9 new_song:', (await mcp.call('new_song', { title: 'Live test' })).text.replace(/\s+/g, ' '))
  const e1 = await mcp.call('set_bars', { bar: 1, right: 'C4q1 E4q3 G4q5 C5q5', left: 'C3w' })
  const e2 = await mcp.call('set_bars', { bar: 2, right: 'G4w5', left: 'G2w' })
  log('A9 edits:', e1.json?.wrote, e2.json?.wrote, '| notes:', e1.notes.length + e2.notes.length)
  await page.evaluate(() => (window.__notes = []))
  log('A9 play_song:', (await mcp.call('play_song', { from: 1, to: 2 })).text.replace(/\s+/g, ' '))
  await page.waitForTimeout(1200)
  log('A9 played notes so far:', await page.evaluate(() => window.__notes?.length), '| cursor visible:', await page.locator('[data-testid=staff-cursor]').evaluate((el) => el.style.opacity))
  const shot = await mcp.call('screenshot', { from: 1, to: 2 })
  const png = Buffer.from(shot.images[0]?.data ?? '', 'base64')
  writeFileSync('qa/out/a9-screenshot.png', png)
  log('A9 screenshot:', shot.images[0]?.mimeType, png.length, 'bytes, PNG magic', png.subarray(1, 4).toString())
  log('A9 editor title:', await page.locator('#ed-title').inputValue(), '| bars:', await page.locator('[data-bar]').count())
  log('A9 activity:', (await page.locator('[data-testid=ai-activity]').innerText()).replace(/\n/g, ' | '))
  await page.getByRole('button', { name: 'Undo' }).click(); await page.waitForTimeout(200)
  log('A9 after undo, bar 2 right:', (await mcp.call('get_song')).json?.bars?.[1]?.right)
  await page.screenshot({ path: 'qa/out/a9-editor.png' })
  log('A9 save_song:', (await mcp.call('save_song')).text.replace(/\s+/g, ' '))
  log('A9 list_songs mine:', JSON.stringify((await mcp.call('list_songs')).json?.mySongs))
  log('A9 open bundled:', (await mcp.call('open_song', { song: 'Ode to Joy' })).text.replace(/\s+/g, ' '))
  await mcp.close()

  // A10: same server with one tool missing, so its fingerprint is older.
  await build({
    entryPoints: ['mcp/server.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'qa/out/old-piano-mcp.js', banner: { js: BANNER }, logLevel: 'error',
    plugins: [{ name: 'older-tools', setup(b) { b.onLoad({ filter: /song-tools\.ts$/ }, (a) => ({ loader: 'ts', contents: readFileSync(a.path, 'utf8') + "\nTOOLS.splice(TOOLS.findIndex((t) => t.name === 'transpose'), 1)\n" })) } }],
  })
  const old = await connect('qa/out/old-piano-mcp.js', { PIANO_PORT: '8767' })
  await page.evaluate(() => localStorage.setItem('piano:ai-port', '8767'))
  await page.click('[data-testid=ai-connect]'); await page.click('[data-testid=ai-connect]')
  await page.waitForSelector('text=Connected to the AI helper')
  await page.waitForTimeout(300)
  log('A10 app warning:', await page.locator('[data-testid=ai-status]').innerText())
  const listed = (await old.client.listTools()).tools.map((t) => t.name)
  log('A10 old server lists transpose:', listed.includes('transpose'))
  const r = await old.call('get_song')
  log('A10 note on results:', r.notes[0]?.slice(0, 160))
  const tr = await old.call('call_tool', { name: 'transpose', args: { semitones: 12 } })
  log('A10 call_tool transpose:', tr.error ? tr.text : 'ok', '| bar 1 now:', (await old.call('get_song')).json?.bars?.[0]?.right)
  await old.close()
  await page.evaluate(() => localStorage.removeItem('piano:ai-port'))
}
