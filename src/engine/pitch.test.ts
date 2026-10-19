import { detect, NoteTracker, type TrackerEvent } from './pitch'

const SR = 44100
const N = 2048

/** A piano-ish tone: fundamental plus decaying harmonics. */
function tone(hz: number, amp = 0.4, phase = 0): Float32Array {
  const f = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const t = (i + phase) / SR
    f[i] = amp * (Math.sin(2 * Math.PI * hz * t) + 0.5 * Math.sin(4 * Math.PI * hz * t) + 0.25 * Math.sin(6 * Math.PI * hz * t)) / 1.75
  }
  return f
}

function noise(amp = 0.2, seed = 1): Float32Array {
  const f = new Float32Array(N)
  let s = seed
  for (let i = 0; i < N; i++) {
    s = (s * 16807) % 2147483647
    f[i] = amp * ((s / 2147483647) * 2 - 1)
  }
  return f
}

const silence = () => new Float32Array(N)

/** Feeds frames every 40 ms, like the mic adapter. */
function run(tracker: NoteTracker, frames: Float32Array[]): TrackerEvent[] {
  const out: TrackerEvent[] = []
  frames.forEach((f, i) => out.push(...tracker.feed(detect(f, SR), i * 40)))
  return out
}

const repeat = <T,>(n: number, f: (i: number) => T) => Array.from({ length: n }, (_, i) => f(i))

describe('pitch detection', () => {
  it('detects A4 at 440 Hz', () => {
    const r = detect(tone(440), SR)
    expect(r.hz).toBeCloseTo(440, 0)
    expect(r.clarity).toBeGreaterThan(0.9)
  })
  it('detects middle C', () => {
    expect(detect(tone(261.63), SR).hz).toBeCloseTo(261.63, 0)
  })
  it('gives low clarity for noise', () => {
    expect(detect(noise(), SR).clarity).toBeLessThan(0.85)
  })
})

describe('NoteTracker', () => {
  it('emits a note only after it holds for 120 ms', () => {
    const tr = new NoteTracker()
    const ev = run(tr, [tone(440), tone(440), tone(440)])
    expect(ev).toEqual([]) // 0, 40, 80 ms: not yet
    const more = tr.feed(detect(tone(440), SR), 120)
    expect(more).toEqual([{ kind: 'on', midi: 69, t: 120 }])
  })

  it('ends the note after 150 ms of silence', () => {
    const tr = new NoteTracker()
    const ev = run(tr, [...repeat(5, () => tone(440)), ...repeat(5, silence)])
    expect(ev.map((e) => `${e.kind}${e.midi}`)).toEqual(['on69', 'off69'])
  })

  it('ignores noise', () => {
    const tr = new NoteTracker()
    expect(run(tr, repeat(10, (i) => noise(0.3, i + 1)))).toEqual([])
  })

  it('rejects pitches more than 30 cents off', () => {
    const tr = new NoteTracker()
    // 440 * 2^(45/1200) ≈ 451.6 Hz is 45 cents sharp of A4
    expect(run(tr, repeat(8, () => tone(451.6)))).toEqual([])
  })

  it('does not emit during a glide, then catches the settled note', () => {
    const tr = new NoteTracker()
    const glide = repeat(6, (i) => tone(392 + i * 9))
    const ev = run(tr, [...glide, ...repeat(5, () => tone(440))])
    expect(ev.filter((e) => e.kind === 'on').map((e) => e.midi)).toEqual([69])
  })

  it('separates two notes with a gap', () => {
    const tr = new NoteTracker()
    const ev = run(tr, [...repeat(5, () => tone(261.63)), ...repeat(5, silence), ...repeat(5, () => tone(392))])
    expect(ev.filter((e) => e.kind === 'on').map((e) => e.midi)).toEqual([60, 67])
  })

  it('re-strikes a repeated note on a new attack', () => {
    const tr = new NoteTracker()
    const ev = run(tr, [...repeat(5, () => tone(261.63, 0.4)), ...repeat(2, () => tone(261.63, 0.08)), ...repeat(5, () => tone(261.63, 0.5))])
    expect(ev.filter((e) => e.kind === 'on').map((e) => e.midi)).toEqual([60, 60])
  })
})
