import { create } from 'zustand'

interface AudioStatus {
  /** Context exists and is running. */
  running: boolean
  /** Something tried to play while the browser still blocks audio. */
  needsGesture: boolean
  samplesLoaded: boolean
  samplesProgress: number
  /** Samples failed to load; the sampler uses a synthesized tone. */
  fallback: boolean
}

export const useAudioStatus = create<AudioStatus>()(() => ({
  running: false,
  needsGesture: false,
  samplesLoaded: false,
  samplesProgress: 0,
  fallback: false,
}))

let ctx: AudioContext | null = null
let master: GainNode | null = null

export function getAudioContext(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor({ latencyHint: 'interactive' })
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -12
    comp.ratio.value = 4
    master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(comp).connect(ctx.destination)
    const sync = () => useAudioStatus.setState({ running: ctx!.state === 'running', needsGesture: ctx!.state === 'running' ? false : useAudioStatus.getState().needsGesture })
    ctx.addEventListener('statechange', sync)
    sync()
  }
  return ctx
}

export function getMaster(): GainNode {
  getAudioContext()
  return master!
}

export function now(): number {
  return getAudioContext().currentTime
}

/** Resumes the context; must be called from a user gesture to succeed. */
export async function resume(): Promise<boolean> {
  const c = getAudioContext()
  if (c.state !== 'running') {
    try {
      await c.resume()
    } catch {
      /* blocked until a gesture */
    }
  }
  const running = c.state === 'running'
  useAudioStatus.setState(running ? { running, needsGesture: false } : { running })
  return running
}

/** Called by anything about to play: flags the sound gate if audio is still blocked. */
export function ensureRunning(): boolean {
  const c = getAudioContext()
  if (c.state === 'running') return true
  useAudioStatus.setState({ needsGesture: true })
  void resume()
  return false
}
