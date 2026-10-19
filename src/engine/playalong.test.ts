import { PlayAlong } from './playalong'
import { parseVoice } from './song-dsl'
import type { Song } from './song'

const song = (right: string, left = 'C3w |', timeSig: [number, number] = [4, 4]): Song => ({
  id: 't',
  title: { en: 't', vi: 't' },
  composer: '',
  difficulty: 1,
  bpm: 60,
  timeSig,
  keySig: 'C',
  source: 'bundled',
  hands: { R: parseVoice(right, timeSig), L: parseVoice(left, timeSig) },
})

const on = (midi: number, time: number) => ({ kind: 'on' as const, midi, time })

describe('PlayAlong — wait mode', () => {
  it('advances only on the right key', () => {
    const p = new PlayAlong({ song: song('C4q D4q E4q F4q |'), hands: 'R', mode: 'wait', tempoPct: 100 })
    p.start(0)
    p.tick(0)
    expect(p.status).toBe('waiting')
    expect(p.dueMidis()).toEqual([60])
    expect(p.input(on(64, 0.1)).wrong).toBe(64)
    expect(p.dueMidis()).toEqual([60])
    p.input(on(60, 0.2))
    expect(p.status).toBe('moving')
    p.tick(1.3)
    expect(p.status).toBe('waiting')
    expect(p.dueMidis()).toEqual([62])
  })

  it('needs every note of a chord', () => {
    const p = new PlayAlong({ song: song('[C4 E4 G4]w |'), hands: 'R', mode: 'wait', tempoPct: 100 })
    p.start(0)
    p.tick(0)
    p.input(on(60, 0.1))
    p.input(on(64, 0.2))
    expect(p.status).toBe('waiting')
    p.input(on(67, 0.3))
    expect(p.status).toBe('moving')
  })

  it('plays the other hand with each step and finishes', () => {
    const p = new PlayAlong({ song: song('C4h D4h |', 'C3h G2h |'), hands: 'R', mode: 'wait', tempoPct: 100 })
    p.start(0)
    p.tick(0)
    const ev = p.input(on(60, 0.1))
    expect(ev.accompaniment?.map((n) => n.midi)).toEqual([48])
    p.tick(5)
    p.input(on(62, 5.1))
    const end = p.tick(10)
    expect(end.finished?.completed).toBe(true)
    expect(p.status).toBe('done')
  })

  it('counts a note pressed while gliding toward its step', () => {
    const p = new PlayAlong({ song: song('C4q C4q C4h |'), hands: 'R', mode: 'wait', tempoPct: 100 })
    p.start(0)
    p.tick(0)
    p.input(on(60, 0.0))
    p.input(on(60, 0.9)) // pressed just before the glide arrives
    p.tick(1.0)
    expect(p.states.slice(0, 2)).toEqual(['hit', 'hit'])
  })
})

describe('PlayAlong — perform mode', () => {
  const s = song('C4q D4q E4q F4q |')
  // bpm 60 → 1 s per beat; one-bar count-in of 4 beats, first note at t=4.
  it('scores a perfect performance 100% with 3 stars worth', () => {
    const p = new PlayAlong({ song: s, hands: 'R', mode: 'perform', tempoPct: 100 })
    p.start(0)
    for (let t = 0; t <= 9; t += 0.05) {
      const time = Math.round(t * 100) / 100
      ;[60, 62, 64, 65].forEach((m, i) => time === 4 + i && p.input(on(m, time)))
      const ev = p.tick(time)
      if (ev.finished) {
        expect(ev.finished.score?.percent).toBe(100)
        return
      }
    }
    throw new Error('did not finish')
  })

  it('scores nothing played as 0% and marks misses', () => {
    const p = new PlayAlong({ song: s, hands: 'R', mode: 'perform', tempoPct: 100 })
    p.start(0)
    let score
    for (let t = 0; t <= 9; t += 0.1) score = p.tick(t).finished?.score ?? score
    expect(score?.percent).toBe(0)
    expect(p.states).toEqual(['missed', 'missed', 'missed', 'missed'])
    expect(p.missedBars()).toEqual([0])
  })

  it('judges a 120 ms late script as late', () => {
    const p = new PlayAlong({ song: s, hands: 'R', mode: 'perform', tempoPct: 100 })
    p.start(0)
    ;[60, 62, 64, 65].forEach((m, i) => {
      p.tick(4 + i)
      p.input(on(m, 4 + i + 0.12))
    })
    expect(p.states).toEqual(['late', 'late', 'late', 'late'])
  })

  it('halves the speed at 50% tempo', () => {
    const p = new PlayAlong({ song: s, hands: 'R', mode: 'perform', tempoPct: 50 })
    p.start(0)
    expect(p.timeOf(0)).toBe(8)
  })

  it('restricts to a bar range', () => {
    const p = new PlayAlong({ song: song('C4w | D4w | E4w |', 'C3w | C3w | C3w |'), hands: 'R', mode: 'perform', tempoPct: 100, bars: [1, 1] })
    expect(p.notes.map((n) => n.midi)).toEqual([62])
  })
})
