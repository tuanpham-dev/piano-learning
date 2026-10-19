import { useState, type ReactNode } from 'react'

interface Props {
  /** Always-visible handle text, e.g. the current settings. */
  summary: ReactNode
  label: string
  children: ReactNode
}

/** Collapsible panel pinned to the bottom of a playing screen on narrow layouts. */
export function BottomSheet({ summary, label, children }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="sticky bottom-0 z-20 -mx-[max(16px,env(safe-area-inset-left,0px))] border-t-2 border-line bg-panel"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-[max(16px,env(safe-area-inset-left,0px))] min-h-12 text-left"
      >
        <strong className="whitespace-nowrap">
          {open ? '▼' : '▲'} {label}
        </strong>
        <span className="min-w-0 truncate text-sm text-muted">{summary}</span>
      </button>
      {open && <div className="max-h-[60vh] overflow-y-auto px-[max(16px,env(safe-area-inset-left,0px))] pb-3 grid gap-3">{children}</div>}
    </div>
  )
}

/** Wrapper class for a page's bottom input area: full-bleed panel on wide screens, plain on narrow (the sheet bleeds itself). */
export const NARROW_WRAP = 'max-lg:contents lg:-mx-[max(16px,env(safe-area-inset-left,0px))]'
