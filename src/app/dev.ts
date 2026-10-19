// Dev-only handles for automated QA. Never included in production builds.
import { useAudioStatus } from '../audio/context'
import { useMetronome, onClick } from '../audio/metronome'
import { bus, emitNote } from '../input/bus'
import { playScript } from '../input/virtual-midi'
import { useProgress } from '../store/progress'
import { useSession } from '../store/session'

export function installDevHandles(): void {
  Object.assign(window, { __dev: { useAudioStatus, useMetronome, onClick, bus, emitNote, playScript, useProgress, useSession } })
}
