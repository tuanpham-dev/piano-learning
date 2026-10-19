import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Letter } from '../engine/notes'
import { LETTER_COLOR, inkForLetter } from '../notation/note-colors'
import { Icon, type IconName } from './Icon'

interface BaseProps {
  /** Note whose color fills the bar. */
  note: Letter
  icon?: IconName
  label: ReactNode
  /** Extra content under the label (stars, a difficulty tag). */
  sublabel?: ReactNode
  className?: string
  iconSize?: number
  /** Extra data-* attributes, e.g. { song: 'twinkle' } → data-song="twinkle". */
  data?: Record<string, string>
}

type Props = BaseProps & ({ to: string; onClick?: never; disabled?: never; selected?: never } | { to?: undefined; onClick: () => void; disabled?: boolean; selected?: boolean })

/**
 * A toy-xylophone bar: note-color fill, navy outline and lift (kid mode tokens), a navy or white icon,
 * and the label on a white plate so text always reads navy-on-white whatever the note color.
 */
export function Bar(props: Props) {
  const { note, icon, label, sublabel, className = '', iconSize = 36 } = props
  const body = (
    <>
      {icon && (
        <span style={{ color: inkForLetter(note) }}>
          <Icon name={icon} size={iconSize} weight="bold" />
        </span>
      )}
      <span className="rounded-lg border-2 border-[var(--color-plate-ink)] bg-plate px-2.5 py-0.5 text-plate-ink font-semibold leading-snug" data-plate="">
        {label}
      </span>
      {sublabel}
    </>
  )
  const cls = `lifted grid justify-items-center content-center gap-2 rounded-[var(--radius)] p-3 text-center min-h-[var(--touch)] transition-transform ${className}`
  const style = { background: LETTER_COLOR[note] }
  const dataAttrs = Object.fromEntries(Object.entries(props.data ?? {}).map(([k, v]) => [`data-${k}`, v]))
  if (props.to !== undefined)
    return (
      <Link to={props.to} className={cls} style={style} data-note={note} {...dataAttrs}>
        {body}
      </Link>
    )
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      aria-pressed={props.selected}
      className={`${cls} disabled:opacity-60 ${props.selected ? 'ring-4 ring-ok ring-offset-2 ring-offset-bg' : ''}`}
      style={style}
      data-note={note}
      {...dataAttrs}
    >
      {body}
    </button>
  )
}
