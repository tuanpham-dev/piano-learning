import { makeSong } from './make'

export default makeSong({
  id: 'greensleeves',
  title: { en: 'Greensleeves', vi: 'Tay áo xanh (Greensleeves)' },
  composer: 'English folk song',
  difficulty: 2,
  bpm: 90,
  timeSig: [3, 4],
  keySig: 'Am',
  right: `
    rh A4q1 | C5h2 D5q3 | E5q.4 F5e5 E5q4 | D5h3 B4q1 |
    G4q. A4e B4q | C5h A4q | A4q. G#4e A4q | B4h G#4q |
    E4h A4q | C5h D5q | E5q. F5e E5q | D5h B4q |
    G4q. A4e B4q | C5q. B4e A4q | G#4q. F#4e G#4q | A4h. |`,
  left: `
    rh. | A2h. | A2h. | G2h. |
    G2h. | A2h. | E2h. | E2h. |
    A2h. | A2h. | A2h. | G2h. |
    G2h. | A2h. | E2h. | A2h. |`,
})
