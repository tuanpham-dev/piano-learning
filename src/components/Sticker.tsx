import type { BadgeId } from '../engine/badges'
import type { Letter } from '../engine/notes'
import { LETTER_COLOR, inkForLetter } from '../notation/note-colors'
import { Icon, type IconName } from './Icon'

/** Each badge: a note color, a glyph, and an optional number. */
const ART: Record<BadgeId, { note: Letter; icon: IconName; count?: string; triple?: boolean }> = {
  'first-song': { note: 'C', icon: 'noteOne' },
  'streak-7': { note: 'D', icon: 'fire', count: '7' },
  'drill-100': { note: 'F', icon: 'clef', count: '100' },
  'three-star': { note: 'A', icon: 'star', triple: true },
  'all-modes': { note: 'G', icon: 'compass' },
  'ten-songs': { note: 'B', icon: 'note', count: '10' },
  'fifty-drills': { note: 'E', icon: 'target', count: '50' },
  'all-lessons': { note: 'C', icon: 'graduate' },
}

/** A round sticker in a note color with a navy outline and a white inner ring; greyed until earned. */
export function Sticker({ id, earned, size = 64, label }: { id: BadgeId; earned: boolean; size?: number; label?: string }) {
  const a = ART[id]
  const ink = inkForLetter(a.note)
  const glyph = Math.round(size * (a.count ? 0.38 : 0.48))
  return (
    <span
      role="img"
      aria-label={label ?? id}
      data-sticker-art={id}
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: LETTER_COLOR[a.note],
        border: `${Math.max(2, Math.round(size / 22))}px solid #14213d`,
        boxShadow: `inset 0 0 0 ${Math.max(2, Math.round(size / 18))}px #ffffff, 0 ${Math.max(2, Math.round(size / 20))}px 0 #14213d`,
        color: ink,
        filter: earned ? undefined : 'grayscale(1)',
        opacity: earned ? 1 : 0.35,
      }}
    >
      <span className="grid justify-items-center leading-none" style={{ gap: size * 0.02 }}>
        {a.triple ? (
          <span className="flex items-end">
            <Icon name="star" size={glyph * 0.42} weight="fill" />
            <Icon name="star" size={glyph * 0.56} weight="fill" />
            <Icon name="star" size={glyph * 0.42} weight="fill" />
          </span>
        ) : (
          <Icon name={a.icon} size={glyph} weight="bold" />
        )}
        {a.count && (
          // Part of the sticker art (the sticker's label names it), drawn as an image rather than text.
          <svg width={size * 0.5} height={Math.max(10, size * 0.22)} viewBox="0 0 50 22" aria-hidden="true">
            <text x="25" y="17" textAnchor="middle" fontSize="20" fontWeight="700" fontFamily="Lexend, system-ui, sans-serif" fill="currentColor">
              {a.count}
            </text>
          </svg>
        )}
      </span>
    </span>
  )
}
