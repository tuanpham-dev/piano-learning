// Downloads the Salamander Grand Piano samples (public domain, via the Tone.js mirror)
// into public/samples/: one sample every 3 semitones from A0 to C8.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = 'https://tonejs.github.io/audio/salamander/'
const OUT = join(import.meta.dirname, '..', 'public', 'samples')
const NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B']

export function sampleNames() {
  const out = []
  for (let midi = 21; midi <= 108; midi += 3) out.push(`${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`)
  return out
}

mkdirSync(OUT, { recursive: true })
let fetched = 0
let skipped = 0
const failed = []
for (const name of sampleNames()) {
  const file = join(OUT, `${name}.mp3`)
  if (existsSync(file)) {
    skipped++
    continue
  }
  try {
    const res = await fetch(`${BASE}${name}.mp3`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    writeFileSync(file, Buffer.from(await res.arrayBuffer()))
    fetched++
  } catch (e) {
    failed.push(`${name}: ${e.message}`)
  }
}
console.log(`samples: ${fetched} downloaded, ${skipped} already present, ${failed.length} failed`)
if (failed.length) {
  console.log(failed.join('\n'))
  process.exitCode = 1
}
