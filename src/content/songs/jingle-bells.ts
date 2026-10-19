import { makeSong } from './make'

export default makeSong({
  id: 'jingle-bells',
  title: { en: 'Jingle Bells', vi: 'Leng keng (Jingle Bells)' },
  composer: 'James Lord Pierpont',
  difficulty: 1,
  bpm: 112,
  timeSig: [4, 4],
  keySig: 'C',
  right: `
    E4q3 E4q3 E4h3 | E4q3 E4q3 E4h3 | E4q3 G4q5 C4q1 D4q2 | E4w3 |
    F4q4 F4q4 F4q4 F4q4 | F4q4 E4q3 E4q3 E4e3 E4e3 | E4q3 D4q2 D4q2 E4q3 | D4h2 G4h5 |
    E4q3 E4q3 E4h3 | E4q3 E4q3 E4h3 | E4q3 G4q5 C4q1 D4q2 | E4w3 |
    F4q4 F4q4 F4q4 F4q4 | F4q4 E4q3 E4q3 E4e3 E4e3 | G4q5 G4q5 F4q4 D4q2 | C4w1 |`,
  left: `
    C3w | C3w | C3w | C3w |
    F3w | C3w | G2w | G2w |
    C3w | C3w | C3w | C3w |
    F3w | C3w | G2w | C3w |`,
})
