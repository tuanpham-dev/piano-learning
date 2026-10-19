// Writes a mono 16-bit WAV of piano-ish tones: node qa/make-tones.mjs out.wav "60,60,67" [toneSec] [gapSec] [leadSilence] [tailSilence]
import { writeFileSync } from 'node:fs'
const [out, list, toneS = '0.5', gapS = '0.3', lead = '1', tail = '12'] = process.argv.slice(2)
const sr = 48000
const midis = list.split(',').map(Number)
const segs = []
const silence = (s) => new Float32Array(Math.round(s * sr))
segs.push(silence(+lead))
for (const m of midis) {
  const f = 440 * 2 ** ((m - 69) / 12)
  const n = Math.round(+toneS * sr)
  const a = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / sr
    const env = Math.min(1, t / 0.01) * Math.exp(-t * 1.5)
    a[i] = 0.5 * env * (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(4 * Math.PI * f * t) + 0.2 * Math.sin(6 * Math.PI * f * t)) / 1.6
  }
  segs.push(a, silence(+gapS))
}
segs.push(silence(+tail))
const total = segs.reduce((a, s) => a + s.length, 0)
const b = Buffer.alloc(44 + total * 2)
b.write('RIFF', 0); b.writeUInt32LE(36 + total * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12)
b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34)
b.write('data', 36); b.writeUInt32LE(total * 2, 40)
let o = 44
for (const s of segs) for (const v of s) { b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), o); o += 2 }
writeFileSync(out, b)
console.log(`${out}: ${(total / sr).toFixed(1)} s`)
