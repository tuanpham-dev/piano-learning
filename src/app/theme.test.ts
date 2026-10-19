import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Parses the token blocks of theme.css and checks text contrast in every mode × scheme (WCAG AA 4.5:1). */
const css = readFileSync(join(__dirname, 'theme.css'), 'utf8')

function block(selectorStart: number): Record<string, string> {
  const open = css.indexOf('{', selectorStart)
  let depth = 0
  let end = open
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    if (css[i] === '}' && --depth === 0) {
      end = i
      break
    }
  }
  const out: Record<string, string> = {}
  for (const m of css.slice(open + 1, end).matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})/gi)) out[m[1]!] = m[2]!
  return out
}

const base = block(css.indexOf('@theme'))
const kid = block(css.indexOf('html[data-mode="kid"] {'))
const darkStart = css.indexOf('@media (prefers-color-scheme: dark)')
const dark = block(css.indexOf('html {', darkStart))
const kidDark = block(css.indexOf('html[data-mode="kid"] {', darkStart))

const palettes = {
  'adult light': base,
  'kid light': { ...base, ...kid },
  'adult dark': { ...base, ...dark },
  'kid dark': { ...base, ...dark, ...kidDark },
}

function lum(hex: string): number {
  const c = hex
    .slice(1)
    .match(/../g)!
    .map((h) => parseInt(h, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!
}
export function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x! + 0.05) / (y! + 0.05)
}

describe('theme contrast', () => {
  for (const [name, p] of Object.entries(palettes)) {
    describe(name, () => {
      const pairs: [string, string, string][] = [
        ['text on background', 'fg', 'bg'],
        ['text on panels', 'fg', 'panel'],
        ['quiet text on background', 'muted', 'bg'],
        ['quiet text on panels', 'muted', 'panel'],
        ['button text', 'accent-ink', 'accent'],
        ['success text', 'ok', 'bg'],
        ['warning text', 'warn', 'bg'],
        ['key labels', 'key-ink', 'key-white'],
        ['quiet key labels', 'key-ink-muted', 'key-white'],
      ]
      for (const [label, fg, bg] of pairs) {
        it(`${label} ≥ 4.5:1`, () => {
          expect(contrast(p[fg]!, p[bg]!), `${fg} ${p[fg]} on ${bg} ${p[bg]}`).toBeGreaterThanOrEqual(4.5)
        })
      }
    })
  }
})
