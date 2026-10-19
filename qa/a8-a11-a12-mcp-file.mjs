// A8 file mode, A11 MusicXML import, A12 add_to_bundled. Run: node qa/a8-a11-a12-mcp-file.mjs
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { connect } from './mcp-client.mjs'
const out = 'qa/out/mcp'
for (const f of ['a8.song.json', 'a8-export.song.json', 'a11.song.json']) rmSync(`${out}/${f}`, { force: true })
const { client, call, close } = await connect('mcp/dist/piano-mcp.js', { PIANO_PORT: '8799' })
const tools = (await client.listTools()).tools.map((t) => t.name)
console.log('tools:', tools.join(', '))
// A8
console.log('A8 new_song:', (await call('new_song', { title: 'File test', file: `${out}/a8.song.json` })).text.replace(/\s+/g, ' '))
console.log('A8 set_bars:', (await call('set_bars', { file: `${out}/a8.song.json`, bar: 1, right: 'C4q1 D4q2 E4q3 F4q4 | G4h5 G4h5', left: 'C3w | G2w' })).json?.wrote)
console.log('A8 check_song:', JSON.stringify((await call('check_song', { file: `${out}/a8.song.json` })).json))
console.log('A8 export:', (await call('export_song_file', { file: `${out}/a8.song.json`, path: `${out}/a8-export.song.json` })).json)
console.log('A8 refuses overwrite:', (await call('export_song_file', { file: `${out}/a8.song.json`, path: `${out}/a8-export.song.json` })).text)
console.log('A8 missing file:', (await call('get_song', { file: `${out}/nope.song.json` })).text)
console.log('A8 bad args:', (await call('set_bars', { file: `${out}/a8.song.json`, bar: 0 })).text)
console.log('A8 live without app:', (await call('get_song', {})).text.slice(0, 80))
// A11
const r11 = await call('import_musicxml', { path: 'src/engine/__fixtures__/test-score.musicxml', file: `${out}/a11.song.json` })
console.log('A11:', r11.text.replace(/\s+/g, ' '))
const s11 = JSON.parse(readFileSync(`${out}/a11.song.json`, 'utf8'))
console.log('A11 right:', s11.right, '\nA11 left:', s11.left)
// A12
const before = readFileSync('src/content/songs/index.ts', 'utf8')
try {
  const r12 = await call('add_to_bundled', { file: `${out}/a8.song.json`, id: 'qa-file-test' })
  console.log('A12 add:', r12.text.replace(/\s+/g, ' '))
  console.log('A12 listed:', readFileSync('src/content/songs/index.ts', 'utf8').includes("import qaFileTest from './qa-file-test'"))
  console.log('A12 again:', (await call('add_to_bundled', { file: `${out}/a8.song.json`, id: 'qa-file-test' })).text)
  try { execSync('npx vitest run src/content src/engine/song-text.test.ts', { stdio: 'pipe' }); console.log('A12 npm test (songs): pass') } catch (e) { console.log('A12 npm test FAILED', String(e.stdout).slice(-1500)) }
  if (process.env.KEEP_BUNDLED) { console.log('A12 kept for the library check'); process.exit(0) }
} finally {
  if (!process.env.KEEP_BUNDLED) { writeFileSync('src/content/songs/index.ts', before); rmSync('src/content/songs/qa-file-test.ts', { force: true }) }
}
console.log('A12 cleaned up:', !existsSync('src/content/songs/qa-file-test.ts'))
await close()
