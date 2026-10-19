import type { Hands, ProgressData } from '../store/progress'
import type { Localized, Voice } from './song'

export type Clef = 'treble' | 'bass' | 'both'
export type EarType = 'interval' | 'chord' | 'melody'

export type Exercise =
  | { kind: 'drill'; clef: Clef; low: number; high: number; accidentals: boolean; count: number; minCorrect: number; pool?: number[] }
  | { kind: 'song'; songId: string; hands: Hands; play: 'wait' | 'perform'; minPercent?: number }
  | { kind: 'rhythm'; level: 1 | 2 | 3; bpm: number; minPercent: number }
  | { kind: 'ear'; type: EarType; count: number; minCorrect: number; chordTypes?: ('maj' | 'min' | 'dim' | 'aug')[] }
  | { kind: 'none' }

export type Diagram =
  | 'posture'
  | 'keyboard'
  | 'middleC'
  | 'cPosition'
  | 'cPositionLeft'
  | 'cScale'
  | 'durations'
  | 'treble'
  | 'bass'
  | 'grand'
  | 'gPosition'
  | 'dynamics'
  | 'intervals'
  | 'triads'
  | 'timeSigs'

export interface Lesson {
  id: string
  order: number
  title: Localized
  body: { en: string[]; vi: string[] }
  diagram?: Diagram
  /** Notes the "Show me" button plays, in quarter-note beats, at `demoBpm`. */
  demo?: Voice
  demoBpm?: number
  exercise: Exercise
}

export function isUnlocked(lesson: Lesson, all: Lesson[], p: Pick<ProgressData, 'lessonsDone' | 'mode' | 'settings'>): boolean {
  if (p.mode === 'adult' && p.settings.skipAhead) return true
  if (lesson.order === 1) return true
  const prev = all.find((l) => l.order === lesson.order - 1)
  return !prev || p.lessonsDone.includes(prev.id)
}

/** First lesson not done yet, in order; undefined when all are done. */
export function nextLesson(all: Lesson[], p: Pick<ProgressData, 'lessonsDone'>): Lesson | undefined {
  return [...all].sort((a, b) => a.order - b.order).find((l) => !p.lessonsDone.includes(l.id))
}

export interface ExerciseResult {
  correct?: number
  of?: number
  percent?: number
  completed?: boolean
}

export function passes(ex: Exercise, r: ExerciseResult): boolean {
  switch (ex.kind) {
    case 'drill':
    case 'ear':
      return (r.correct ?? 0) >= ex.minCorrect
    case 'rhythm':
      return (r.percent ?? 0) >= ex.minPercent
    case 'song':
      return ex.play === 'wait' ? !!r.completed : (r.percent ?? 0) >= (ex.minPercent ?? 0)
    case 'none':
      return true
  }
}
