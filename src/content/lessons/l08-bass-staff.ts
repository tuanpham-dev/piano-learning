import { makeLesson } from './make'

export default makeLesson({
  id: 'l08-bass-staff',
  order: 8,
  title: { en: 'Reading the bass staff', vi: 'Đọc khóa Fa' },
  diagram: 'bass',
  en: [
    'The bass clef (𝄢) is for lower notes, usually played by the left hand.',
    'Its two dots sit around the F line. That line is the F below middle C.',
    'The notes on the lines, from bottom to top, are G, B, D, F and A.',
    'The notes in the spaces, from bottom to top, are A, C, E and G.',
    'Exercise: play each note shown on the bass staff.',
  ],
  vi: [
    'Khóa Fa (𝄢) dùng cho các nốt thấp, thường do tay trái chơi.',
    'Hai dấu chấm của khóa kẹp quanh dòng Fa, tức nốt F dưới Đô giữa.',
    'Các nốt trên dòng kẻ, từ dưới lên, là G, B, D, F và A (Sol, Si, Rê, Fa, La).',
    'Các nốt trong khe, từ dưới lên, là A, C, E và G (La, Đô, Mi, Sol).',
    'Bài tập: chơi từng nốt hiện trên khóa Fa.',
  ],
  exercise: { kind: 'drill', clef: 'bass', low: 48, high: 60, accidentals: false, count: 10, minCorrect: 8 },
})
