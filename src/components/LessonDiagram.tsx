import type { ReactNode } from 'react'
import type { Diagram } from '../engine/lessons'
import { Keyboard, type KeyMark } from '../notation/Keyboard'
import { NoteStaff, RhythmStaff } from '../notation/Staff'
import { useT } from '../app/i18n'

const marks = (midis: number[], mark: KeyMark = 'show') => new Map<number, KeyMark>(midis.map((m) => [m, mark]))
const labels = (pairs: [number, string][]) => new Map<number, string>(pairs)

function Frame({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <figure className="m-0 grid gap-2 rounded-[var(--radius)] bg-panel/60 p-3" data-testid="lesson-diagram">
      {children}
      {caption && <figcaption className="text-sm text-muted">{caption}</figcaption>}
    </figure>
  )
}

/** A curved hand over the keys with finger numbers. */
function PostureArt() {
  const ink = 'var(--color-fg)'
  return (
    <svg viewBox="0 0 320 150" className="w-full max-w-md mx-auto" role="img" aria-label="Curved fingers resting on the keys, numbered 1 to 5">
      <rect x="10" y="112" width="300" height="30" rx="3" fill="var(--color-key-white)" stroke="var(--color-line)" />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={10 + (i + 1) * 30} y1="112" x2={10 + (i + 1) * 30} y2="142" stroke="var(--color-line)" />
      ))}
      <path d="M70 70 Q160 18 250 62 L250 86 Q160 66 70 92 Z" fill="var(--color-panel)" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
      {[
        [85, 'M80 90 Q78 106 88 112'],
        [125, 'M118 80 Q128 96 125 112'],
        [160, 'M152 76 Q166 92 160 112'],
        [195, 'M188 78 Q202 94 195 112'],
        [232, 'M226 84 Q238 100 232 112'],
      ].map(([x, d], i) => (
        <g key={i}>
          <path d={d as string} fill="none" stroke={ink} strokeWidth="9" strokeLinecap="round" />
          <path d={d as string} fill="none" stroke="var(--color-panel)" strokeWidth="5" strokeLinecap="round" />
          <circle cx={x as number} cy="44" r="11" fill="var(--color-accent)" />
          <text x={x as number} y="49" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--color-accent-ink)">
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  )
}

