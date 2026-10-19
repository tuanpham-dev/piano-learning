import { makeLesson } from './make'

export default makeLesson({
  id: 'l16-time-signatures',
  order: 16,
  title: { en: 'Time signatures', vi: 'Số chỉ nhịp' },
  diagram: 'timeSigs',
  en: [
    'The two numbers at the start of a piece are the time signature.',
    'The top number is how many beats each bar has. The bottom number shows which note gets one beat.',
    '4/4 has four beats per bar. 3/4 has three, like a waltz: ONE two three.',
    'Eighth notes last half a beat. Count them “1 and 2 and”.',
    'Exercise: tap a rhythm with eighth notes and rests.',
  ],
  vi: [
    'Hai con số ở đầu bản nhạc là số chỉ nhịp.',
    'Số trên cho biết mỗi ô nhịp có mấy phách. Số dưới cho biết hình nốt nào dài một phách.',
    'Nhịp 4/4 có bốn phách mỗi ô. Nhịp 3/4 có ba, như điệu valse: MỘT hai ba.',
    'Nốt móc đơn dài nửa phách. Hãy đếm “1 và 2 và”.',
    'Bài tập: gõ một tiết tấu có nốt móc đơn và dấu lặng.',
  ],
  exercise: { kind: 'rhythm', level: 2, bpm: 80, minPercent: 80 },
})
