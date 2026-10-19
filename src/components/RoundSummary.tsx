import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { useT } from '../app/i18n'
import { Celebration } from './Celebration'
import { Mascot } from './Mascot'
import { Stars } from './Stars'
import { PrimaryButton } from './PrimaryButton'

interface Props {
  /** 0–3 */
  stars: number
  /** Kid headline, e.g. "You named 10 notes!" */
  kidTitle: string
  /** Adult detail lines (numbers). */
  adultLines: ReactNode
  newBadges?: string[]
  onAgain: () => void
  againLabel: string
}

/** End-of-round card: numbers for adults; stars, mascot and celebration for kids (R3d, R3e). */
export function RoundSummary({ stars, kidTitle, adultLines, newBadges = [], onAgain, againLabel }: Props) {
  const { kid, t } = useT()
  if (kid) {
    return (
      <div className="grid justify-items-center gap-4 rounded-[var(--radius)] bg-panel p-6 text-center" data-testid="round-summary">
        {stars > 0 ? (
          <Celebration stickers={newBadges}>
            <h2 className="text-2xl font-extrabold">{kidTitle}</h2>
            <Stars count={stars} size={48} />
          </Celebration>
        ) : (
          <>
            <Mascot mood="thinking" size={96} />
            <h2 className="text-2xl font-extrabold">{t('kid.result.again')}</h2>
          </>
        )}
        <PrimaryButton onClick={onAgain}>{againLabel} ▶</PrimaryButton>
      </div>
    )
  }
  return (
    <div className="grid gap-3 rounded-[var(--radius)] border border-line p-4" data-testid="round-summary">
      <div className="flex flex-wrap items-center gap-3">
        <Stars count={stars} size={26} />
        <div className="grid gap-0.5 tabular">{adultLines}</div>
      </div>
      {newBadges.length > 0 && (
        <p className="text-sm inline-flex items-center gap-1">
          <Icon name="medal" /> {newBadges.map((b) => t(`badges.${b}`)).join(', ')}
        </p>
      )}
      <div>
        <PrimaryButton onClick={onAgain}>{againLabel}</PrimaryButton>
      </div>
    </div>
  )
}
