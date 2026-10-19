import { useState } from 'react'
import { useT } from '../app/i18n'
import { useProgress } from '../store/progress'
import { inject, injectSustain, playScript, stopScript, useScripts, type ScriptNote } from '../input/virtual-midi'
import { prettyName } from '../engine/notes'

const PAD = [48, 55, 60, 62, 64, 65, 67, 69, 71, 72]

/** Developer panel that injects MIDI-identical events (R12). Only rendered when unlocked in Settings. */
export function VirtualMidiPanel() {
  const { t } = useT()
  const enabled = useProgress((s) => s.settings.virtualMidi)
  const providers = useScripts((s) => s.providers)
  const [text, setText] = useState('[{"t":0,"midi":60,"dur":0.4},{"t":0.5,"midi":64,"dur":0.4},{"t":1,"midi":67,"dur":0.4}]')
  const [error, setError] = useState<string | null>(null)
  const [pedal, setPedal] = useState(false)
  if (!enabled) return null

  const run = () => {
    try {
      const script = JSON.parse(text) as ScriptNote[]
      if (!Array.isArray(script)) throw new Error('not an array')
      setError(null)
      playScript(script)
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <details className="rounded-md border border-dashed border-line bg-panel/50 p-3 text-sm" data-testid="virtual-midi">
      <summary className="cursor-pointer font-semibold">🛠 {t('vmidi.title')}</summary>
      <div className="grid gap-3 pt-2">
        <p className="text-muted">{t('vmidi.hint')}</p>
        <div className="flex flex-wrap gap-1.5">
          {PAD.map((m) => (
            <button
              key={m}
              type="button"
              data-vmidi={m}
              className="rounded border border-line bg-bg px-2.5 py-1.5 font-mono"
              onPointerDown={() => inject('on', m)}
              onPointerUp={() => inject('off', m)}
              onPointerLeave={(e) => e.buttons && inject('off', m)}
            >
              {prettyName(m)} <span className="text-muted">{m}</span>
            </button>
          ))}
          <button
            type="button"
            aria-pressed={pedal}
            className={`rounded border px-2.5 py-1.5 ${pedal ? 'bg-accent text-accent-ink' : 'bg-bg border-line'}`}
            onClick={() => {
              injectSustain(!pedal)
              setPedal(!pedal)
            }}
          >
            {t('vmidi.sustain')}
          </button>
        </div>
        {providers.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-muted">{t('vmidi.ready')}:</span>
            {providers.map((p) => (
              <button key={p.id} type="button" data-script={p.id} className="rounded border border-line bg-bg px-2.5 py-1.5" onClick={() => playScript(p.build())}>
                ▶ {p.label}
              </button>
            ))}
          </div>
        )}
        <label className="grid gap-1" htmlFor="vmidi-script">
          <span className="text-muted">{t('vmidi.script')}</span>
          <textarea id="vmidi-script" className="font-mono text-xs rounded border border-line bg-bg p-2 h-20" value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        {error && <p className="text-accent">{error}</p>}
        <div className="flex gap-2">
          <button type="button" className="rounded border border-line bg-bg px-3 py-1.5" onClick={run}>
            ▶ {t('vmidi.playScript')}
          </button>
          <button type="button" className="rounded border border-line bg-bg px-3 py-1.5" onClick={stopScript}>
            ■ {t('vmidi.stop')}
          </button>
        </div>
      </div>
    </details>
  )
}
