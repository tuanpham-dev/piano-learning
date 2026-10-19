import { useState } from 'react'
import { Icon } from './Icon'
import { useT } from '../app/i18n'
import { useProgress } from '../store/progress'
import { useMidi, type MidiState } from '../input/midi'
import { useMic } from '../input/mic'
import { useQwerty } from '../input/qwerty'
import { prettyName } from '../engine/notes'
import { VirtualMidiPanel } from './VirtualMidiPanel'
import { BottomSheet } from './BottomSheet'
import { useNarrow } from '../hooks/useMedia'

interface Props {
  /** The microphone is offered on this screen. */
  micAllowed?: boolean
  /** Why the mic is disabled right now (shown instead of the toggle). */
  micDisabledReason?: string
  tapOnSpace?: boolean
  compact?: boolean
  /** Always render inline (when already inside a sheet). */
  inline?: boolean
}

function Pill({ tone = 'neutral', children }: { tone?: 'ok' | 'err' | 'neutral'; children: React.ReactNode }) {
  const cls = tone === 'ok' ? 'text-ok' : tone === 'err' ? 'text-accent' : 'text-muted'
  return <span className={`rounded-full bg-panel px-2.5 py-0.5 text-xs ${cls}`}>{children}</span>
}

function Check({ id, checked, onChange, disabled, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className={`inline-flex items-center gap-2 min-h-9 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <input id={id} type="checkbox" className="size-5 accent-[var(--color-accent)]" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  )
}

function midiText(state: MidiState, name: string | null, t: (k: string, o?: Record<string, unknown>) => string): { text: string; tone: 'ok' | 'err' | 'neutral' } {
  switch (state) {
    case 'unsupported':
      return { text: t('inputs.midiUnsupported'), tone: 'neutral' }
    case 'connected':
      return { text: t('inputs.midiConnected', { name }), tone: 'ok' }
    case 'disconnected':
      return { text: t('inputs.midiDisconnected'), tone: 'err' }
    case 'denied':
      return { text: t('inputs.midiDenied'), tone: 'err' }
    case 'asking':
      return { text: t('inputs.midiAsking'), tone: 'neutral' }
    default:
      return { text: t('inputs.midiNone'), tone: 'neutral' }
  }
}

function PanelBody({ micAllowed, micDisabledReason, tapOnSpace }: Props) {
  const { t, kid } = useT()
  const inputs = useProgress((s) => s.settings.inputs)
  const sensitivity = useProgress((s) => s.settings.micSensitivity)
  const update = useProgress((s) => s.updateSettings)
  const set = (k: keyof typeof inputs, v: boolean) => update({ inputs: { ...inputs, [k]: v } })
  const midi = useMidi()
  const mic = useMic()
  const octave = useQwerty((s) => s.octave)
  const m = midiText(midi.state, midi.deviceName, t)

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <Check id="in-screen" checked={inputs.screen} onChange={(v) => set('screen', v)}>
        {t('inputs.screen')}
      </Check>
      <span className="inline-flex items-center gap-2 flex-wrap">
        <Check id="in-qwerty" checked={inputs.qwerty} onChange={(v) => set('qwerty', v)}>
          {t('inputs.qwerty')}
        </Check>
        {inputs.qwerty && !kid && (
          <Pill>
            {tapOnSpace ? t('inputs.qwertyHintTap') : t('inputs.qwertyHint')} · {t('inputs.octave', { n: octave })}
          </Pill>
        )}
      </span>
      <span className="inline-flex items-center gap-2 flex-wrap">
        <Check id="in-midi" checked={inputs.midi && midi.state !== 'unsupported'} disabled={midi.state === 'unsupported'} onChange={(v) => set('midi', v)}>
          {t('inputs.midi')}
        </Check>
        {(inputs.midi || midi.state === 'unsupported') && <Pill tone={m.tone}>{m.text}</Pill>}
        {midi.devices.length > 1 && (
          <select id="in-midi-device" className="rounded border border-line bg-bg px-2 py-1" value={midi.selectedId ?? ''} onChange={(e) => midi.select(e.target.value)}>
            {midi.devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </span>
      {micAllowed && (
        <span className="inline-flex items-center gap-2 flex-wrap">
          <Check id="in-mic" checked={inputs.mic && !micDisabledReason} disabled={!!micDisabledReason} onChange={(v) => set('mic', v)}>
            <Icon name="mic" size={18} /> {t('inputs.mic')}
          </Check>
          {micDisabledReason ? (
            <Pill>{micDisabledReason}</Pill>
          ) : mic.state === 'blocked' ? (
            <Pill tone="err">{t('inputs.micBlocked')}</Pill>
          ) : mic.state === 'unsupported' ? (
            <Pill tone="err">{t('inputs.micUnsupported')}</Pill>
          ) : mic.state === 'on' ? (
            <>
              <Pill tone="ok">
                {mic.heard !== null
                  ? kid
                    ? t('kid.inputs.micHeard', { note: prettyName(mic.heard, { octave: false }) })
                    : t('inputs.micHeard', { note: prettyName(mic.heard) })
                  : t('inputs.micListening')}
              </Pill>
              <span className="h-2 w-16 rounded bg-line overflow-hidden" aria-hidden>
                <span className="block h-full bg-ok" style={{ width: `${Math.min(100, mic.level * 400)}%` }} />
              </span>
              {!kid && (
                <label className="inline-flex items-center gap-2 text-xs text-muted" htmlFor="in-mic-sens">
                  {t('inputs.micSensitivity')}
                  <input
                    id="in-mic-sens"
                    type="range"
                    min={0.6}
                    max={0.95}
                    step={0.05}
                    // Higher sensitivity = lower clarity threshold.
                    value={1.55 - sensitivity}
                    onChange={(e) => update({ micSensitivity: Math.round((1.55 - Number(e.target.value)) * 100) / 100 })}
                  />
                </label>
              )}
            </>
          ) : (
            !kid && <Pill>{t('inputs.micHint')}</Pill>
          )}
        </span>
      )}
    </div>
  )
}

/** Input picker shown on every playing screen (R11). Kid mode hides it behind one "Piano" button. */
export function InputPanel(props: Props) {
  const { t, tm, kid } = useT()
  const [open, setOpen] = useState(false)
  const narrow = useNarrow()
  const inputs = useProgress((s) => s.settings.inputs)
  if (!kid && narrow && !props.inline) {
    const on = [inputs.screen && t('inputs.screen'), inputs.qwerty && t('inputs.qwerty'), inputs.midi && t('inputs.midi'), props.micAllowed && inputs.mic && t('inputs.mic')].filter(Boolean)
    return (
      <BottomSheet label={t('inputs.title')} summary={on.join(' · ')}>
        <PanelBody {...props} />
        <VirtualMidiPanel />
      </BottomSheet>
    )
  }
  if (!kid) {
    return (
      <div className={`border-t border-line bg-panel/60 px-3 py-2 ${props.compact ? '' : ''}`} aria-label={t('inputs.title')}>
        <PanelBody {...props} />
        <div className="mt-2 empty:hidden">
          <VirtualMidiPanel />
        </div>
      </div>
    )
  }
  return (
    <div className="relative">
      <button type="button" className="inline-flex items-center gap-2 rounded-full bg-panel px-5 min-h-[var(--touch)] font-extrabold" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="piano" /> {tm('inputs.piano')}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-30 w-[min(92vw,560px)] rounded-[var(--radius)] border-2 border-line bg-bg p-4 shadow-xl grid gap-2">
          <strong>{t('kid.inputs.title')}</strong>
          <PanelBody {...props} />
          <VirtualMidiPanel />
        </div>
      )}
    </div>
  )
}
