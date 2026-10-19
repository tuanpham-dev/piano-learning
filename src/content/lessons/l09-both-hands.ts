import { makeLesson } from './make'

export default makeLesson({
  id: 'l09-both-hands',
  order: 9,
  title: { en: 'Both hands together', vi: 'Chơi hai tay cùng lúc' },
  diagram: 'grand',
  en: [
    'The grand staff joins the treble and bass staves with a brace. Read both at once.',
    'Notes lined up above each other are played at the same time.',
    'Practise each hand alone first, then put them together slowly.',
    'Exercise: play Twinkle Twinkle Little Star with both hands. Take your time.',
  ],
  vi: [
    'Khuông nhạc kép nối khóa Sol và khóa Fa bằng một dấu ngoặc. Hãy đọc cả hai.',
    'Các nốt thẳng hàng theo chiều dọc được chơi cùng một lúc.',
    'Hãy tập từng tay trước, rồi ghép hai tay thật chậm.',
    'Bài tập: chơi bài Ngôi sao nhỏ bằng hai tay. Cứ từ từ.',
  ],
  exercise: { kind: 'song', songId: 'twinkle', hands: 'LR', play: 'wait' },
})
