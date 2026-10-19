import type { ReactNode } from 'react'

export type IconName =
  | 'piano'
  | 'note'
  | 'clef'
  | 'ear'
  | 'drum'
  | 'book'
  | 'map'
  | 'chords'
  | 'chart'
  | 'trophy'
  | 'gear'
  | 'speaker'
  | 'turtle'
  | 'star'
  | 'fire'
  | 'lock'
  | 'mic'
  | 'play'
  | 'stop'
  | 'restart'
  | 'medal'
  | 'wrench'
  | 'child'
  | 'adult'
  | 'plus'

/** Stroke icons on a 24-unit grid, drawn in currentColor. */
const PATHS: Record<IconName, ReactNode> = {
  piano: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M7.5 5v14M12 5v14M16.5 5v14" />
      <path d="M6 5v7h3V5M10.5 5v7h3V5M15 5v7h3V5" fill="currentColor" stroke="none" />
    </>
  ),
  note: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" fill="currentColor" />
      <circle cx="17" cy="16" r="3" fill="currentColor" />
    </>
  ),
  clef: (
    <path d="M12.5 21c-1.8 1.2-4 .3-4-1.6 0-1.4 1.6-2 2.5-1.2M12 2c2.5 2.2 2.4 5.4-1 8.1-3 2.4-4.6 4.2-4 6.8.7 2.7 4.3 3.6 6.6 2 2-1.4 1.8-4.6-.6-5.4-2.3-.7-4.1 1-3.6 3M12 2c-.8 2.4-.7 6.6 1 19" />
  ),
  ear: <path d="M7 9a5 5 0 0 1 10 0c0 3-2.5 4-3.3 6-.7 1.8-1.4 4-3.7 4a3 3 0 0 1-3-3M10 9a2 2 0 0 1 4 0c0 1.2-1 1.6-1.5 2.4" />,
  drum: (
    <>
      <ellipse cx="12" cy="9" rx="8" ry="3" />
      <path d="M4 9v7c0 1.7 3.6 3 8 3s8-1.3 8-3V9M6 11.5l2 7M18 11.5l-2 7M12 12v7" />
      <path d="M15 3l-3 5M20 4l-6 4" />
    </>
  ),
  book: <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5z" />,
  map: (
    <>
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
      <path d="M9 4v14M15 6v14" />
      <path d="M11.5 10.5l1.5 1.5 3-3" strokeWidth="2.2" />
    </>
  ),
  chords: (
    <>
      <path d="M3 7h18M3 11h18M3 15h18" opacity=".45" />
      <ellipse cx="12" cy="7" rx="2.6" ry="1.9" fill="currentColor" />
      <ellipse cx="12" cy="11" rx="2.6" ry="1.9" fill="currentColor" />
      <ellipse cx="12" cy="15" rx="2.6" ry="1.9" fill="currentColor" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <rect x="5.5" y="12" width="3" height="6" rx=".6" />
      <rect x="10.5" y="7" width="3" height="11" rx=".6" />
      <rect x="15.5" y="10" width="3" height="8" rx=".6" />
    </>
  ),
  trophy: <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.6 4M16 6h3.5a3 3 0 0 1-3.6 4M12 13v4M8.5 20h7M9.5 17h5v3h-5z" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4L5.3 5.3" />
      <circle cx="12" cy="12" r="6.5" />
    </>
  ),
  speaker: <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />,
  turtle: (
    <>
      <path d="M4 15c0-4 3.6-7 8-7s8 3 8 7z" />
      <path d="M8.5 9.5l2 5.5M15.5 9.5l-2 5.5M5.5 12.5h13" opacity=".6" />
      <path d="M20 13.5c1.4-.2 2.2.6 2 1.6-.2.9-1.1 1.3-2 .9M6.5 15l-1 3M17.5 15l1 3" />
    </>
  ),
  star: <path d="M12 3l2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.8z" fill="currentColor" />,
  fire: <path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.6 2.8-5.4 3.6-8.5 1.6 1.3 2.2 3 2.2 4.6 1.2-.8 1.9-2.4 1.9-4.1 3 2 5.3 5.1 5.3 8 0 3.4-2.6 6-6.5 6z" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <circle cx="12" cy="15.5" r="1.4" fill="currentColor" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </>
  ),
  play: <path d="M7 4.5v15l12-7.5z" fill="currentColor" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />,
  restart: <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v4.5H9" />,
  medal: (
    <>
      <path d="M8 3l3 6M16 3l-3 6" />
      <circle cx="12" cy="14.5" r="5.5" />
      <path d="M12 11.5l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" fill="currentColor" stroke="none" />
    </>
  ),
  wrench: <path d="M14.5 4.5a4.5 4.5 0 0 0-5.6 5.8L3.5 15.7a2 2 0 0 0 2.8 2.8l5.4-5.4a4.5 4.5 0 0 0 5.8-5.6l-2.7 2.7-2.6-.5-.5-2.6z" />,
  child: (
    <>
      <circle cx="12" cy="9" r="5.5" />
      <path d="M9.5 8.5h.01M14.5 8.5h.01" strokeWidth="2.6" />
      <path d="M10 11.5c1.2 1 2.8 1 4 0M9 3.8c1.2 1.5 3.6 1.9 5.5.6M6 21c.7-3 3.1-5 6-5s5.3 2 6 5" />
    </>
  ),
  adult: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c.8-4 3.8-6.5 7.5-6.5s6.7 2.5 7.5 6.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
}

interface Props {
  name: IconName
  size?: number
  className?: string
  /** Accessible name; omit for decorative icons next to text. */
  label?: string
}

export function Icon({ name, size = 20, className = '', label }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 align-[-0.15em] ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {PATHS[name]}
    </svg>
  )
}
