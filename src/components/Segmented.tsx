import type React from 'react'

interface Option<T extends string> {
  value: T
  label: React.ReactNode
}

interface Props<T extends string> {
  id: string
  label?: string
  value: T
  options: Option<T>[]
  onChange: (v: T) => void
  className?: string
}

/** A row of mutually exclusive toggle buttons. */
export function Segmented<T extends string>({ id, label, value, options, onChange, className = '' }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} id={id} className={`inline-flex flex-wrap rounded-[var(--radius)] border border-line overflow-hidden ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`inline-flex items-center gap-1.5 px-3 min-h-[var(--seg-h)] min-w-[var(--seg-h)] justify-center text-sm ${o.value === value ? 'bg-accent text-accent-ink font-semibold' : 'bg-bg hover:bg-panel'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
