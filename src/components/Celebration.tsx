import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { playChime } from '../audio/chime'
import { prefersReducedMotion } from '../hooks/useReducedMotion'
import { useT } from '../app/i18n'
import { Mascot } from './Mascot'
import { Sticker } from './Sticker'
import type { BadgeId } from '../engine/badges'

const CONFETTI_COLORS = ['#e63946', '#f4811f', '#f6c90e', '#3fb34f', '#1fa8b5', '#2d5fd1', '#8e44ad']

/** Fires confetti (unless reduced motion) and the chime once on mount (R3e). */
export function useCelebrate(active: boolean, sticker = false): void {
  useEffect(() => {
    if (!active) return
    playChime(sticker ? 'sticker' : 'success')
    if (prefersReducedMotion()) return
    void confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: CONFETTI_COLORS, disableForReducedMotion: true })
    const t = setTimeout(() => void confetti({ particleCount: 60, spread: 120, origin: { y: 0.5 }, colors: CONFETTI_COLORS, disableForReducedMotion: true }), 350)
    return () => clearTimeout(t)
  }, [active, sticker])
}

/** Kid-mode celebration block: cheering mascot, chime, confetti, and any new stickers. */
export function Celebration({ stickers = [], children }: { stickers?: string[]; children?: React.ReactNode }) {
  const { t } = useT()
  useCelebrate(true, stickers.length > 0)
  return (
    <div className="grid justify-items-center gap-3 text-center" data-testid="celebration">
      <Mascot mood="cheering" size={110} className="anim-bounce-in" />
      {children}
      {stickers.map((id) => (
        <div key={id} className="flex items-center gap-3 rounded-[var(--radius)] bg-panel px-4 py-2 anim-bounce-in">
          <Sticker id={id as BadgeId} earned size={56} />
          <strong>{t('kid.result.newSticker', { name: t(`badges.${id}`) })}</strong>
        </div>
      ))}
    </div>
  )
}
