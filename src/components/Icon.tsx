import {
  ArrowCounterClockwise,
  ArrowUUpLeft,
  ArrowUUpRight,
  Check,
  Copy,
  DotsThree,
  Export,
  PencilSimple,
  Record,
  Sparkle,
  Trash,
  UploadSimple,
  Baby,
  BookOpen,
  ChartBar,
  CirclesThree,
  Compass,
  Ear,
  Fire,
  GearSix,
  GraduationCap,
  LockSimple,
  MapTrifold,
  Medal,
  Metronome,
  Microphone,
  MusicNote,
  MusicNoteSimple,
  MusicNotes,
  PersonSimpleWalk,
  PianoKeys,
  Play,
  Plus,
  SpeakerHigh,
  Star,
  Stop,
  Target,
  Trophy,
  User,
  Wrench,
  type Icon as PhosphorIcon,
  type IconWeight,
} from '@phosphor-icons/react'
import { useProgress } from '../store/progress'

const ICONS = {
  piano: PianoKeys,
  note: MusicNotes,
  noteOne: MusicNote,
  clef: MusicNoteSimple,
  ear: Ear,
  drum: Metronome,
  book: BookOpen,
  map: MapTrifold,
  chords: CirclesThree,
  chart: ChartBar,
  trophy: Trophy,
  gear: GearSix,
  speaker: SpeakerHigh,
  walk: PersonSimpleWalk,
  star: Star,
  fire: Fire,
  lock: LockSimple,
  mic: Microphone,
  play: Play,
  stop: Stop,
  restart: ArrowCounterClockwise,
  medal: Medal,
  wrench: Wrench,
  child: Baby,
  adult: User,
  plus: Plus,
  compass: Compass,
  target: Target,
  graduate: GraduationCap,
  pencil: PencilSimple,
  record: Record,
  sparkle: Sparkle,
  export: Export,
  upload: UploadSimple,
  copy: Copy,
  trash: Trash,
  undo: ArrowUUpLeft,
  redo: ArrowUUpRight,
  more: DotsThree,
  check: Check,
} satisfies Record<string, PhosphorIcon>

export type IconName = keyof typeof ICONS

/** Icons that read best solid whatever the mode. */
const SOLID: IconName[] = ['star', 'play', 'stop', 'record']

interface Props {
  name: IconName
  size?: number
  className?: string
  /** Accessible name; omit for decorative icons next to text. */
  label?: string
  /** Defaults to bold in kid mode and regular in adult mode. */
  weight?: IconWeight
}

/** Phosphor icons, weighted by mode: chunky for kids, light for adults. */
export function Icon({ name, size = 20, className = '', label, weight }: Props) {
  const kid = useProgress((s) => s.mode === 'kid')
  const Glyph = ICONS[name]
  const w: IconWeight = weight ?? (SOLID.includes(name) ? 'fill' : kid ? 'bold' : 'regular')
  return (
    <Glyph
      size={size}
      weight={w}
      className={`inline-block shrink-0 align-[-0.15em] ${className}`}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  )
}
