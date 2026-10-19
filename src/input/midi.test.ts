import { parseMidiMessage, startMidi, useMidi } from './midi'

describe('MIDI message parsing', () => {
  it('reads note on with velocity on any channel', () => {
    expect(parseMidiMessage(new Uint8Array([0x90, 60, 100]))).toEqual({ type: 'on', midi: 60, velocity: 100 })
    expect(parseMidiMessage(new Uint8Array([0x93, 64, 20]))).toEqual({ type: 'on', midi: 64, velocity: 20 })
  })
  it('treats note on with velocity 0 as note off', () => {
    expect(parseMidiMessage(new Uint8Array([0x90, 60, 0]))).toEqual({ type: 'off', midi: 60, velocity: 0 })
    expect(parseMidiMessage(new Uint8Array([0x80, 60, 40]))).toEqual({ type: 'off', midi: 60, velocity: 0 })
  })
  it('reads the sustain pedal (CC64)', () => {
    expect(parseMidiMessage(new Uint8Array([0xb0, 64, 127]))).toEqual({ type: 'sustain', on: true })
    expect(parseMidiMessage(new Uint8Array([0xb0, 64, 0]))).toEqual({ type: 'sustain', on: false })
  })
  it('ignores other messages', () => {
    expect(parseMidiMessage(new Uint8Array([0xb0, 7, 100]))).toBeNull()
    expect(parseMidiMessage(new Uint8Array([0xf8]))).toBeNull()
  })
})

describe('MIDI device state', () => {
  type Listener = () => void
  function fakeAccess(inputs: { id: string; name: string }[]) {
    let onChange: Listener = () => {}
    const map = new Map(inputs.map((i) => [i.id, { ...i, state: 'connected', onmidimessage: null as unknown }]))
    return {
      inputs: map,
      addEventListener: (_: string, fn: Listener) => (onChange = fn),
      plug: (i: { id: string; name: string }) => {
        map.set(i.id, { ...i, state: 'connected', onmidimessage: null })
        onChange()
      },
      unplug: (id: string) => {
        map.get(id)!.state = 'disconnected'
        onChange()
      },
    }
  }

  it('reports no devices, then connects on hot-plug and shows disconnects (R9)', async () => {
    const access = fakeAccess([])
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: () => Promise.resolve(access), configurable: true })
    await startMidi()
    expect(useMidi.getState().state).toBe('none')
    access.plug({ id: 'a', name: 'Roland FP-30X' })
    expect(useMidi.getState()).toMatchObject({ state: 'connected', deviceName: 'Roland FP-30X' })
    access.unplug('a')
    expect(useMidi.getState().state).toBe('disconnected')
  })

  it('distinguishes blocked from unsupported', async () => {
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: () => Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' })), configurable: true })
    vi.resetModules()
    const m = await import('./midi')
    await m.startMidi()
    expect(m.useMidi.getState().state).toBe('denied')
  })
})
