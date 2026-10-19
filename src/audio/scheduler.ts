import { getAudioContext } from './context'

/**
 * Lookahead scheduler: tasks run on a 25 ms timer once they fall within the next 120 ms,
 * and receive their exact AudioContext time so audio is placed sample-accurately.
 */
type Task = { time: number; fn: (time: number) => void }

const LOOKAHEAD = 0.12
const INTERVAL = 25

export class Scheduler {
  private tasks: Task[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private uiTimers = new Set<ReturnType<typeof setTimeout>>()

  /** Schedule audio work at an AudioContext time. */
  at(time: number, fn: (time: number) => void): void {
    this.tasks.push({ time, fn })
    this.tasks.sort((a, b) => a.time - b.time)
    this.ensureRunning()
  }

  /** Run a UI callback when the audio clock reaches `time` (best effort, main thread). */
  ui(time: number, fn: () => void): void {
    const delay = Math.max(0, (time - getAudioContext().currentTime) * 1000)
    const id = setTimeout(() => {
      this.uiTimers.delete(id)
      fn()
    }, delay)
    this.uiTimers.add(id)
  }

  clear(): void {
    this.tasks = []
    for (const id of this.uiTimers) clearTimeout(id)
    this.uiTimers.clear()
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private ensureRunning() {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), INTERVAL)
    this.tick()
  }

  private tick() {
    const horizon = getAudioContext().currentTime + LOOKAHEAD
    while (this.tasks.length && this.tasks[0]!.time <= horizon) {
      const task = this.tasks.shift()!
      task.fn(task.time)
    }
    if (!this.tasks.length && this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}
