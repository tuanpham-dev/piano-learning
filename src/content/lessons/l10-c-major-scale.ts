import { makeLesson } from './make'

export default makeLesson({
  id: 'l10-c-major-scale',
  order: 10,
  title: { en: 'The C major scale', vi: 'Gam Đô trưởng' },
  diagram: 'cScale',
  en: [
    'A scale is a ladder of notes. C major uses only the white keys, from C up to the next C.',
    'To play all eight notes with one hand, your thumb tucks under.',
    'Right hand: play C, D, E with fingers 1, 2, 3. Tuck your thumb under to F, then play G, A, B, C with 2, 3, 4, 5.',
    'Press “Show me” to hear the scale go up and down.',
    'Exercise: read notes from the C major scale on the staff.',
  ],
  vi: [
    'Gam là một chiếc thang các nốt. Đô trưởng chỉ dùng phím trắng, từ C lên đến C tiếp theo.',
    'Để chơi đủ tám nốt bằng một tay, ngón cái sẽ luồn xuống dưới.',
    'Tay phải: chơi C, D, E bằng ngón 1, 2, 3. Luồn ngón cái sang F, rồi chơi G, A, B, C bằng ngón 2, 3, 4, 5.',
    'Bấm “Xem mẫu” để nghe gam đi lên rồi đi xuống.',
    'Bài tập: đọc các nốt của gam Đô trưởng trên khuông nhạc.',
  ],
  demo: 'C4e1 D4e2 E4e3 F4e1 G4e2 A4e3 B4e4 C5e5 | C5e5 B4e4 A4e3 G4e2 F4e1 E4e3 D4e2 C4e1 |',
  demoBpm: 70,
  exercise: { kind: 'drill', clef: 'treble', low: 60, high: 72, accidentals: false, count: 10, minCorrect: 8 },
})
