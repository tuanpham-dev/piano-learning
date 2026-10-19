import { makeLesson } from './make'

export default makeLesson({
  id: 'l15-minor-triads',
  order: 15,
  title: { en: 'Minor triads', vi: 'Hợp âm ba thứ' },
  diagram: 'triads',
  en: [
    'Lower the middle note of a major triad by one key and the chord becomes minor.',
    'C minor is C, E♭ and G. A minor is A, C and E, all on white keys.',
    'Minor chords sound darker, often sad or serious.',
    'Diminished and augmented chords sound tense. They appear in this exercise too.',
    'Exercise: name each chord: major, minor, diminished or augmented.',
  ],
  vi: [
    'Hạ nốt giữa của hợp âm trưởng xuống một phím, hợp âm sẽ thành thứ.',
    'Đô thứ gồm C, E♭ và G. La thứ gồm A, C và E, toàn phím trắng.',
    'Hợp âm thứ nghe tối hơn, thường buồn hoặc nghiêm trang.',
    'Hợp âm giảm và hợp âm tăng nghe căng thẳng. Chúng cũng có trong bài tập này.',
    'Bài tập: gọi tên từng hợp âm: trưởng, thứ, giảm hay tăng.',
  ],
  demo: '[C4 E4 G4]h [C4 Eb4 G4]h | [A3 C4 E4]h [A3 C#4 E4]h |',
  demoBpm: 70,
  exercise: { kind: 'ear', type: 'chord', count: 10, minCorrect: 6, chordTypes: ['maj', 'min', 'dim', 'aug'] },
})
