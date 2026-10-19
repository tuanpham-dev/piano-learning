import { useT } from '../app/i18n'
import { BPM_MAX, BPM_MIN, TIME_SIGS, clicksPerBar, useMetronome, type TimeSigName } from '../audio/metronome'

/** Metronome toggle, tempo, time signature and a beat flash (R14). */
export function MetronomeControls({ compact = false }: { compact?: boolean }) {
  const { t } = useT()
  const { bpm, sig, running, beat, setBpm, setSig, toggle } = useMetronome()
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={running}
        className={`inline-flex items-center gap-2 rounded-[var(--radius)] border px-3 min-h-9 ${running ? 'bg-accent text-accent-ink border-accent' : 'border-line bg-bg'}`}
      >
        <span aria-hidden>{running ? '●' : '○'}</span>
        {!compact && t('free.metronome')}
      </button>
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: clicksPerBar(sig) }, (_, i) => (
          <span
            key={`${i}-${running && beat === i ? 'on' : 'off'}`}
            className="size-2.5 rounded-full"
            style={{
              background: running && beat === i ? (i === 0 ? 'var(--color-accent)' : 'var(--color-fg)') : 'var(--color-line)',
              animation: running && beat === i ? 'beat-flash .35s ease-out forwards' : undefined,
            }}
          />
        ))}
      </span>
      <label className="inline-flex items-center gap-1.5" htmlFor="met-bpm">
        <input
          id="met-bpm"
          type="range"
          min={BPM_MIN}
          max={BPM_MAX}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-24 accent-[var(--color-accent)]"
          aria-label="Tempo"
        />
        <span className="tabular w-16">{t('free.bpm', { bpm })}</span>
      </label>
      <select id="met-sig" value={sig} onChange={(e) => setSig(e.target.value as TimeSigName)} className="rounded border border-line bg-bg px-2 py-1" aria-label="Time signature">
        {TIME_SIGS.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
    </div>
  )
}
