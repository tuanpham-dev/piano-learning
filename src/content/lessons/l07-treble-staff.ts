import { makeLesson } from './make'

export default makeLesson({
  id: 'l07-treble-staff',
  order: 7,
  title: { en: 'Reading the treble staff', vi: 'Đọc khóa Sol' },
  diagram: 'treble',
  en: [
    'Music is written on five lines called a staff.',
    'The treble clef (𝄞) is for higher notes, usually played by the right hand.',
    'The notes on the lines, from bottom to top, are E, G, B, D and F.',
    'The notes in the spaces spell FACE: F, A, C and E.',
    'Exercise: play each note shown on the treble staff.',
  ],
  vi: [
    'Nhạc được viết trên năm dòng kẻ, gọi là khuông nhạc.',
    'Khóa Sol (𝄞) dùng cho các nốt cao, thường do tay phải chơi.',
    'Các nốt trên dòng kẻ, từ dưới lên, là E, G, B, D và F (Mi, Sol, Si, Rê, Fa).',
    'Các nốt trong khe, từ dưới lên, là F, A, C và E (Fa, La, Đô, Mi).',
    'Bài tập: chơi từng nốt hiện trên khóa Sol.',
  ],
  exercise: { kind: 'drill', clef: 'treble', low: 60, high: 72, accidentals: false, count: 10, minCorrect: 8 },
})
