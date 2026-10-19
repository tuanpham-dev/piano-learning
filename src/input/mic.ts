import { create } from 'zustand'
import { NoteTracker, detect } from '../engine/pitch'
import { getAudioContext } from '../audio/context'
import { audioNow, emitNote } from './bus'

export type MicState = 'off' | 'asking' | 'on' | 'blocked' | 'unsupported'

interface MicStore {
  state: MicState
  heard: number | null
  level: number
}

export const useMic = create<MicStore>()(() => ({ state: 'off', heard: null, level: 0 }))

let stream: MediaStream | null = null
let timer: ReturnType<typeof setInterval> | null = null
let source: MediaStreamAudioSourceNode | null = null
const tracker = new NoteTracker()

/** Sensitivity 0.6 (loose) … 0.95 (strict) maps to the clarity threshold. */
export function setMicSensitivity(s: number): void {
  tracker.setClarity(Math.max(0.6, Math.min(0.95, s)))
}

export async function startMic(sensitivity = 0.85): Promise<void> {
  if (stream) return
  if (!navigator.mediaDevices?.getUserMedia) {
    useMic.setState({ state: 'unsupported' })
    return
  }
  setMicSensitivity(sensitivity)
  useMic.setState({ state: 'asking' })
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
  } catch {
    useMic.setState({ state: 'blocked' })
    return
  }
  const ctx = getAudioContext()
  source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  source.connect(analyser)
  const frame = new Float32Array(analyser.fftSize)
  tracker.reset()
  useMic.setState({ state: 'on' })
  timer = setInterval(() => {
    analyser.getFloatTimeDomainData(frame)
    const reading = detect(frame, ctx.sampleRate)
    for (const ev of tracker.feed(reading, performance.now())) emitNote(ev.kind, ev.midi, 'mic', 80, audioNow())
    const s = useMic.getState()
    if (s.heard !== tracker.heard || Math.abs(s.level - reading.rms) > 0.01) useMic.setState({ heard: tracker.heard, level: reading.rms })
  }, 40)
}

export function stopMic(): void {
  if (timer) clearInterval(timer)
  timer = null
  source?.disconnect()
  source = null
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  tracker.reset()
  const s = useMic.getState().state
  useMic.setState({ state: s === 'blocked' || s === 'unsupported' ? s : 'off', heard: null, level: 0 })
}
