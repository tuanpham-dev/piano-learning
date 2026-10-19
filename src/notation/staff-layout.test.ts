import { decompose, layoutBar, vexDuration, vexKey } from './staff-layout'
import { parseVoice } from '../engine/song-dsl'
import { bundledSongs } from '../content/songs'
import { barCount } from '../engine/song'

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

describe('staff layout', () => {
  it('decomposes odd lengths into standard durations', () => {
    expect(decompose(1.25)).toEqual([1, 0.25])
    expect(decompose(3.5)).toEqual([3, 0.5])
    expect(decompose(1.5)).toEqual([1.5])
  })
  it('maps durations to VexFlow', () => {
    expect(vexDuration(1.5)).toEqual({ duration: 'q', dots: 1 })
    expect(vexDuration(0.25)).toEqual({ duration: '16', dots: 0 })
  })
  it('spells keys by key signature', () => {
    expect(vexKey(61)).toBe('c#/4')
    expect(vexKey(70, 'F')).toBe('bb/4')
  })
  it('fills a bar with notes and rests', () => {
    const v = parseVoice('rh G3e. G3s |', [3, 4])
    const ev = layoutBar(v, 0, [3, 4])
    expect(ev.map((e) => [e.beats, e.midis.length])).toEqual([[2, 0], [0.75, 1], [0.25, 1]])
  })
  it('trims overlapping notes and ties notes that cross a bar', () => {
    const v = { notes: [{ midi: 60, startBeat: 0, beats: 3 }, { midi: 64, startBeat: 1, beats: 1 }, { midi: 67, startBeat: 3.5, beats: 1.25 }], rests: [] }
    const bar0 = layoutBar(v, 0, [4, 4])
    expect(sum(bar0.map((e) => e.beats))).toBe(4)
    expect(bar0.map((e) => e.midis)).toEqual([[60], [64], [], [67]])
    const bar1 = layoutBar(v, 1, [4, 4])
    expect(bar1[0]).toMatchObject({ midis: [67], beats: 0.75 })
    expect(sum(bar1.map((e) => e.beats))).toBe(4)
  })
  it('lays out every bar of every bundled song to the right length', () => {
    for (const s of bundledSongs) for (let b = 0; b < barCount(s); b++) for (const h of ['R', 'L'] as const) {
      const ev = layoutBar(s.hands[h], b, s.timeSig)
      expect(sum(ev.map((e) => e.beats)), `${s.id} bar ${b} ${h}`).toBeCloseTo((s.timeSig[0] * 4) / s.timeSig[1])
    }
  })
})
