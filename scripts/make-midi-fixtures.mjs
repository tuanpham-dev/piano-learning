// Generates the MIDI test fixtures in src/engine/__fixtures__.
import midiPkg from '@tonejs/midi'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
const { Midi } = midiPkg
const OUT = join(import.meta.dirname, '..', 'src', 'engine', '__fixtures__')

const m = new Midi()
m.header.setTempo(96)
m.header.timeSignatures.push({ ticks: 0, timeSignature: [3, 4] })
m.header.update()
const ppq = m.header.ppq
const right = m.addTrack()
right.name = 'Piano right'
;[64, 67, 72, 71, 67, 64].forEach((midi, i) => right.addNote({ midi, ticks: i * ppq, durationTicks: ppq, velocity: 0.8 }))
const left = m.addTrack()
left.name = 'Piano left'
left.addNote({ midi: 48, ticks: 0, durationTicks: ppq * 3, velocity: 0.6 })
left.addNote({ midi: 43, ticks: ppq * 3, durationTicks: ppq * 3, velocity: 0.6 })
writeFileSync(join(OUT, 'two-track.mid'), Buffer.from(m.toArray()))

const e = new Midi()
e.header.setTempo(100)
e.addTrack().name = 'Empty'
writeFileSync(join(OUT, 'empty.mid'), Buffer.from(e.toArray()))
console.log('fixtures written')
