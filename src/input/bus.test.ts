import { bus } from './bus'
import type { NoteEvent } from './types'

vi.mock('../audio/sampler', () => ({ noteOn: vi.fn(), noteOff: vi.fn(), setSustain: vi.fn() }))
import { noteOn } from '../audio/sampler'

const ev = (kind: NoteEvent['kind'], midi: number, source: NoteEvent['source'] = 'screen'): NoteEvent => ({ kind, midi, velocity: 90, time: 0, source })

describe('input bus', () => {
  beforeEach(() => {
    bus.silent = false
    vi.mocked(noteOn).mockClear()
  })

  it('delivers events to subscribers until they unsubscribe', () => {
    const got: number[] = []
    const off = bus.subscribe((e) => got.push(e.midi))
    bus.emit(ev('on', 60))
    off()
    bus.emit(ev('on', 62))
    expect(got).toEqual([60])
  })

  it('tracks held notes', () => {
    bus.emit(ev('on', 64))
    bus.emit(ev('on', 67))
    bus.emit(ev('off', 64))
    expect([...bus.heldNotes()]).toContain(67)
    expect([...bus.heldNotes()]).not.toContain(64)
    bus.emit(ev('off', 67))
  })

  it('sounds live input but not the microphone or when silent', () => {
    bus.emit(ev('on', 60, 'qwerty'))
    bus.emit(ev('on', 61, 'mic'))
    bus.silent = true
    bus.emit(ev('on', 62, 'midi'))
    expect(vi.mocked(noteOn).mock.calls.map((c) => c[0])).toEqual([60])
  })

  it('records activity time for the practice clock', () => {
    bus.lastActivityAt = 0
    bus.emit(ev('tap', 0))
    expect(bus.lastActivityAt).toBeGreaterThan(0)
  })
})
