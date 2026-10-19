import { makeLesson } from './make'

export default makeLesson({
  id: 'l02-note-names',
  order: 2,
  title: { en: 'Note names', vi: 'Tên các nốt' },
  diagram: 'keyboard',
  en: [
    'Piano keys use seven letters: C, D, E, F, G, A and B. Then the letters repeat.',
    'Find a group of two black keys. The white key just to its left is C.',
    'Going up from C: C, D, E, F, G, A, B, and then the next C.',
    'In Vietnamese the same notes are Đô, Rê, Mi, Fa, Sol, La and Si.',
    'Exercise: play the note shown. Every note is between C and G.',
  ],
  vi: [
    'Các phím đàn dùng bảy chữ cái: C, D, E, F, G, A và B. Sau đó lặp lại.',
    'Tìm một nhóm hai phím đen. Phím trắng ngay bên trái nhóm đó là C.',
    'Đi lên từ C: C, D, E, F, G, A, B, rồi đến C tiếp theo.',
    'Theo cách gọi Việt Nam, các nốt này là Đô, Rê, Mi, Fa, Sol, La và Si.',
    'Bài tập: chơi nốt được hiển thị. Mọi nốt đều nằm từ C đến G.',
  ],
  demo: 'C4q D4q E4q F4q | G4q A4q B4q C5q |',
  demoBpm: 90,
  exercise: { kind: 'drill', clef: 'treble', low: 60, high: 67, accidentals: false, count: 10, minCorrect: 8 },
})
