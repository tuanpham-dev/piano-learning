import { makeSong } from './make'

export default makeSong({
  id: 'minuet-in-g',
  title: { en: 'Minuet in G', vi: 'Minuet Sol trưởng' },
  composer: 'Christian Petzold (attr. J. S. Bach)',
  difficulty: 2,
  bpm: 100,
  timeSig: [3, 4],
  keySig: 'G',
  right: `
    D5q5 G4e1 A4e2 B4e3 C5e4 | D5q5 G4q1 G4q1 | E5q5 C5e1 D5e2 E5e3 F#5e4 | G5q5 G4q1 G4q1 |
    C5q4 D5e5 C5e4 B4e3 A4e2 | B4q3 C5e4 B4e3 A4e2 G4e1 | F#4q1 G4e2 A4e3 B4e4 G4e2 | A4h.3 |
    D5q5 G4e1 A4e2 B4e3 C5e4 | D5q5 G4q1 G4q1 | E5q5 C5e1 D5e2 E5e3 F#5e4 | G5q5 G4q1 G4q1 |
    C5q4 D5e5 C5e4 B4e3 A4e2 | B4q3 C5e4 B4e3 A4e2 G4e1 | A4q3 B4e4 A4e3 G4e2 F#4e1 | G4h.2 |`,
  left: `
    [G3 B3]h A3q | B3h. | C4h. | B3h. |
    A3h. | G3h. | D3h. | D3q C3q B2q |
    [G3 B3]h A3q | B3h. | C4h. | B3h. |
    A3h. | G3h. | B2q C3q D3q | G2h. |`,
})