function DynamicsArt() {
  return (
    <svg viewBox="0 0 320 110" className="w-full max-w-md mx-auto" role="img" aria-label="p, mf and f from soft to loud with a growing wedge">
      {[
        ['p', 40, 26],
        ['mf', 150, 34],
        ['f', 270, 44],
      ].map(([txt, x, size]) => (
        <text key={txt} x={x as number} y="56" textAnchor="middle" fontSize={size as number} fontStyle="italic" fontWeight="700" fontFamily="Georgia, 'Times New Roman', serif" fill="var(--color-fg)">
          {txt}
        </text>
      ))}
      <path d="M30 90 L290 78 M30 90 L290 102" stroke="var(--color-accent)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/** Diagrams drawn on a keyboard; the lesson's "Show me" demo lights keys on these instead of adding a second keyboard. */
export const KEYBOARD_DIAGRAMS: Diagram[] = ['keyboard', 'middleC', 'cPosition', 'cPositionLeft', 'gPosition', 'cScale']

export function LessonDiagram({ kind, lit = [] }: { kind: Diagram; lit?: number[] }) {
  const { kid } = useT()
  const kb = (props: Partial<React.ComponentProps<typeof Keyboard>>) => (
    <Keyboard low={48} high={76} kid={kid} interactive={lit.length > 0} height={110} {...props} {...(lit.length ? { highlight: marks(lit, 'due'), focus: lit } : {})} />
  )
  switch (kind) {
    case 'posture':
      return (
        <Frame>
          <PostureArt />
        </Frame>
      )
    case 'keyboard':
      return <Frame>{kb({ showNames: true, highlight: marks([60, 72], 'show') })}</Frame>
    case 'middleC':
      return (
        <Frame>
          {kb({ highlight: marks([60], 'due'), labels: labels([[60, 'C4']]) })}
          <NoteStaff clef="treble" items={[{ midis: [60] }]} kid={kid} label="Middle C on the treble staff" />
        </Frame>
      )
    case 'cPosition':
      return <Frame>{kb({ highlight: marks([60, 62, 64, 65, 67], 'due'), labels: labels([[60, '1'], [62, '2'], [64, '3'], [65, '4'], [67, '5']]) })}</Frame>
    case 'cPositionLeft':
      return <Frame>{kb({ highlight: marks([48, 50, 52, 53, 55], 'dueL'), labels: labels([[48, '5'], [50, '4'], [52, '3'], [53, '2'], [55, '1']]) })}</Frame>
    case 'gPosition':
      return <Frame>{kb({ highlight: marks([67, 69, 71, 72, 74], 'due'), labels: labels([[67, '1'], [69, '2'], [71, '3'], [72, '4'], [74, '5']]) })}</Frame>
    case 'cScale':
      return (
        <Frame>
          {kb({ highlight: marks([60, 62, 64, 65, 67, 69, 71, 72], 'due'), labels: labels([[60, '1'], [62, '2'], [64, '3'], [65, '1'], [67, '2'], [69, '3'], [71, '4'], [72, '5']]) })}
          <NoteStaff clef="treble" items={[60, 62, 64, 65, 67, 69, 71, 72].map((m) => ({ midis: [m] }))} kid={kid} label="C major scale" />
        </Frame>
      )
    case 'durations':
      return (
        <Frame>
          <RhythmStaff items={[{ beats: 1 }, { beats: 1 }, { beats: 2 }, { beats: 4 }]} timeSig={[4, 4]} kid={kid} />
        </Frame>
      )
    case 'treble':
      return (
        <Frame>
          <NoteStaff clef="treble" items={[64, 67, 71, 74, 77].map((m) => ({ midis: [m] }))} kid={kid} label="Treble lines E G B D F" />
          <NoteStaff clef="treble" items={[65, 69, 72, 76].map((m) => ({ midis: [m] }))} kid={kid} label="Treble spaces F A C E" />
        </Frame>
      )
    case 'bass':
      return (
        <Frame>
          <NoteStaff clef="bass" items={[43, 47, 50, 53, 57].map((m) => ({ midis: [m] }))} kid={kid} label="Bass lines G B D F A" />
          <NoteStaff clef="bass" items={[45, 48, 52, 55].map((m) => ({ midis: [m] }))} kid={kid} label="Bass spaces A C E G" />
        </Frame>
      )
    case 'grand':
      return (
        <Frame>
          <NoteStaff clef="treble" items={[{ midis: [60, 64, 67] }]} kid={kid} />
          <NoteStaff clef="bass" items={[{ midis: [48] }]} kid={kid} />
        </Frame>
      )
    case 'dynamics':
      return (
        <Frame>
          <DynamicsArt />
        </Frame>
      )
    case 'intervals':
      return (
        <Frame>
          <NoteStaff clef="treble" items={[[60, 62], [60, 64], [60, 67], [60, 72]].map((m) => ({ midis: m }))} kid={kid} label="2nd, 3rd, 5th and octave from C" />
        </Frame>
      )
    case 'triads':
      return (
        <Frame>
          <NoteStaff clef="treble" items={[[60, 64, 67], [60, 63, 67], [57, 60, 64]].map((m) => ({ midis: m }))} kid={kid} label="C major, C minor, A minor" />
        </Frame>
      )
    case 'timeSigs':
      return (
        <Frame>
          <RhythmStaff items={[{ beats: 1 }, { beats: 0.5 }, { beats: 0.5 }, { beats: 1, rest: true }, { beats: 1 }]} timeSig={[4, 4]} kid={kid} />
          <RhythmStaff items={[{ beats: 2 }, { beats: 1 }]} timeSig={[3, 4]} kid={kid} />
        </Frame>
      )
  }
}
