import { parseVoice } from '../../engine/song-dsl'
import type { Diagram, Exercise, Lesson } from '../../engine/lessons'

interface LessonSource {
  id: string
  order: number
  title: { en: string; vi: string }
  en: string[]
  vi: string[]
  diagram?: Diagram
  /** Song DSL for the "Show me" demo (4/4). */
  demo?: string
  demoBpm?: number
  exercise: Exercise
}

export function makeLesson(s: LessonSource): Lesson {
  return {
    id: s.id,
    order: s.order,
    title: s.title,
    body: { en: s.en, vi: s.vi },
    diagram: s.diagram,
    demo: s.demo ? parseVoice(s.demo, [4, 4]) : undefined,
    demoBpm: s.demoBpm,
    exercise: s.exercise,
  }
}
