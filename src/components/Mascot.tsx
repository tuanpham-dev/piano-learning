export type MascotMood = 'idle' | 'thinking' | 'cheering' | 'sleeping'

interface Props {
  mood?: MascotMood
  size?: number
  className?: string
  label?: string
}

/** Miu the piano cat. Pure inline SVG; animation classes are disabled under reduced motion by theme.css. */
export function Mascot({ mood = 'idle', size = 72, className = '', label }: Props) {
  const ink = '#3b2a12'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={label ?? `Miu the cat, ${mood}`}
      className={`mascot mascot-${mood} ${className}`}
      style={{ overflow: 'visible' }}
    >
      <style>{`
        .mascot-idle .m-eyes { animation: m-blink 4s infinite; transform-origin: 50px 52px; }
        .mascot-cheering { animation: m-bounce .6s ease-out 2; }
        .mascot-thinking .m-head { animation: m-tilt 1.2s ease-in-out infinite alternate; transform-origin: 50px 90px; }
        @keyframes m-blink { 0%, 92%, 100% { transform: scaleY(1) } 95% { transform: scaleY(.1) } }
        @keyframes m-bounce { 0%,100% { transform: translateY(0) } 40% { transform: translateY(-10px) } }
        @keyframes m-tilt { from { transform: rotate(-4deg) } to { transform: rotate(4deg) } }
        @media (prefers-reduced-motion: reduce) { .mascot, .mascot * { animation: none !important; } }
      `}</style>
      {mood === 'cheering' && (
        <g fill="#f6c90e" stroke={ink} strokeWidth="3" strokeLinecap="round">
          <path d="M18 62 Q6 44 12 30" fill="none" />
          <path d="M82 62 Q94 44 88 30" fill="none" />
          <circle cx="12" cy="28" r="6" />
          <circle cx="88" cy="28" r="6" />
        </g>
      )}
      <g className="m-head">
        <path d="M22 40 L26 12 L44 28 Z" fill="#f6c90e" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        <path d="M78 40 L74 12 L56 28 Z" fill="#f6c90e" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        <path d="M28 20 L31 32 L38 28 Z" fill="#f4a3b4" />
        <path d="M72 20 L69 32 L62 28 Z" fill="#f4a3b4" />
        <ellipse cx="50" cy="56" rx="34" ry="30" fill="#f6c90e" stroke={ink} strokeWidth="3" />
        <path d="M36 30 Q40 36 38 42 M50 27 V38 M64 30 Q60 36 62 42" stroke="#e0a800" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="30" cy="66" r="6" fill="#f4a3b4" opacity=".7" />
        <circle cx="70" cy="66" r="6" fill="#f4a3b4" opacity=".7" />
        <g className="m-eyes" stroke={ink} strokeWidth="3" strokeLinecap="round" fill={ink}>
          {mood === 'sleeping' ? (
            <>
              <path d="M32 54 Q38 58 44 54" fill="none" />
              <path d="M56 54 Q62 58 68 54" fill="none" />
            </>
          ) : mood === 'cheering' ? (
            <>
              <path d="M32 56 Q38 48 44 56" fill="none" />
              <path d="M56 56 Q62 48 68 56" fill="none" />
            </>
          ) : mood === 'thinking' ? (
            <>
              <circle cx="40" cy="50" r="4" stroke="none" />
              <circle cx="62" cy="50" r="4" stroke="none" />
            </>
          ) : (
            <>
              <circle cx="38" cy="53" r="4.5" stroke="none" />
              <circle cx="62" cy="53" r="4.5" stroke="none" />
            </>
          )}
        </g>
        <path d="M47 62 L53 62 L50 66 Z" fill={ink} />
        {mood === 'cheering' ? (
          <path d="M40 68 Q50 82 60 68 Z" fill="#c0392b" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
        ) : mood === 'thinking' ? (
          <path d="M44 72 Q50 69 56 72" stroke={ink} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M42 68 Q46 73 50 68 Q54 73 58 68" stroke={ink} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}
        <path d="M18 60 H30 M18 66 H30 M70 60 H82 M70 66 H82" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
      </g>
      {mood === 'thinking' && (
        <g fill="#ffffff" stroke={ink} strokeWidth="2">
          <circle cx="86" cy="24" r="3" />
          <circle cx="92" cy="12" r="5" />
          <text x="92" y="16" fontSize="9" textAnchor="middle" fill={ink} stroke="none" fontWeight="700">
            ?
          </text>
        </g>
      )}
      {mood === 'sleeping' && (
        <text x="84" y="22" fontSize="16" fontWeight="800" fill={ink}>
          z
        </text>
      )}
    </svg>
  )
}
