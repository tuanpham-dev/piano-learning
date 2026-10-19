import { makeSong } from './make'

export default makeSong({
  id: 'fur-elise',
  title: { en: 'Für Elise (opening)', vi: 'Für Elise (đoạn mở đầu)' },
  composer: 'Ludwig van Beethoven',
  difficulty: 3,
  bpm: 66,
  timeSig: [3, 8],
  keySig: 'Am',
  right: `
    rq E5s5 D#5s4 | E5s5 D#5s4 E5s5 B4s2 D5s4 C5s3 | A4e1 rs C4s1 E4s2 A4s4 | B4e5 rs E4s1 G#4s3 B4s4 |
    C5e5 rs E4s1 E5s5 D#5s4 | E5s5 D#5s4 E5s5 B4s2 D5s4 C5s3 | A4e1 rs C4s1 E4s2 A4s4 | B4e5 rs E4s1 C5s4 B4s3 |
    A4q.2 |`,
  left: `
    rq. | rq. | A2s E3s A3s rs re | E2s E3s G#3s rs re |
    A2s E3s A3s rs re | rq. | A2s E3s A3s rs re | E2s E3s G#3s rs re |
    A2q. |`,
})
