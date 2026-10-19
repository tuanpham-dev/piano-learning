import { makeLesson } from './make'

export default makeLesson({
  id: 'l06-durations',
  order: 6,
  title: { en: 'Quarter, half and whole notes', vi: 'Nốt đen, nốt trắng và nốt tròn' },
  diagram: 'durations',
  en: [
    'Notes show how long to hold a sound. We count that in beats.',
    'A quarter note (♩) lasts 1 beat. A half note has an open head and lasts 2 beats.',
    'A whole note is an open oval with no stem. It lasts 4 beats.',
    'Count out loud: 1, 2, 3, 4. Keep the beats even, like a clock.',
    'Exercise: tap the rhythm after the count-in.',
  ],
  vi: [
    'Hình nốt cho biết giữ âm bao lâu. Ta tính độ dài đó bằng phách.',
    'Nốt đen (♩) dài 1 phách. Nốt trắng có đầu rỗng và dài 2 phách.',
    'Nốt tròn là hình bầu dục rỗng, không có đuôi. Nó dài 4 phách.',
    'Đếm to: 1, 2, 3, 4. Giữ các phách đều như kim đồng hồ.',
    'Bài tập: gõ theo tiết tấu sau phần đếm vào.',
  ],
  demo: 'C4q C4q C4h | C4w |',
  demoBpm: 80,
  exercise: { kind: 'rhythm', level: 1, bpm: 80, minPercent: 80 },
})
