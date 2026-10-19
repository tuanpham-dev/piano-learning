import { makeLesson } from './make'

export default makeLesson({
  id: 'l03-middle-c',
  order: 3,
  title: { en: 'Finding middle C', vi: 'Tìm nốt Đô giữa' },
  diagram: 'middleC',
  en: [
    'Middle C is the C nearest the middle of the piano. It is often called C4.',
    'On a full piano it sits a little left of centre, below the brand name.',
    'In written music, middle C sits between the two staves on a short line of its own.',
    'Exercise: three different Cs will appear. Play exactly the one shown.',
  ],
  vi: [
    'Đô giữa là nốt C gần giữa đàn nhất. Nó thường được gọi là C4.',
    'Trên đàn đủ phím, nó nằm hơi lệch về bên trái, ngay dưới tên hãng đàn.',
    'Trong bản nhạc, Đô giữa nằm giữa hai khuông, trên một dòng kẻ phụ ngắn.',
    'Bài tập: ba nốt C khác nhau sẽ hiện ra. Hãy chơi đúng nốt được hiển thị.',
  ],
  demo: 'C3h C4h | C5h C4h |',
  demoBpm: 80,
  exercise: { kind: 'drill', clef: 'both', low: 48, high: 72, accidentals: false, count: 10, minCorrect: 8, pool: [48, 60, 72] },
})
