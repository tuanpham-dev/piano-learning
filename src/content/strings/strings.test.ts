import en from './en.json'
import vi from './vi.json'

type Tree = { [k: string]: string | Tree }

function flatten(obj: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') out[key] = v
    else Object.assign(out, flatten(v, key))
  }
  return out
}

const fen = flatten(en as Tree)
const fvi = flatten(vi as Tree)

function words(s: string): number {
  return s
    .replace(/\{\{[^}]+\}\}/g, 'X')
    .split(/\s+/)
    .filter(Boolean).length
}

describe('string tables', () => {
  it('have identical key sets', () => {
    expect(Object.keys(fvi).sort()).toEqual(Object.keys(fen).sort())
  })
  it('have no empty values', () => {
    for (const [k, v] of [...Object.entries(fen), ...Object.entries(fvi)]) expect(v.trim(), k).not.toBe('')
  })
  it('keep every kid line to 12 words or fewer (R3i)', () => {
    for (const table of [fen, fvi]) {
      for (const [k, v] of Object.entries(table)) {
        if (k.startsWith('kid.')) expect(words(v), `${k}: "${v}"`).toBeLessThanOrEqual(12)
      }
    }
  })
  it('use the same interpolation variables in both languages', () => {
    for (const k of Object.keys(fen)) {
      const vars = (s: string) => (s.match(/\{\{\s*(\w+)\s*\}\}/g) ?? []).sort()
      expect(vars(fvi[k]!), k).toEqual(vars(fen[k]!))
    }
  })
})
