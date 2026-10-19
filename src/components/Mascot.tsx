import { LETTER_HEX } from '../notation/note-colors'
import { useDoNote } from '../store/doNote'

export type MascotMood = 'idle' | 'cheering' | 'thinking' | 'sleeping'

interface Props {
  mood?: MascotMood
  size?: number
  className?: string
  label?: string
  /** Bow-tie color; defaults to the note being played or asked for (red C at rest). */
  color?: string
}

const INK = '#14213d'
const FUR = '#f5b942'
const LIGHT = '#fcd98a'
const DARK = '#e09a26'
const PINK = '#f08a9c'

function Eyes({ mood }: { mood: MascotMood }) {
  if (mood === 'cheering') return <path d="M39 57 Q45 49 51 57 M69 57 Q75 49 81 57" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />
  if (mood === 'sleeping') return <path d="M39 55 Q45 60 51 55 M69 55 Q75 60 81 55" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
  const up = mood === 'thinking'
  return (
    <g className="miu-eyes">
      {[45, 75].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={55} rx={4.5} ry={5.5} fill={INK} />
          <circle cx={x + (up ? 3 : 1.6)} cy={up ? 50.3 : 52.8} r={1.8} fill="#fff" />
        </g>
      ))}
    </g>
  )
}

function Mouth({ mood }: { mood: MascotMood }) {
  if (mood === 'cheering')
    return (
      <>
        <path d="M53 69 Q60 81 67 69 Z" fill="#c83a4b" />
        <path d="M56 74 Q60 78 64 74" fill="#f28a9a" />
      </>
    )
  if (mood === 'thinking') return <path d="M56 72 Q61 70 65 71" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
  if (mood === 'sleeping') return <ellipse cx="60" cy="72" rx="2.6" ry="2" fill={INK} />
  return <path d="M54 70 Q57 74 60 70 Q63 74 66 70" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
}

/** Miu the cat. The bow tie takes the color of the note being played or asked for, so Miu still teaches the note colors. */
export function Mascot({ mood = 'idle', size = 72, className = '', label, color }: Props) {
  const letter = useDoNote((s) => s.letter)
  const bow = color ?? LETTER_HEX[letter]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={label ?? `Miu the cat, ${mood}`}
      className={`mascot mascot-${mood} ${className}`}
      style={{ overflow: 'visible' }}
      data-color={bow}
    >
      <style>{`
        .mascot .miu-body { transform-origin: 60px 112px; }
        .mascot-idle .miu-tail { animation: miu-tail 3s ease-in-out infinite; transform-origin: 90px 104px; }
        .mascot-idle .miu-eyes { animation: miu-blink 4.5s infinite; transform-origin: 60px 55px; }
        .mascot-cheering .miu-body { animation: miu-hop .55s ease-out 2; }
        .mascot-thinking .miu-head { animation: miu-tilt 1.4s ease-in-out infinite alternate; transform-origin: 60px 80px; }
        .mascot-sleeping .miu-body { animation: miu-breathe 3s ease-in-out infinite; }
        .mascot .miu-bow { transition: fill .25s; }
        @keyframes miu-tail { 0%,100% { transform: rotate(0) } 50% { transform: rotate(-8deg) } }
        @keyframes miu-blink { 0%, 93%, 100% { transform: scaleY(1) } 96% { transform: scaleY(.1) } }
        @keyframes miu-hop { 0%,100% { transform: translateY(0) } 40% { transform: translateY(-10px) } }
        @keyframes miu-tilt { from { transform: rotate(-4deg) } to { transform: rotate(4deg) } }
        @keyframes miu-breathe { 0%,100% { transform: scale(1) } 50% { transform: scale(1.02, .98) } }
        @media (prefers-reduced-motion: reduce) { .mascot, .mascot * { animation: none !important; } }
      `}</style>
      <ellipse cx="60" cy="114" rx="30" ry="4" fill={INK} opacity=".12" />
      <g className="miu-body">
        <path className="miu-tail" d="M90 104 C112 104 114 80 100 74" stroke={DARK} strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M28 112 C26 86 40 78 60 78 C80 78 94 86 92 112 Z" fill={FUR} />
        <ellipse cx="60" cy="100" rx="17" ry="12" fill={LIGHT} />
        {mood === 'cheering' ? (
          <>
            <path d="M34 92 Q22 74 26 62 M86 92 Q98 74 94 62" stroke={FUR} strokeWidth="10" fill="none" strokeLinecap="round" />
            <circle cx="26" cy="61" r="6" fill={LIGHT} />
            <circle cx="94" cy="61" r="6" fill={LIGHT} />
          </>
        ) : (
          <>
            <ellipse cx="49" cy="111" rx="9" ry="6" fill={LIGHT} />
            <ellipse cx="71" cy="111" rx="9" ry="6" fill={LIGHT} />
          </>
        )}
        <g className="miu-head">
          <path d="M27 46 L24 13 Q25 9 29 11 L52 28 Z M93 46 L96 13 Q95 9 91 11 L68 28 Z" fill={FUR} stroke={FUR} strokeWidth="5" strokeLinejoin="round" />
          <path d="M31 36 L30 19 L44 29 Z M89 36 L90 19 L76 29 Z" fill={PINK} opacity=".85" />
          <ellipse cx="60" cy="55" rx="38" ry="32" fill={FUR} />
          <path d="M52 25 Q53 32 51 36 M60 24 V35 M68 25 Q67 32 69 36" stroke={DARK} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <ellipse cx="60" cy="68" rx="18" ry="12" fill={LIGHT} />
          <Eyes mood={mood} />
          <path d="M56.5 63 h7 q-3.5 4.5 -3.5 4.5 q0 0 -3.5 -4.5z" fill={PINK} stroke={PINK} strokeWidth="1.5" strokeLinejoin="round" />
          <Mouth mood={mood} />
          <ellipse cx="34" cy="65" rx="6" ry="4" fill={PINK} opacity=".45" />
          <ellipse cx="86" cy="65" rx="6" ry="4" fill={PINK} opacity=".45" />
          <path d="M22 60 l-10 -2 M22 66 l-10 2 M98 60 l10 -2 M98 66 l10 2" stroke={DARK} strokeWidth="1.8" strokeLinecap="round" opacity=".7" />
        </g>
        {/* Bow tie in the current note's color */}
        <g className="miu-bow" style={{ fill: bow }}>
          <path d="M60 86 L45 79 Q41 86 45 93 Z M60 86 L75 79 Q79 86 75 93 Z" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="60" cy="86" r="4.2" stroke={INK} strokeWidth="2" />
        </g>
      </g>
      {mood === 'thinking' && (
        <g>
          <circle cx="95" cy="31" r="2.6" fill="#fff" stroke={INK} strokeWidth="1.6" />
          <circle cx="104" cy="18" r="9" fill="#fff" stroke={INK} strokeWidth="1.8" />
          <text x="104" y="22.5" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="13" textAnchor="middle" fill={INK}>
            ?
          </text>
        </g>
      )}
      {mood === 'cheering' && (
        <g>
          <path transform="translate(14 26)" d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z" fill="#f6c90e" />
          <path transform="translate(108 30) scale(.8)" d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z" fill={bow} />
        </g>
      )}
      {mood === 'sleeping' && (
        <text x="92" y="22" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="16" fill={INK} opacity=".7">
          z
          <tspan dx="2" dy="-8" fontSize="11">
            z
          </tspan>
        </text>
      )}
    </svg>
  )
}
