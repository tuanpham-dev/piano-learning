import { makeLesson } from './make'

export default makeLesson({
  id: 'l01-posture',
  order: 1,
  title: { en: 'Sitting and hand position', vi: 'Tư thế ngồi và đặt tay' },
  diagram: 'posture',
  en: [
    'Sit tall on the front half of the bench, with your feet flat on the floor.',
    'Your elbows should be level with the keys. Move the bench if they aren’t.',
    'Curve your fingers as if you’re holding a small ball. Play on your fingertips.',
    'Fingers have numbers: the thumb is 1 and the little finger is 5. Both hands use the same numbers.',
    'Exercise: keep a steady beat. Tap along after the count-in.',
  ],
  vi: [
    'Ngồi thẳng lưng ở nửa trước của ghế, hai bàn chân đặt phẳng trên sàn.',
    'Khuỷu tay ngang với mặt phím. Nếu chưa ngang, hãy chỉnh lại ghế.',
    'Cong các ngón tay như đang cầm một quả bóng nhỏ. Chơi bằng đầu ngón.',
    'Các ngón được đánh số: ngón cái là 1, ngón út là 5. Hai tay đánh số giống nhau.',
    'Bài tập: giữ nhịp đều. Gõ theo sau phần đếm vào.',
  ],
  exercise: { kind: 'rhythm', level: 1, bpm: 70, minPercent: 80 },
})
