import type { Lesson } from '../../engine/lessons'
import l01 from './l01-posture'
import l02 from './l02-note-names'
import l03 from './l03-middle-c'
import l04 from './l04-c-position-right'
import l05 from './l05-c-position-left'
import l06 from './l06-durations'
import l07 from './l07-treble-staff'
import l08 from './l08-bass-staff'
import l09 from './l09-both-hands'
import l10 from './l10-c-major-scale'
import l11 from './l11-g-position'
import l12 from './l12-dynamics'
import l13 from './l13-intervals'
import l14 from './l14-major-triads'
import l15 from './l15-minor-triads'
import l16 from './l16-time-signatures'
import l17 from './l17-song-both-hands'
import l18 from './l18-next-steps'

export const lessons: Lesson[] = [l01, l02, l03, l04, l05, l06, l07, l08, l09, l10, l11, l12, l13, l14, l15, l16, l17, l18]

export function lessonById(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id)
}
