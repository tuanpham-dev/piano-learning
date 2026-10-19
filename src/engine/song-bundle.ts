import { evenHands, type Draft } from './song-text'

/** A bundled song id: lower-case words joined by dashes. */
export const BUNDLE_ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

/** Suggests a bundled id from a My songs id ("my-ode-to-joy-lx3k9" → "ode-to-joy"). */
export function bundleIdFor(draft: Draft): string {
  const fromId = draft.id.replace(/^my-/, '').replace(/-[a-z0-9]{6,9}$/, '')
  const id = BUNDLE_ID.test(fromId) ? fromId : draft.title.en.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return /^[a-z]/.test(id) ? id : `song-${id || 'untitled'}`
}

export const varNameFor = (id: string) => id.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())

const q = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

/** Source for `src/content/songs/<id>.ts`, in the style of the bundled songs (four bars a line). */
export function bundleSource(draft: Draft, id: string): string {
  const e = evenHands(draft)
  const lines = (bars: string[]) => {
    const out: string[] = []
    for (let i = 0; i < bars.length; i += 4) out.push(`    ${bars.slice(i, i + 4).join(' | ')} |`)
    return out.join('\n')
  }
  return `import { makeSong } from './make'

export default makeSong({
  id: ${q(id)},
  title: { en: ${q(draft.title.en)}, vi: ${q(draft.title.vi)} },
  composer: ${q(draft.composer)},
  difficulty: ${draft.difficulty},
  bpm: ${draft.bpm},
  timeSig: [${draft.timeSig[0]}, ${draft.timeSig[1]}],
  keySig: ${q(draft.keySig)},
  right: \`
${lines(e.right)}\`,
  left: \`
${lines(e.left)}\`,
})
`
}

/** Adds the import and the list entry to `src/content/songs/index.ts`; unchanged if already registered. */
export function registerInIndex(index: string, id: string): string {
  const name = varNameFor(id)
  if (index.includes(`from './${id}'`)) return index
  const imports = [...index.matchAll(/^import .+ from '\.\/[^']+'\n/gm)]
  const lastImport = imports[imports.length - 1]
  if (!lastImport || lastImport.index === undefined) throw new Error('src/content/songs/index.ts has no song imports to add to.')
  const at = lastImport.index + lastImport[0].length
  let out = `${index.slice(0, at)}import ${name} from './${id}'\n${index.slice(at)}`
  const list = /export const bundledSongs: Song\[\] = \[([^\]]*)\]/
  if (!list.test(out)) throw new Error('src/content/songs/index.ts has no bundledSongs list.')
  out = out.replace(list, (_, items: string) => `export const bundledSongs: Song[] = [${items.trimEnd()}, ${name}]`)
  return out
}
