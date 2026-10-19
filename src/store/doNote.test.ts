import { DO_RESET_MS, installDoNoteFollower, useDoNote } from './doNote'

vi.mock('../audio/sampler', () => ({ noteOn: vi.fn(), noteOff: vi.fn(), setSustain: vi.fn() }))
import { bus } from '../input/bus'

describe('Do the note color', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useDoNote.setState({ letter: 'C', held: 'C' })
  })
  afterEach(() => vi.useRealTimers())

  it('takes a pulsed note and returns to C after 3 s', () => {
    useDoNote.getState().pulse('G')
    expect(useDoNote.getState().letter).toBe('G')
    vi.advanceTimersByTime(DO_RESET_MS - 1)
    expect(useDoNote.getState().letter).toBe('G')
    vi.advanceTimersByTime(1)
    expect(useDoNote.getState().letter).toBe('C')
  })

  it('restarts the timer on each pulse', () => {
    useDoNote.getState().pulse('E')
    vi.advanceTimersByTime(2000)
    useDoNote.getState().pulse('A')
    vi.advanceTimersByTime(2000)
    expect(useDoNote.getState().letter).toBe('A')
    vi.advanceTimersByTime(1000)
    expect(useDoNote.getState().letter).toBe('C')
  })

  it('holds a set note past 3 s, and returns to it after a played note', () => {
    useDoNote.getState().pulse('D')
    useDoNote.getState().set('B')
    vi.advanceTimersByTime(10_000)
    expect(useDoNote.getState().letter).toBe('B')
    useDoNote.getState().pulse('E')
    vi.advanceTimersByTime(DO_RESET_MS)
    expect(useDoNote.getState().letter).toBe('B')
    useDoNote.getState().release()
    expect(useDoNote.getState().letter).toBe('C')
  })

  it('follows notes played on the input bus', () => {
    bus.silent = true
    const stop = installDoNoteFollower()
    bus.emit({ kind: 'on', midi: 65, velocity: 90, time: 0, source: 'virtual' })
    expect(useDoNote.getState().letter).toBe('F')
    bus.emit({ kind: 'on', midi: 61, velocity: 90, time: 0, source: 'virtual' })
    expect(useDoNote.getState().letter).toBe('C')
    stop()
    bus.silent = false
  })
})
