import { makeSong } from './make'

export default makeSong({
  id: 'amazing-grace',
  title: { en: 'Amazing Grace', vi: 'Ân điển diệu kỳ' },
  composer: 'Traditional (John Newton)',
  difficulty: 2,
  bpm: 80,
  timeSig: [3, 4],
  keySig: 'C',
  right: `
    rh G3q | C4h1 E4e3 C4e1 | E4h3 D4q2 | C4h1 A3q | G3h G3q |
    C4h1 E4e3 C4e1 | E4h3 D4q2 | G4h.5 | E4q.3 G4e5 E4e3 C4e1 |
    E4h3 D4q2 | C4h1 A3q | G3h G3q | C4h1 E4e3 C4e1 | E4h3 D4q2 | C4h.1 |`,
  left: `
    rh. | C3h. | C3h. | F2h. | C3h. |
    C3h. | G2h. | C3h. | C3h. |
    C3h. | F2h. | C3h. | C3h. | G2h. | C3h. |`,
})
