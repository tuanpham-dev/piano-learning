import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Page } from '../app/Layout'
import { useT } from '../app/i18n'
import { useProgress } from '../store/progress'
import { computeStreak } from '../engine/streak'
import { BADGE_IDS, type BadgeId } from '../engine/badges'
import { Mascot } from '../components/Mascot'
import { Sticker } from '../components/Sticker'
import { StarIcon } from '../components/Stars'

/** Kid-mode progress: total stars, streak sentence and the sticker board (R28). */
export function StarsPage() {
  const { t } = useT()
  const stars = useProgress((s) => s.stars)
  const badges = useProgress((s) => s.badges)
  const daily = useProgress((s) => s.dailyMinutes)
  const streak = computeStreak(daily)
  const [hint, setHint] = useState<BadgeId | null>(null)

  return (
    <Page title={t('kid.stars.title')}>
      <div className="grid gap-6 justify-items-center text-center pb-6">
        <div className="flex items-center gap-4">
          <Mascot mood={stars > 0 ? 'cheering' : 'idle'} size={96} />
          <div className="flex items-center gap-2 text-6xl font-extrabold tabular" data-testid="total-stars">
            <StarIcon size={56} /> {stars}
          </div>
        </div>
        <p className="text-xl font-extrabold">
          {streak > 0 ? (
            <>
              <span className="text-nD">
                <Icon name="fire" size={26} />
              </span>{' '}
              {t('kid.stars.streak', { count: streak })} {t('kid.stars.keep')}
            </>
          ) : (
            t('kid.stars.start')
          )}
        </p>
        <ul className="grid grid-cols-4 gap-4 list-none p-0 max-w-lg w-full" data-testid="stickers">
          {BADGE_IDS.map((b) => {
            const earned = badges.includes(b)
            return (
              <li key={b}>
                <button
                  type="button"
                  data-sticker={b}
                  data-earned={earned}
                  onClick={() => setHint(b)}
                  aria-pressed={hint === b}
                  className={`grid justify-items-center gap-1 rounded-[var(--radius)] p-2 w-full ${hint === b ? 'bg-panel' : ''}`}
                >
                  <Sticker id={b} earned={earned} size={68} label={t(`badges.${b}`)} />
                  <span className="text-xs font-bold leading-tight">{t(`badges.${b}`)}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="text-muted min-h-6" aria-live="polite">
          {hint ? t(`badges.${hint}Hint`) : t('kid.stars.tap')}
        </p>
      </div>
    </Page>
  )
}
