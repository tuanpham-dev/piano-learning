import { makeLesson } from './make'

export default makeLesson({
  id: 'l11-g-position',
  order: 11,
  title: { en: 'G position', vi: 'Thế tay Sol' },
  diagram: 'gPosition',
  en: [
    'Hands can move to new positions. In G position your right thumb sits on the G above middle C.',
    'Fingers 1 to 5 now cover G, A, B, C and D.',
    'Many songs start in one position and move to another. Look ahead before you move.',
    'Exercise: read the five notes of G position: G, A, B, C and D.',
  ],
  vi: [
    'Bàn tay có thể dời sang thế mới. Ở thế tay Sol, ngón cái tay phải đặt trên nốt G phía trên Đô giữa.',
    'Các ngón 1 đến 5 lúc này phủ G, A, B, C và D.',
    'Nhiều bài bắt đầu ở một thế tay rồi chuyển sang thế khác. Hãy nhìn trước khi dời tay.',
    'Bài tập: đọc năm nốt của thế tay Sol: G, A, B, C và D.',
  ],
  demo: 'G4q1 A4q2 B4q3 C5q4 | D5q5 C5q4 B4q3 A4q2 | G4w1 |',
  demoBpm: 90,
  exercise: { kind: 'drill', clef: 'treble', low: 67, high: 74, accidentals: false, count: 10, minCorrect: 8, pool: [67, 69, 71, 72, 74] },
})
