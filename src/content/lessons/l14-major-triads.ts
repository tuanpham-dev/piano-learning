import { makeLesson } from './make'

export default makeLesson({
  id: 'l14-major-triads',
  order: 14,
  title: { en: 'Major triads', vi: 'Hợp âm ba trưởng' },
  diagram: 'triads',
  en: [
    'A triad is three notes stacked in 3rds: a root, a 3rd and a 5th.',
    'C major is C, E and G. Major chords sound bright and happy.',
    'Use fingers 1, 3 and 5 of either hand to play a triad.',
    'Exercise: hear a chord and say whether it is major or minor.',
  ],
  vi: [
    'Hợp âm ba gồm ba nốt chồng theo quãng 3: nốt gốc, nốt quãng 3 và nốt quãng 5.',
    'Đô trưởng gồm C, E và G. Hợp âm trưởng nghe sáng và vui.',
    'Dùng ngón 1, 3 và 5 của tay nào cũng được để chơi hợp âm ba.',
    'Bài tập: nghe một hợp âm và cho biết nó là trưởng hay thứ.',
  ],
  demo: '[C4 E4 G4]h [F4 A4 C5]h | [G4 B4 D5]h [C4 E4 G4]h |',
  demoBpm: 70,
  exercise: { kind: 'ear', type: 'chord', count: 10, minCorrect: 7, chordTypes: ['maj', 'min'] },
})
