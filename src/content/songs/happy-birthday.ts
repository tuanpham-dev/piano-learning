import { makeSong } from './make'

export default makeSong({
  id: 'happy-birthday',
  title: { en: 'Happy Birthday', vi: 'Chúc mừng sinh nhật' },
  composer: 'Mildred & Patty Hill',
  difficulty: 1,
  bpm: 100,
  timeSig: [3, 4],
  keySig: 'C',
  right: `
    rh G3e.1 G3s1 | A3q2 G3q1 C4q4 | B3h3 G3e.1 G3s1 | A3q2 G3q1 D4q5 | C4h4 G3e.1 G3s1 |
    G4q5 E4q3 C4q1 | B3q A3q F4e. F4s | E4q C4q D4q | C4h. |`,
  left: `
    rh. | C3h. | G2h. | G2h. | C3h. |
    C3h. | F2h. | C3q G2h | C3h. |`,
})
