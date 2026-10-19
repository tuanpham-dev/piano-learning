import { makeLesson } from './make'

export default makeLesson({
  id: 'l17-song-both-hands',
  order: 17,
  title: { en: 'A song with both hands', vi: 'Một bài hai tay' },
  diagram: 'grand',
  en: [
    'Time to put it all together with Ode to Joy by Beethoven.',
    'Learn each hand in Wait mode first. Then try both hands together.',
    'Slow the tempo down if you need to. Accuracy matters more than speed.',
    'Exercise: perform Ode to Joy with both hands and score 60% or better.',
  ],
  vi: [
    'Đã đến lúc ghép mọi thứ lại với bài Khúc hoan ca của Beethoven.',
    'Hãy tập từng tay ở chế độ Chờ trước. Sau đó thử chơi hai tay.',
    'Hạ nhịp độ nếu cần. Chơi đúng quan trọng hơn chơi nhanh.',
    'Bài tập: biểu diễn Khúc hoan ca bằng hai tay và đạt từ 60% trở lên.',
  ],
  exercise: { kind: 'song', songId: 'ode-to-joy', hands: 'LR', play: 'perform', minPercent: 60 },
})
