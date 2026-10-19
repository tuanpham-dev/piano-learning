import { useEffect, useState } from 'react'
import { Page } from '../app/Layout'
import { useT } from '../app/i18n'
import { Keyboard } from '../notation/Keyboard'
import { InputPanel } from '../components/InputPanel'
import { MetronomeControls } from '../components/MetronomeControls'
import { useInputs } from '../input/useInputs'
import { qwertyLabels, useQwerty } from '../input/qwerty'
import { bus } from '../input/bus'
import { useProgress } from '../store/progress'
import { usePracticeClock } from '../hooks/usePracticeClock'
import { useMetronome } from '../audio/metronome'
import { Mascot } from '../components/Mascot'
import { Segmented } from '../components/Segmented'

const RANGES = { full: [21, 108], mid: [36, 96], small: [48, 84] } as const
type RangeKey = keyof typeof RANGES

export function FreePlayPage() {
  const { t, tm, kid } = useT()
  const { screen } = useInputs()
  usePracticeClock('free')
  const settings = useProgress((s) => s.settings)
  const update = useProgress((s) => s.updateSettings)
  const qOct = useQwerty((s) => s.octave)
  const shift = useQwerty((s) => s.shift)
  const [sustain, setSustain] = useState(false)
  const [range, setRange] = useState<RangeKey>(kid ? 'small' : 'full')
  const [lo, hi] = RANGES[range]

  useEffect(() => bus.onSustain(setSustain), [])
  useEffect(() => () => useMetronome.getState().stop(), [])

  return (
    <Page title={tm('modes.free')} fill>
      <div className="flex flex-col gap-3 py-3 flex-1 min-h-0">
        {kid ? (
          <div className="flex items-center gap-3">
            <Mascot mood="idle" size={64} />
            <p className="text-xl font-extrabold">{t('kid.free.title')}</p>
          </div>
        ) : (
          <h1 className="text-2xl font-bold">{t('modes.free')}</h1>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-pressed={sustain}
            onPointerDown={() => bus.sustain(!sustain)}
            className={`rounded-[var(--radius)] border px-4 min-h-[var(--touch)] ${sustain ? 'bg-accent text-accent-ink border-accent' : 'border-line bg-bg'}`}
          >
            {t('free.sustain')}
          </button>
          <span className="inline-flex items-center gap-1">
            <button type="button" className="rounded-md border border-line bg-bg px-3 min-h-[var(--touch)]" onClick={() => shift(-1)} aria-label="Octave down">
              −
            </button>
            <span className="tabular px-1 text-sm">{t('inputs.octave', { n: qOct })}</span>
            <button type="button" className="rounded-md border border-line bg-bg px-3 min-h-[var(--touch)]" onClick={() => shift(1)} aria-label="Octave up">
              +
            </button>
          </span>
          {!kid && (
            <label className="inline-flex items-center gap-2 text-sm" htmlFor="free-names">
              <input id="free-names" type="checkbox" className="size-5 accent-[var(--color-accent)]" checked={settings.noteNames} onChange={(e) => update({ noteNames: e.target.checked })} />
              {t('free.noteNames')}
            </label>
          )}
          <Segmented<RangeKey>
            id="free-range"
            label={t('free.range')}
            value={range}
            onChange={setRange}
            options={[
              { value: 'small', label: '3 oct' },
              { value: 'mid', label: '5 oct' },
              { value: 'full', label: '88' },
            ]}
          />
          <MetronomeControls />
        </div>
        <div className="flex-1 min-h-6" />
        <Keyboard
          low={lo}
          high={hi}
          kid={kid}
          showNames={settings.noteNames}
          labels={settings.inputs.qwerty && !kid ? qwertyLabels(qOct) : undefined}
          interactive={screen}
          height={kid ? 200 : 170}
          focus={[(qOct + 1) * 12, (qOct + 1) * 12 + 16]}
        />
      </div>
      <div className="-mx-[max(16px,env(safe-area-inset-left,0px))]">
        {kid ? (
          <div className="px-4 py-2">
            <InputPanel />
          </div>
        ) : (
          <InputPanel />
        )}
      </div>
    </Page>
  )
}
