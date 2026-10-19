import { useEffect } from 'react'
import { useProgress } from '../store/progress'
import { startQwerty } from './qwerty'
import { startMidi } from './midi'
import { setMicSensitivity, startMic, stopMic } from './mic'

export interface InputOptions {
  /** Whether this screen accepts the microphone (R10). */
  allowMic?: boolean
  /** Space bar sends a rhythm tap instead of sustain. */
  tapOnSpace?: boolean
}

/** Starts and stops input adapters to match the settings and the current screen. */
export function useInputs({ allowMic = false, tapOnSpace = false }: InputOptions = {}) {
  const inputs = useProgress((s) => s.settings.inputs)
  const sensitivity = useProgress((s) => s.settings.micSensitivity)

  useEffect(() => {
    if (!inputs.qwerty) return
    return startQwerty({ tapOnSpace })
  }, [inputs.qwerty, tapOnSpace])

  useEffect(() => {
    if (!inputs.midi) return
    let stop: (() => void) | undefined
    let cancelled = false
    void startMidi().then((s) => {
      if (cancelled) s()
      else stop = s
    })
    return () => {
      cancelled = true
      stop?.()
    }
  }, [inputs.midi])

  const micOn = inputs.mic && allowMic
  useEffect(() => {
    if (!micOn) return
    void startMic(sensitivity)
    return () => stopMic()
    // Sensitivity changes are applied live below without restarting the mic.
  }, [micOn])

  useEffect(() => setMicSensitivity(sensitivity), [sensitivity])

  return { screen: inputs.screen, micOn }
}
