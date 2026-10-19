import { runTool, toolsFingerprint, TOOLS } from './song-tools'
import { emptyDraft, draftToSong, notesKey } from './song-text'

const start = () => emptyDraft('t', 'Test')

describe('song tools', () => {
  it('sets info', () => {
    const { draft } = runTool(start(), 'set_song_info', { title: 'Lullaby', tempo: 72, timeSignature: '3/4', key: 'G', difficulty: 2 })
    expect(draft).toMatchObject({ title: { en: 'Lullaby', vi: 'Lullaby' }, bpm: 72, timeSig: [3, 4], keySig: 'G', difficulty: 2 })
  })

  it('writes and reads bars for both hands', () => {
    let d = start()
    d = runTool(d, 'set_bars', { bar: 1, right: 'C4q1 D4q2 E4q3 F4q4 | G4w5 |', left: 'C3w | G2w |' }).draft
    const got = runTool(d, 'get_song', {}).result as { bars: { bar: number; right: string; left: string }[]; warnings: string[] }
    expect(got.bars).toEqual([
      { bar: 1, right: 'C4q1 D4q2 E4q3 F4q4', left: 'C3w' },
      { bar: 2, right: 'G4w5', left: 'G2w' },
    ])
    expect(got.warnings).toEqual([])
  })

  it('replaces, inserts and deletes bars', () => {
    let d = runTool(start(), 'set_bars', { bar: 1, right: 'C4w | D4w | E4w', left: 'C3w | C3w | C3w' }).draft
    d = runTool(d, 'set_bars', { bar: 2, right: 'F4w' }).draft
    expect(d.right).toEqual(['C4w', 'F4w', 'E4w'])
    d = runTool(d, 'set_bars', { bar: 1, right: 'B3w', mode: 'insert' }).draft
    expect(d.right).toEqual(['B3w', 'C4w', 'F4w', 'E4w'])
    expect(d.left[0]).toBe('rw')
    d = runTool(d, 'delete_bars', { from: 2, to: 3 }).draft
    expect(d.right).toEqual(['B3w', 'E4w'])
  })

  it('pads with rest bars when writing past the end', () => {
    const d = runTool(start(), 'set_bars', { bar: 3, right: 'G4w' }).draft
    expect(d.right).toEqual(['rw', 'rw', 'G4w'])
    expect(d.left).toEqual(['rw', 'rw', 'rw'])
  })

  it('reports bar problems by bar', () => {
    const r = runTool(start(), 'set_bars', { bar: 1, right: 'C4q C4q C4q | D4w' }).result as { warnings: string[] }
    expect(r.warnings).toEqual(['Bar 1 (right hand): has 3 beats, expected 4'])
  })

  it('transposes one hand', () => {
    const d = runTool(runTool(start(), 'set_bars', { bar: 1, right: 'C4w', left: 'C3w' }).draft, 'transpose', { semitones: 2, hands: 'R' }).draft
    const { song } = draftToSong(d)
    expect(notesKey(song.hands.R.notes)).toBe('62@0+4')
    expect(notesKey(song.hands.L.notes)).toBe('48@0+4')
  })

  it('gives a readable error for bad arguments and unknown tools', () => {
    expect(() => runTool(start(), 'set_bars', { bar: 0, right: 'C4w' })).toThrow(/bar/)
    expect(() => runTool(start(), 'set_bars', { bar: 1 })).toThrow(/Give right, left or both/)
    expect(() => runTool(start(), 'nope', {})).toThrow(/Unknown tool "nope"/)
  })

  it('has a reference and a stable fingerprint', () => {
    expect(runTool(start(), 'get_reference', {}).result).toMatch(/Transcribing sheet music/)
    expect(toolsFingerprint()).toBe(toolsFingerprint())
    expect(toolsFingerprint(['x'])).not.toBe(toolsFingerprint())
    expect(TOOLS.map((t) => t.name)).toContain('check_song')
  })
})
