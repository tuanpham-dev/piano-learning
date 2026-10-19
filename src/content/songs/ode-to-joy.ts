import { makeSong } from './make'

export default makeSong({
  id: 'ode-to-joy',
  title: { en: 'Ode to Joy', vi: 'Khúc hoan ca' },
  composer: 'Ludwig van Beethoven',
  difficulty: 2,
  bpm: 100,
  timeSig: [4, 4],
  keySig: 'C',
  right: `
    E4q3 E4q3 F4q4 G4q5 | G4q5 F4q4 E4q3 D4q2 | C4q1 C4q1 D4q2 E4q3 | E4q.3 D4e2 D4h2 |
    E4q3 E4q3 F4q4 G4q5 | G4q5 F4q4 E4q3 D4q2 | C4q1 C4q1 D4q2 E4q3 | D4q.2 C4e1 C4h1 |
    D4q2 D4q2 E4q3 C4q1 | D4q2 E4e3 F4e4 E4q3 C4q1 | D4q2 E4e3 F4e4 E4q3 D4q2 | C4q1 D4q2 G3h1 |
    E4q3 E4q3 F4q4 G4q5 | G4q5 F4q4 E4q3 D4q2 | C4q1 C4q1 D4q2 E4q3 | D4q.2 C4e1 C4h1 |`,
  left: `
    C3w | G2h C3h | C3h G2h | C3h G2h |
    C3w | G2h C3h | C3h G2h | G2h C3h |
    G2h C3h | G2h C3h | G2w | C3h G2h |
    C3w | G2h C3h | C3h G2h | G2h C3h |`,
})
