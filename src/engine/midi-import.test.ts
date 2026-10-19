import { Midi } from '@tonejs/midi'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NoNotesError, parseMidiFile, suggestMapping, toSong } from './midi-import'
import { barCount } from './song'

const fixture = (name: string) => readFileSync(join(__dirname, '__fixtures__', name))

describe('MIDI import', () => {
  it('reads a two-track file with tempo and time signature', () => {
    const p = parseMidiFile(fixture('two-track.mid'))
    expect(p.bpm).toBe(96)
    expect(p.timeSig).toEqual([3, 4])
    expect(p.tracks.map((t) => [t.name, t.noteCount])).toEqual([
      ['Piano right', 6],
      ['Piano left', 2],
    ])
    expect(p.tracks[0]!.notes[0]).toEqual({ midi: 64, startBeat: 0, beats: 1 })
  })

  it('suggests the higher track as the right hand', () => {
    const p = parseMidiFile(fixture('two-track.mid'))
    expect(suggestMapping(p)).toEqual({ 0: 'R', 1: 'L' })
  })

  it('builds a playable song', () => {
    const p = parseMidiFile(fixture('two-track.mid'))
    const song = toSong(p, { 0: 'R', 1: 'L' }, 'Little waltz')
    expect(song.source).toBe('imported')
    expect(song.hands.R.notes).toHaveLength(6)
    expect(song.hands.L.notes).toHaveLength(2)
    expect(barCount(song)).toBe(2)
  })

  it('quantizes to sixteenths', () => {
    const m = new Midi()
    m.header.setTempo(120)
    const tr = m.addTrack()
    tr.addNote({ midi: 60, ticks: 130, durationTicks: 470 }) // ≈ 0.27 beats → 0.25, ≈0.98 → 1
    const p = parseMidiFile(m.toArray())
    expect(p.tracks[0]!.notes[0]).toMatchObject({ startBeat: 0.25, beats: 1 })
  })

  it('rejects a file with no notes', () => {
    expect(() => parseMidiFile(fixture('empty.mid'))).toThrow(NoNotesError)
  })

  it('rejects garbage', () => {
    expect(() => parseMidiFile(new TextEncoder().encode('not a midi file'))).toThrow(NoNotesError)
  })
})
