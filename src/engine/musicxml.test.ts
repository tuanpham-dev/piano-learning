import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { zipSync, strToU8 } from 'fflate'
import { musicXmlToSong, unzipMxl, MusicXmlError } from './musicxml'
import { songToDraft } from './song-text'

const xml = readFileSync(join(__dirname, '__fixtures__', 'test-score.musicxml'), 'utf8')

describe('MusicXML import (A11)', () => {
  it('reads details, hands, chords, dots, ties, fingering and tuplets', () => {
    const { song, warnings } = musicXmlToSong(xml)
    expect(song).toMatchObject({ title: { en: 'Test Waltz' }, composer: 'Test Composer', bpm: 96, timeSig: [3, 4], keySig: 'G' })
    const d = songToDraft(song)
    expect(d.right).toEqual(['G4q1 A4q. B4e~', 'B4q C5e B4e F#4q'])
    expect(d.left).toEqual(['[G2 D3]h.', 'D3h.'])
    expect(warnings.map((w) => [w.bar, w.kind])).toEqual([
      [2, 'grace'],
      [2, 'tuplet'],
    ])
  })
  it('reads zipped .mxl files', () => {
    const zip = zipSync({ 'META-INF/container.xml': strToU8('<container><rootfiles><rootfile full-path="score.xml"/></rootfiles></container>'), 'score.xml': strToU8(xml) })
    expect(musicXmlToSong(unzipMxl(zip)).song.title.en).toBe('Test Waltz')
  })
  it('explains what is wrong with other files', () => {
    expect(() => musicXmlToSong('<html></html>')).toThrow(MusicXmlError)
    expect(() => musicXmlToSong('<score-partwise><part id="P1"><measure/></part></score-partwise>')).toThrow(/no notes/)
    expect(() => unzipMxl(new Uint8Array([1, 2, 3]))).toThrow(/zip/)
  })
})
