import { LETTER_HEX } from '../notation/note-colors'
import { useDoNote } from '../store/doNote'

export type MascotMood = 'idle' | 'cheering' | 'thinking' | 'sleeping'

interface Props {
  mood?: MascotMood
  size?: number
  className?: string
  label?: string
  /** Note color; defaults to the note Do is following (red C at rest). */
  color?: string
}

const INK = '#14213d'

function Eyes({ mood }: { mood: MascotMood }) {
  if (mood === 'cheering') return <path d="M34 84 Q40 76 46 84 M56 84 Q62 76 68 84" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />
  if (mood === 'sleeping') return <path d="M34 82 Q40 87 46 82 M56 82 Q62 87 68 82" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
  const up = mood === 'thinking'
  return (
    <g className="do-eyes">
      {[40, 62].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={82} rx={4.1} ry={5} fill={INK} />
          <circle cx={x + (up ? 3 : 1.6)} cy={up ? 77.5 : 79.8} r={1.6} fill="#fff" />
        </g>
      ))}
    </g>
  )
}

function Mouth({ mood }: { mood: MascotMood }) {
  if (mood === 'cheering')
    return (
      <>
        <path d="M44 93 Q51 105 58 93 Z" fill="#c83a4b" />
        <path d="M47 98 Q51 102 55 98" fill="#f28a9a" />
      </>
    )
  if (mood === 'thinking') return <path d="M47 96 Q52 94 56 95" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
  if (mood === 'sleeping') return <ellipse cx="51" cy="96" rx="3" ry="2.4" fill={INK} />
  return <path d="M45 94 Q48 98 51 94 Q54 98 57 94" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
}

/** Do the note: a quarter note whose head is the face. Takes the color of the note being played (R3c). */
export function Mascot({ mood = 'idle', size = 72, className = '', label, color }: Props) {
  const letter = useDoNote((s) => s.letter)
  const fill = color ?? LETTER_HEX[letter]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={label ?? `Do the note, ${mood}`}
      className={`mascot mascot-${mood} ${className}`}
      style={{ overflow: 'visible' }}
      data-color={fill}
    >
      <style>{`
        .mascot .do-body { transform-origin: 52px 110px; transition: fill .25s; }
        .mascot-idle .do-body { animation: do-sway 5s ease-in-out infinite; }
        .mascot-cheering .do-body { animation: do-hop .55s ease-out 2; }
        .mascot-thinking .do-body { animation: do-tilt 1.4s ease-in-out infinite alternate; }
        .mascot-sleeping .do-body { animation: do-breathe 3s ease-in-out infinite; }
        .mascot-idle .do-eyes { animation: do-blink 4.5s infinite; transform-origin: 51px 82px; }
        @keyframes do-sway { 0%,100% { transform: rotate(0) } 50% { transform: rotate(-3deg) } }
        @keyframes do-hop { 0%,100% { transform: translateY(0) } 40% { transform: translateY(-10px) } }
        @keyframes do-tilt { from { transform: rotate(-4deg) } to { transform: rotate(4deg) } }
        @keyframes do-breathe { 0%,100% { transform: scale(1) } 50% { transform: scale(1.03, .97) } }
        @keyframes do-blink { 0%, 93%, 100% { transform: scaleY(1) } 96% { transform: scaleY(.1) } }
        @media (prefers-reduced-motion: reduce) { .mascot, .mascot * { animation: none !important; } }
      `}</style>
      <ellipse cx="46" cy="113" rx="22" ry="4" fill={INK} opacity=".12" />
      <g className="do-body" style={{ fill }}>
        <g transform={mood === 'sleeping' ? 'rotate(10 81 70)' : undefined}>
          <path d="M78 74 V12 Q78 8 82 9 Q104 16 104 36 Q104 46 98 52 Q100 30 84 26 V74 Z" />
        </g>
        {mood === 'cheering' ? (
          <path d="M22 84 Q8 70 12 56 M82 92 Q100 86 104 70" stroke={fill} strokeWidth="7" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M22 90 Q12 96 14 104" stroke={fill} strokeWidth="7" fill="none" strokeLinecap="round" />
        )}
        <g transform="rotate(-18 52 84)">
          <ellipse cx="52" cy="84" rx="33" ry="25" />
          <ellipse cx="44" cy="74" rx="14" ry="6" fill="#fff" opacity=".25" />
        </g>
        <Eyes mood={mood} />
        <Mouth mood={mood} />
        <ellipse cx="30" cy="92" rx="5" ry="3.4" fill="#fff" opacity=".35" />
        <ellipse cx="72" cy="86" rx="5" ry="3.4" fill="#fff" opacity=".35" />
      </g>
      {mood === 'thinking' && (
        <g>
          <circle cx="95" cy="79" r="2.6" fill="#fff" stroke={INK} strokeWidth="1.6" />
          <circle cx="104" cy="66" r="9" fill="#fff" stroke={INK} strokeWidth="1.8" />
          <text x="104" y="70.5" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="13" textAnchor="middle" fill={INK}>
            ?
          </text>
        </g>
      )}
      {mood === 'cheering' && (
        <g>
          <path transform="translate(16 30)" d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z" fill="#f6c90e" />
          <g transform="translate(36 30) scale(.9)" fill={fill}>
            <ellipse cx="0" cy="0" rx="4.5" ry="3.4" transform="rotate(-20)" />
            <rect x="3.2" y="-15" width="2" height="15" rx="1" />
          </g>
        </g>
      )}
      {mood === 'sleeping' && (
        <text x="22" y="46" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="16" fill={INK} opacity=".7">
          z
          <tspan dx="2" dy="-8" fontSize="11">
            z
          </tspan>
        </text>
      )}
    </svg>
  )
}
