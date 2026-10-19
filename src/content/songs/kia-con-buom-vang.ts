import { makeSong } from './make'

export default makeSong({
  id: 'kia-con-buom-vang',
  title: { en: 'Look, a Yellow Butterfly', vi: 'Kìa con bướm vàng' },
  composer: 'Vietnamese children’s song (Frère Jacques melody)',
  difficulty: 1,
  bpm: 100,
  timeSig: [4, 4],
  keySig: 'C',
  right: `
    C4q1 D4q2 E4q3 C4q1 | C4q1 D4q2 E4q3 C4q1 | E4q3 F4q4 G4h5 | E4q3 F4q4 G4h5 |
    G4e5 A4e5 G4e5 F4e4 E4q3 C4q1 | G4e5 A4e5 G4e5 F4e4 E4q3 C4q1 | C4q1 G3q1 C4h1 | C4q1 G3q1 C4h1 |`,
  left: `
    C3w | C3w | C3w | C3w |
    C3w | C3w | C3h G2h | C3h G2h |`,
})
