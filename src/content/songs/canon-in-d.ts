import { makeSong } from './make'

export default makeSong({
  id: 'canon-in-d',
  title: { en: 'Canon in D (simplified)', vi: 'Canon Rê trưởng (giản lược)' },
  composer: 'Johann Pachelbel',
  difficulty: 3,
  bpm: 70,
  timeSig: [4, 4],
  keySig: 'D',
  right: `
    F#5h5 E5h4 | D5h3 C#5h2 | B4h2 A4h1 | B4h2 C#5h3 |
    D5q5 C#5q4 B4q3 A4q2 | G4q4 F#4q3 G4q4 E4q2 | D4q1 F#4q2 A4q4 G4q3 | F#4q3 D4q1 F#4q3 E4q2 |
    D4q1 B3q1 D4q2 A4q5 | G4q4 B4q5 A4q4 G4q3 | F#4q2 D4q1 E4q2 C#5q5 | D5w5 |`,
  left: `
    D3h A2h | B2h F#2h | G2h D2h | G2h A2h |
    D3h A2h | B2h F#2h | G2h D2h | G2h A2h |
    D3h A2h | B2h F#2h | G2h A2h | D3w |`,
})
