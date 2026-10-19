import { makeSong } from './make'

export default makeSong({
  id: 'mary-lamb',
  title: { en: 'Mary Had a Little Lamb', vi: 'Mary có chú cừu non' },
  composer: 'Traditional',
  difficulty: 1,
  bpm: 100,
  timeSig: [4, 4],
  keySig: 'C',
  right: `
    E4q3 D4q2 C4q1 D4q2 | E4q3 E4q3 E4h3 | D4q2 D4q2 D4h2 | E4q3 G4q5 G4h5 |
    E4q3 D4q2 C4q1 D4q2 | E4q3 E4q3 E4q3 E4q3 | D4q2 D4q2 E4q3 D4q2 | C4w1 |`,
  left: `
    C3w | C3w | G3w | C3w |
    C3w | C3w | G3w | C3w |`,
})
