import { makeLesson } from './make'

export default makeLesson({
  id: 'l04-c-position-right',
  order: 4,
  title: { en: 'C position, right hand', vi: 'Thế tay Đô, tay phải' },
  diagram: 'cPosition',
  en: [
    'Put your right thumb (finger 1) on middle C.',
    'Rest the other fingers on the next keys: 2 on D, 3 on E, 4 on F and 5 on G.',
    'Each finger plays only its own key. This is called a hand position.',
    'Exercise: play Mary Had a Little Lamb with your right hand. The music waits for you.',
  ],
  vi: [
    'Đặt ngón cái tay phải (ngón 1) lên Đô giữa.',
    'Đặt các ngón còn lại lên các phím kế tiếp: ngón 2 trên D, 3 trên E, 4 trên F và 5 trên G.',
    'Mỗi ngón chỉ chơi phím của riêng nó. Đó gọi là một thế tay.',
    'Bài tập: chơi Mary có chú cừu non bằng tay phải. Nhạc sẽ chờ bạn.',
  ],
  demo: 'C4q1 D4q2 E4q3 F4q4 | G4q5 F4q4 E4q3 D4q2 | C4w1 |',
  demoBpm: 90,
  exercise: { kind: 'song', songId: 'mary-lamb', hands: 'R', play: 'wait' },
})
