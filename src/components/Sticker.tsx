import type { ReactNode } from 'react'
import type { BadgeId } from '../engine/badges'

const INK = '#3b2a12'

const ART: Record<BadgeId, { bg: string; draw: ReactNode }> = {
  'first-song': {
    bg: '#e63946',
    draw: (
      <g fill="#fff">
        <ellipse cx="25" cy="44" rx="7" ry="5.5" transform="rotate(-20 25 44)" />
        <rect x="30" y="16" width="3.5" height="28" rx="1.5" />
        <path d="M33.5 16 q10 4 10 13 q-4 -6 -10 -6 z" />
      </g>
    ),
  },
  'streak-7': {
    bg: '#f4811f',
    draw: (
      <g>
        <path
          d="M32 12 C40 24 46 30 44 40 C42 50 22 52 20 40 C19 33 24 30 26 24 C28 30 30 31 32 32 C34 25 32 18 32 12 Z"
          fill="#f6c90e"
          stroke={INK}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <text x="32" y="45" textAnchor="middle" fontSize="13" fontWeight="800" fill={INK} fontFamily="system-ui">
          7
        </text>
      </g>
    ),
  },
  'drill-100': {
    bg: '#3fb34f',
    draw: (
      <g>
        <g stroke="#fff" strokeWidth="2">
          {[22, 28, 34, 40, 46].map((y) => (
            <line key={y} x1="12" x2="52" y1={y} y2={y} />
          ))}
        </g>
        <ellipse cx="32" cy="31" rx="6" ry="4.5" fill={INK} transform="rotate(-20 32 31)" />
        <text x="32" y="58" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="system-ui">
          100
        </text>
      </g>
    ),
  },
  'three-star': {
    bg: '#2d5fd1',
    draw: (
      <g fill="#f6c90e" stroke={INK} strokeWidth="1.5" strokeLinejoin="round">
        <path d="M32 12l4 8.5 9.2 1.1-6.8 6.4 1.8 9.2L32 32.7l-8.2 4.5 1.8-9.2-6.8-6.4 9.2-1.1z" />
        <path d="M17 36l2.4 5 5.4.7-4 3.7 1 5.4-4.8-2.6-4.8 2.6 1-5.4-4-3.7 5.4-.7z" />
        <path d="M47 36l2.4 5 5.4.7-4 3.7 1 5.4-4.8-2.6-4.8 2.6 1-5.4-4-3.7 5.4-.7z" />
      </g>
    ),
  },
  'all-modes': {
    bg: '#1fa8b5',
    draw: (
      <g>
        <circle cx="32" cy="32" r="16" fill="#fff" stroke={INK} strokeWidth="2.5" />
        <path d="M32 18 L36 32 L32 46 L28 32 Z" fill="#e63946" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M32 32 L28 32 L32 46 Z" fill="#fff" />
        <circle cx="32" cy="32" r="2.5" fill={INK} />
      </g>
    ),
  },
  'ten-songs': {
    bg: '#8e44ad',
    draw: (
      <g fill="#fff">
        <rect x="19" y="18" width="3" height="22" rx="1.2" />
        <rect x="41" y="14" width="3" height="22" rx="1.2" />
        <path d="M19 18 L44 14 L44 19 L19 23 Z" />
        <ellipse cx="16" cy="40" rx="6" ry="4.5" transform="rotate(-20 16 40)" />
        <ellipse cx="38" cy="36" rx="6" ry="4.5" transform="rotate(-20 38 36)" />
        <text x="32" y="58" textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="system-ui">
          10
        </text>
      </g>
    ),
  },
  'fifty-drills': {
    bg: '#f6c90e',
    draw: (
      <g>
        <circle cx="32" cy="30" r="15" fill="#fff" stroke={INK} strokeWidth="2.5" />
        <circle cx="32" cy="30" r="9" fill="#e63946" stroke={INK} strokeWidth="2" />
        <circle cx="32" cy="30" r="3.5" fill="#fff" stroke={INK} strokeWidth="1.5" />
        <text x="32" y="58" textAnchor="middle" fontSize="11" fontWeight="800" fill={INK} fontFamily="system-ui">
          50
        </text>
      </g>
    ),
  },
  'all-lessons': {
    bg: '#3b2a12',
    draw: (
      <g>
        <path d="M10 26 L32 16 L54 26 L32 36 Z" fill="#f6c90e" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        <path d="M20 30 V40 C20 44 44 44 44 40 V30 L32 36 Z" fill="#f6c90e" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        <path d="M50 27 V40" stroke="#fff" strokeWidth="2" />
        <circle cx="50" cy="42" r="2.5" fill="#e63946" />
      </g>
    ),
  },
}

/** A round badge sticker; greyed out until earned. */
export function Sticker({ id, earned, size = 64, label }: { id: BadgeId; earned: boolean; size?: number; label?: string }) {
  const art = ART[id]
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={label ?? id} style={{ filter: earned ? undefined : 'grayscale(1)', opacity: earned ? 1 : 0.35 }}>
      <circle cx="32" cy="32" r="30" fill={art.bg} stroke="#fff" strokeWidth="3" />
      <circle cx="32" cy="32" r="30" fill="none" stroke={INK} strokeOpacity=".15" strokeWidth="1" />
      {art.draw}
    </svg>
  )
}
