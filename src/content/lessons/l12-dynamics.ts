import { makeLesson } from './make'

export default makeLesson({
  id: 'l12-dynamics',
  order: 12,
  title: { en: 'Loud and soft', vi: 'Mạnh và nhẹ' },
  diagram: 'dynamics',
  en: [
    'Dynamics tell you how loudly to play. They are written under the staff.',
    'p (piano) means soft. f (forte) means loud. mf (mezzo-forte) means medium loud.',
    'For a soft sound, press the key gently. For a loud sound, use more weight from your arm.',
    'A MIDI or acoustic piano shows the difference. On a screen every note sounds the same.',
    'Exercise: perform Twinkle Twinkle in time with your right hand and score 60% or better.',
  ],
  vi: [
    'Cường độ cho biết chơi to hay nhỏ. Ký hiệu được viết bên dưới khuông nhạc.',
    'p (piano) nghĩa là nhẹ. f (forte) nghĩa là mạnh. mf (mezzo-forte) là vừa mạnh.',
    'Muốn tiếng nhẹ, hãy nhấn phím nhẹ nhàng. Muốn tiếng mạnh, hãy dồn thêm sức nặng từ cánh tay.',
    'Đàn MIDI hoặc đàn cơ sẽ thể hiện sự khác biệt. Trên màn hình, mọi nốt nghe như nhau.',
    'Bài tập: biểu diễn Ngôi sao nhỏ đúng nhịp bằng tay phải và đạt từ 60% trở lên.',
  ],
  exercise: { kind: 'song', songId: 'twinkle', hands: 'R', play: 'perform', minPercent: 60 },
})
