import { LETTER_HEX, contrastRatio, inkForLetter } from './note-colors'
import type { Letter } from '../engine/notes'

describe('note colors', () => {
  const letters = Object.keys(LETTER_HEX) as Letter[]
  it('picks the better of navy and white for every note', () => {
    for (const l of letters) {
      const ink = inkForLetter(l)
      const other = ink === '#ffffff' ? '#14213d' : '#ffffff'
      expect(contrastRatio(ink, LETTER_HEX[l])).toBeGreaterThanOrEqual(contrastRatio(other, LETTER_HEX[l]))
    }
  })
  it('reaches at least 3:1 everywhere (bold key-dot letters count as large text)', () => {
    const report = letters.map((l) => `${l} ${inkForLetter(l)} ${contrastRatio(inkForLetter(l), LETTER_HEX[l]).toFixed(2)}`)
    for (const l of letters) expect(contrastRatio(inkForLetter(l), LETTER_HEX[l]), report.join(', ')).toBeGreaterThanOrEqual(3)
    console.log(report.join(' | '))
  })
})
