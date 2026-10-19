import type { Lesson } from '../../engine/lessons'

export const lessons: Lesson[] = []

export function lessonById(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id)
}
