import { makeSong } from './make'

export default makeSong({
  id: 'twinkle',
  title: { en: 'Twinkle Twinkle Little Star', vi: 'Ngôi sao nhỏ' },
  composer: 'Traditional',
  difficulty: 1,
  bpm: 90,
  timeSig: [4, 4],
  keySig: 'C',
  right: `
    C4q1 C4q1 G4q5 G4q5 | A4q5 A4q5 G4h5 | F4q4 F4q4 E4q3 E4q3 | D4q2 D4q2 C4h1 |
    G4q5 G4q5 F4q4 F4q4 | E4q3 E4q3 D4h2 | G4q5 G4q5 F4q4 F4q4 | E4q3 E4q3 D4h2 |
    C4q1 C4q1 G4q5 G4q5 | A4q5 A4q5 G4h5 | F4q4 F4q4 E4q3 E4q3 | D4q2 D4q2 C4h1 |`,
  left: `
    C3w | F3h C3h | F3h C3h | G3h C3h |
    C3h F3h | C3h G3h | C3h F3h | C3h G3h |
    C3w | F3h C3h | F3h C3h | G3h C3h |`,
})
