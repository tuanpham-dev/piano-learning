import { create } from 'zustand'
import { audioNow, bus, emitNote } from './bus'

export type MidiState = 'unsupported' | 'asking' | 'none' | 'connected' | 'disconnected' | 'denied'

interface MidiStore {
  state: MidiState
  deviceName: string | null
  devices: { id: string; name: string }[]
  selectedId: string | null
  select: (id: string) => void
}

export const useMidi = create<MidiStore>()((set) => ({
  state: typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator ? 'none' : 'unsupported',
  deviceName: null,
  devices: [],
  selectedId: null,
  select: (id) => set({ selectedId: id }),
}))

export function midiSupported(): boolean {
  return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator
}

/** Parses one MIDI message into note/sustain actions. Exported for tests. */
export function parseMidiMessage(data: Uint8Array): { type: 'on' | 'off'; midi: number; velocity: number } | { type: 'sustain'; on: boolean } | null {
  const [status = 0, d1 = 0, d2 = 0] = data
  const cmd = status & 0xf0
  if (cmd === 0x90) return d2 > 0 ? { type: 'on', midi: d1, velocity: d2 } : { type: 'off', midi: d1, velocity: 0 }
  if (cmd === 0x80) return { type: 'off', midi: d1, velocity: 0 }
  if (cmd === 0xb0 && d1 === 64) return { type: 'sustain', on: d2 >= 64 }
  return null
}

let access: MIDIAccess | null = null
let attached: MIDIInput | null = null

function onMessage(e: MIDIMessageEvent) {
  if (!e.data) return
  const msg = parseMidiMessage(e.data)
  if (!msg) return
  // MIDI timestamps share performance.now()'s clock; convert to audio time.
  const time = audioNow() + Math.min(0, (e.timeStamp - performance.now()) / 1000)
  if (msg.type === 'sustain') bus.sustain(msg.on)
  else emitNote(msg.type, msg.midi, 'midi', msg.velocity, time)
}

function refresh() {
  if (!access) return
  const inputs = [...access.inputs.values()].filter((i) => i.state === 'connected')
  const store = useMidi.getState()
  const wanted = inputs.find((i) => i.id === store.selectedId) ?? inputs[0] ?? null
  if (attached && attached !== wanted) {
    attached.onmidimessage = null
    bus.releaseAll('midi')
  }
  const wasConnected = store.state === 'connected'
  attached = wanted
  if (attached) attached.onmidimessage = onMessage
  useMidi.setState({
    devices: inputs.map((i) => ({ id: i.id, name: i.name ?? 'MIDI device' })),
    deviceName: attached?.name ?? null,
    selectedId: attached?.id ?? null,
    state: attached ? 'connected' : wasConnected ? 'disconnected' : store.state === 'disconnected' ? 'disconnected' : 'none',
  })
}

/** Requests MIDI access, auto-selects the first input and follows hot-plug (R9). */
export async function startMidi(): Promise<() => void> {
  if (!midiSupported()) {
    useMidi.setState({ state: 'unsupported' })
    return () => {}
  }
  try {
    if (!access) {
      useMidi.setState({ state: 'asking' })
      access = await navigator.requestMIDIAccess()
      access.addEventListener('statechange', refresh)
      useMidi.setState({ state: 'none' })
    }
    refresh()
  } catch {
    useMidi.setState({ state: 'denied' })
  }
  const unsubSelect = useMidi.subscribe((s, prev) => {
    if (s.selectedId !== prev.selectedId && s.selectedId !== attached?.id) refresh()
  })
  return () => {
    unsubSelect()
    if (attached) attached.onmidimessage = null
    attached = null
  }
}
