import { parseMidiMessage } from './midi'

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
