interface Props {
  count: number
  of?: number
  size?: number
  className?: string
}

function StarShape({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
        fill={filled ? 'var(--color-nE)' : 'none'}
        stroke={filled ? 'color-mix(in srgb, var(--color-nE) 70%, var(--color-fg))' : 'var(--color-line)'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** A row of 1–3 rating stars. */
export function Stars({ count, of = 3, size = 22, className = '' }: Props) {
  return (
    <span className={`inline-flex gap-0.5 align-middle ${className}`} role="img" aria-label={`${count} of ${of} stars`}>
      {Array.from({ length: of }, (_, i) => (
        <StarShape key={i} filled={i < count} size={size} />
      ))}
    </span>
  )
}

export function StarIcon({ size = 20 }: { size?: number }) {
  return <StarShape filled size={size} />
}
