import { useMemo, useState } from 'react'
import { Page } from '../app/Layout'
import { useT } from '../app/i18n'
import { NARROW_WRAP as narrowWrap } from '../components/BottomSheet'
import { NoteStaff } from '../notation/Staff'
import { Keyboard, type KeyMark } from '../notation/Keyboard'
import { Segmented } from '../components/Segmented'
import { Button, PrimaryButton } from '../components/PrimaryButton'
import { InputPanel } from '../components/InputPanel'
import { useInputs } from '../input/useInputs'
import { CHORDS, ROOTS, SCALES, chordNotes, scaleNotes, type ChordType, type Root, type ScaleType } from '../engine/chords-scales'
import { playNotes, playSequence } from '../audio/sampler'
import { usePracticeClock } from '../hooks/usePracticeClock'

type Kind = 'chords' | 'scales'

export function ReferencePage() {
  const { t, tm, kid } = useT()
  usePracticeClock('reference')
  const { screen } = useInputs()
  const [root, setRoot] = useState<Root>('C')
  const [kind, setKind] = useState<Kind>('chords')
  const [chord, setChord] = useState<ChordType>('maj')
  const [scale, setScale] = useState<ScaleType>('major')

  const { midis, names } = kind === 'chords' ? chordNotes(root, chord) : scaleNotes(root, scale)
  const title = `${root.replace('#', '♯').replace(/^([A-G])b/, '$1♭')} ${kind === 'chords' ? t(`reference.c.${chord}`) : t(`reference.s.${scale}`)}`
  const highlight = useMemo(() => new Map<number, KeyMark>(midis.map((m) => [m, 'show'])), [midis])
  const keySig = 'C'

  const play = () => (kind === 'chords' ? playNotes(midis, 1.6) : playSequence([...midis, midis[0]! + 12], 0.32))

  return (
    <Page title={tm('modes.reference')} fill>
      <div className="flex flex-col gap-3 py-3 flex-1">
        {!kid && <h1 className="text-2xl font-bold">{t('modes.reference')}</h1>}
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('reference.root')}>
            {ROOTS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={r === root}
                data-root={r}
                onClick={() => setRoot(r)}
                className={`min-w-[var(--touch)] min-h-[var(--touch)] rounded-[var(--radius)] border px-2 font-semibold ${r === root ? 'bg-accent text-accent-ink border-accent' : 'border-line bg-bg hover:bg-panel'}`}
              >
                {r.replace('#', '♯').replace(/^([A-G])b/, '$1♭')}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented<Kind>
              id="ref-kind"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'chords', label: t('reference.chords') },
                { value: 'scales', label: t('reference.scales') },
              ]}
            />
            <select
              id="ref-type"
              aria-label={t('reference.type')}
              value={kind === 'chords' ? chord : scale}
              onChange={(e) => (kind === 'chords' ? setChord(e.target.value as ChordType) : setScale(e.target.value as ScaleType))}
              className="rounded-[var(--radius)] border border-line bg-bg px-3 min-h-[var(--touch)]"
            >
              {kind === 'chords'
                ? (Object.keys(CHORDS) as ChordType[]).map((c) => (
                    <option key={c} value={c}>
                      {t(`reference.c.${c}`)}
                    </option>
                  ))
                : (Object.keys(SCALES) as ScaleType[]).map((s) => (
                    <option key={s} value={s}>
                      {t(`reference.s.${s}`)}
                    </option>
                  ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold" data-testid="ref-title">
            {title}
          </h2>
          <span className="text-muted" data-testid="ref-notes">
            {names.join(' · ')}
          </span>
          <PrimaryButton onClick={play}>▶ {kind === 'chords' ? t('reference.playChord') : t('reference.playScale')}</PrimaryButton>
          {kind === 'chords' && <Button onClick={() => playSequence(midis, 0.25)}>{t('reference.arpeggio')}</Button>}
        </div>
        <div className="mx-auto w-full max-w-lg">
          <NoteStaff clef="treble" keySig={keySig} items={kind === 'chords' ? [{ midis }] : midis.map((m) => ({ midis: [m] }))} kid={kid} label={title} />
        </div>
        <div className="flex-1" />
        <Keyboard low={48} high={84} highlight={highlight} kid={kid} interactive={screen} focus={midis} height={kid ? 150 : 130} />
      </div>
      <div className={kid ? 'py-2' : narrowWrap}>
        <InputPanel />
      </div>
    </Page>
  )
}
