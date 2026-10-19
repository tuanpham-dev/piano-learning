import { makeSong } from './make'

export default makeSong({
  id: 'au-clair',
  title: { en: 'Au Clair de la Lune', vi: 'Dưới ánh trăng' },
  composer: 'French folk song',
  difficulty: 1,
  bpm: 96,
  timeSig: [4, 4],
  keySig: 'C',
  right: `
    C4q1 C4q1 C4q1 D4q2 | E4h3 D4h2 | C4q1 E4q3 D4q2 D4q2 | C4w1 |
    C4q1 C4q1 C4q1 D4q2 | E4h3 D4h2 | C4q1 E4q3 D4q2 D4q2 | C4w1 |
    D4q5 D4q5 D4q5 D4q5 | A3h2 A3h2 | D4q5 C4q4 B3q3 A3q2 | G3w1 |
    C4q1 C4q1 C4q1 D4q2 | E4h3 D4h2 | C4q1 E4q3 D4q2 D4q2 | C4w1 |`,
  left: `
    C3w | C3h G2h | C3h G2h | C3w |
    C3w | C3h G2h | C3h G2h | C3w |
    G2w | D3w | G2h D3h | G2w |
    C3w | C3h G2h | C3h G2h | C3w |`,
})
