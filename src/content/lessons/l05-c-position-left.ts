import { makeLesson } from './make'

export default makeLesson({
  id: 'l05-c-position-left',
  order: 5,
  title: { en: 'C position, left hand', vi: 'Thế tay Đô, tay trái' },
  diagram: 'cPositionLeft',
  en: [
    'Your left hand plays the lower notes. Put finger 5 on the C below middle C.',
    'Then finger 4 on D, 3 on E, 2 on F, and your thumb (1) on G.',
    'The numbers run the opposite way from your right hand, because the hand is mirrored.',
    'Exercise: play the left-hand part of Twinkle Twinkle Little Star.',
  ],
  vi: [
    'Tay trái chơi các nốt thấp. Đặt ngón 5 lên nốt C ngay dưới Đô giữa.',
    'Sau đó ngón 4 trên D, 3 trên E, 2 trên F và ngón cái (1) trên G.',
    'Số ngón chạy ngược chiều so với tay phải, vì hai bàn tay đối xứng nhau.',
    'Bài tập: chơi phần tay trái của bài Ngôi sao nhỏ.',
  ],
  demo: 'C3q5 D3q4 E3q3 F3q2 | G3q1 F3q2 E3q3 D3q4 | C3w5 |',
  demoBpm: 90,
  exercise: { kind: 'song', songId: 'twinkle', hands: 'L', play: 'wait' },
})
