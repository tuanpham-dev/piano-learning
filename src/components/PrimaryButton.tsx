import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

const styles: Record<Variant, string> = {
  primary: 'lifted bg-accent text-accent-ink border-accent font-semibold',
  secondary: 'lifted bg-surface text-fg border-line font-medium',
  ghost: 'bg-transparent text-fg border-transparent hover:bg-panel',
}

/** The one big call-to-action on a screen in kid mode; a regular button in adult mode. */
/** Toggle buttons (aria-pressed) that are on: filled navy and pushed in, so the state reads at a glance. */
const PRESSED = 'is-pressed bg-fg text-bg border-fg'

export function Button({ variant = 'secondary', className = '', children, ...rest }: Props) {
  const pressed = rest['aria-pressed'] === true
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius)] border px-4 min-h-[var(--touch)] disabled:opacity-45 disabled:cursor-not-allowed transition-colors ${pressed ? `lifted ${PRESSED}` : styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function PrimaryButton(props: Omit<Props, 'variant'>) {
  return <Button {...props} data-primary="" variant="primary" className={`text-lg px-6 ${props.className ?? ''}`} />
}
