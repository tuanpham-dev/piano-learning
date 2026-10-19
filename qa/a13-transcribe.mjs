// A13 step 2: the transcription Claude read from qa/out/a13-twinkle.png, entered through the MCP tools in file mode, compared with the bundled song.
import { readFileSync, rmSync } from 'node:fs'
import { connect } from './mcp-client.mjs'
const file = 'qa/out/mcp/a13.song.json'
rmSync(file, { force: true })
const { call, close } = await connect('mcp/dist/piano-mcp.js', { PIANO_PORT: '8798' })
await call('new_song', { title: 'Twinkle (transcribed)', file })
await call('set_song_info', { file, timeSignature: '4/4', key: 'C' })
console.log((await call('set_bars', { file, bar: 1, right: 'C4q C4q G4q G4q | A4q A4q G4h | F4q F4q E4q E4q | D4q D4q C4h', left: 'C3w | F3h C3h | F3h C3h | G3h C3h' })).text.replace(/\s+/g, ' '))
await close()
