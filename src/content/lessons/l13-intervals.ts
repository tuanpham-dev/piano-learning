import { makeLesson } from './make'

export default makeLesson({
  id: 'l13-intervals',
  order: 13,
  title: { en: 'Intervals', vi: 'Quãng' },
  diagram: 'intervals',
  en: [
    'An interval is the distance between two notes.',
    'Count the letter names from the first note to the second, counting both. C to E is a 3rd.',
    'C to G is a 5th. C up to the next C is an octave.',
    'Listen for the size of the jump: small steps, medium skips, big leaps.',
    'Exercise: hear an interval and name it, or play both notes.',
  ],
  vi: [
    'Quãng là khoảng cách giữa hai nốt.',
    'Đếm tên nốt từ nốt thứ nhất đến nốt thứ hai, tính cả hai đầu. C đến E là quãng 3.',
    'C đến G là quãng 5. C lên đến C tiếp theo là quãng 8.',
    'Hãy nghe độ lớn của bước nhảy: bước nhỏ, bước vừa, bước xa.',
    'Bài tập: nghe một quãng rồi gọi tên, hoặc chơi cả hai nốt.',
  ],
  demo: 'C4q D4q rh | C4q E4q rh | C4q G4q rh | C4q C5q rh |',
  demoBpm: 90,
  exercise: { kind: 'ear', type: 'interval', count: 10, minCorrect: 7 },
})
