import { lessons } from '.'
import { bundledSongById } from '../songs'
import { isUnlocked, nextLesson, passes } from '../../engine/lessons'
import { initialProgress } from '../../store/progress'

describe('lessons', () => {
  it('has 18 lessons in order 1–18 with unique ids', () => {
    expect(lessons).toHaveLength(18)
    expect(lessons.map((l) => l.order)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1))
    expect(new Set(lessons.map((l) => l.id)).size).toBe(18)
  })
  it('has text in both languages, paragraph for paragraph', () => {
    for (const l of lessons) {
      expect(l.body.en.length, l.id).toBeGreaterThanOrEqual(3)
      expect(l.body.vi.length, l.id).toBe(l.body.en.length)
      expect(l.title.en && l.title.vi).toBeTruthy()
    }
  })
  it('keeps titles short enough for kid mode', () => {
    for (const l of lessons) for (const t of [l.title.en, l.title.vi]) expect(t.split(/\s+/).length, t).toBeLessThanOrEqual(12)
  })
  it('only references songs that exist', () => {
    for (const l of lessons) if (l.exercise.kind === 'song') expect(bundledSongById(l.exercise.songId), l.id).toBeDefined()
  })
  it('unlocks in order, and skip-ahead only for adults', () => {
    const p = initialProgress()
    expect(isUnlocked(lessons[0]!, lessons, p)).toBe(true)
    expect(isUnlocked(lessons[1]!, lessons, p)).toBe(false)
    expect(isUnlocked(lessons[1]!, lessons, { ...p, lessonsDone: ['l01-posture'] })).toBe(true)
    const skip = { ...p, settings: { ...p.settings, skipAhead: true } }
    expect(isUnlocked(lessons[17]!, lessons, { ...skip, mode: 'adult' })).toBe(true)
    expect(isUnlocked(lessons[17]!, lessons, { ...skip, mode: 'kid' })).toBe(false)
    expect(nextLesson(lessons, { lessonsDone: ['l01-posture'] })?.order).toBe(2)
  })
  it('judges pass conditions', () => {
    const drill = lessons[1]!.exercise
    expect(passes(drill, { correct: 8, of: 10 })).toBe(true)
    expect(passes(drill, { correct: 7, of: 10 })).toBe(false)
    expect(passes(lessons[3]!.exercise, { completed: true })).toBe(true)
    expect(passes(lessons[16]!.exercise, { percent: 59 })).toBe(false)
    expect(passes(lessons[17]!.exercise, {})).toBe(true)
  })
})
