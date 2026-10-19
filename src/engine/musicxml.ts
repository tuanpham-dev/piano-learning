import { XMLParser } from 'fast-xml-parser'
import { unzipSync, strFromU8 } from 'fflate'
import { nameToMidi } from './notes'
import type { NoteSpec, Song } from './song'
import { quantize16 } from './song-text'
import type { SongWarning } from './song-check'

/**
 * MusicXML (score-partwise) to a song. Parsed in document order, because <backup> and <forward>
 * move the time cursor between notes. Staff 1 → right hand, staff 2 → left hand; with two
 * single-staff parts, the second part is the left hand.
 */

type Node = Record<string, unknown>
const ATTR = ':@'

function tag(n: Node): string {
  return Object.keys(n).find((k) => k !== ATTR) ?? ''
}
function kids(n: Node): Node[] {
  const v = n[tag(n)]
  return Array.isArray(v) ? (v as Node[]) : []
}
function attr(n: Node, name: string): string | undefined {
  const a = n[ATTR] as Record<string, unknown> | undefined
  return a && a[name] !== undefined ? String(a[name]) : undefined
}
function child(n: Node, name: string): Node | undefined {
  return kids(n).find((c) => tag(c) === name)
}
function children(n: Node, name: string): Node[] {
  return kids(n).filter((c) => tag(c) === name)
}
function text(n: Node | undefined): string | undefined {
  if (!n) return undefined
  const t = kids(n).find((c) => '#text' in c)
  return t ? String(t['#text']) : undefined
}
function num(n: Node | undefined): number | undefined {
  const t = text(n)
  return t === undefined ? undefined : Number(t)
}
function find(nodes: Node[], name: string): Node | undefined {
  for (const n of nodes) {
    if (tag(n) === name) return n
    const deep = find(kids(n), name)
    if (deep) return deep
  }
  return undefined
}

const MAJOR = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#']
const MINOR = ['Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#']

export class MusicXmlError extends Error {}

/** Reads the score inside an .mxl (zipped MusicXML) file. */
export function unzipMxl(bytes: Uint8Array): string {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch {
    throw new MusicXmlError('The .mxl file is not a valid zip archive.')
  }
  const container = files['META-INF/container.xml']
  const path = container ? /full-path="([^"]+)"/.exec(strFromU8(container))?.[1] : Object.keys(files).find((f) => /\.(musicxml|xml)$/i.test(f) && !f.startsWith('META-INF'))
  const score = path ? files[path] : undefined
  if (!score) throw new MusicXmlError('The .mxl file has no score inside.')
  return strFromU8(score)
}

export function musicXmlToSong(xml: string, opts: { id?: string; title?: string } = {}): { song: Song; warnings: SongWarning[] } {
  const parser = new XMLParser({ preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: '', parseTagValue: false, trimValues: true })
  let doc: Node[]
  try {
    doc = parser.parse(xml) as Node[]
  } catch {
    throw new MusicXmlError('The file is not valid XML.')
  }
  const score = doc.find((n) => tag(n) === 'score-partwise')
  if (!score) throw new MusicXmlError(doc.some((n) => tag(n) === 'score-timewise') ? 'Timewise MusicXML is not supported; export as partwise.' : 'This is not a MusicXML score.')

  const warnings: SongWarning[] = []
  const warn = (bar: number, kind: SongWarning['kind'], message: string) => {
    if (!warnings.some((w) => w.bar === bar && w.message === message)) warnings.push({ bar, kind, message })
  }
  const title = opts.title ?? text(find(kids(score), 'work-title')) ?? text(find(kids(score), 'movement-title')) ?? 'Imported score'
  const composer = text(children(child(score, 'identification') ?? { x: [] }, 'creator').find((c) => attr(c, 'type') === 'composer')) ?? ''

  const parts = children(score, 'part')
  if (!parts.length) throw new MusicXmlError('The score has no parts.')
  let timeSig: [number, number] = [4, 4]
  let keySig = 'C'
  let bpm = 0
  const R: NoteSpec[] = []
  const L: NoteSpec[] = []

  parts.slice(0, 2).forEach((part, pi) => {
    let divisions = 1
    let staves = 1
    let measureStart = 0 // in quarter beats
    for (const [mi, measure] of children(part, 'measure').entries()) {
      const bar = mi + 1
      let t = 0
      let maxT = 0
      let lastStart = 0
      for (const el of kids(measure)) {
        const name = tag(el)
        if (name === 'attributes') {
          divisions = num(child(el, 'divisions')) ?? divisions
          staves = num(child(el, 'staves')) ?? staves
          const key = child(el, 'key')
          if (key && pi === 0 && mi === 0) {
            const fifths = num(child(key, 'fifths')) ?? 0
            keySig = text(child(key, 'mode')) === 'minor' ? `${MINOR[fifths + 7] ?? 'A'}m` : (MAJOR[fifths + 7] ?? 'C')
          }
          const time = child(el, 'time')
          if (time && pi === 0 && mi === 0) timeSig = [num(child(time, 'beats')) ?? 4, num(child(time, 'beat-type')) ?? 4]
        } else if (name === 'direction' || name === 'sound') {
          const sound = name === 'sound' ? el : child(el, 'sound')
          const tempo = sound ? Number(attr(sound, 'tempo')) : NaN
          const metro = find(kids(el), 'per-minute')
          if (!bpm && tempo > 0) bpm = tempo
          else if (!bpm && metro) bpm = num(metro) ?? 0
        } else if (name === 'backup') {
          t -= num(child(el, 'duration')) ?? 0
        } else if (name === 'forward') {
          t += num(child(el, 'duration')) ?? 0
          maxT = Math.max(maxT, t)
        } else if (name === 'note') {
          if (child(el, 'grace')) {
            warn(bar, 'other', `Bar ${bar}: a grace note was left out.`)
            continue
          }
          const d = num(child(el, 'duration')) ?? 0
          const isChord = !!child(el, 'chord')
          const start = isChord ? lastStart : t
          if (!isChord) {
            lastStart = t
            t += d
            maxT = Math.max(maxT, t)
          }
          if (child(el, 'time-modification')) warn(bar, 'tuplet', `Bar ${bar}: a triplet (or other tuplet) was written as the nearest sixteenths.`)
          const pitch = child(el, 'pitch')
          if (!pitch || child(el, 'rest')) continue
          const step = text(child(pitch, 'step')) ?? 'C'
          const alter = num(child(pitch, 'alter')) ?? 0
          const octave = num(child(pitch, 'octave')) ?? 4
          const midi = nameToMidi(`${step}${octave}`) + alter
          const staff = num(child(el, 'staff')) ?? 1
          const hand = pi === 1 ? L : staves >= 2 && staff >= 2 ? L : R
          const startBeat = measureStart + start / divisions
          const beats = d / divisions
          const ties = children(el, 'tie').map((x) => attr(x, 'type'))
          const finger = Number(text(find(kids(el), 'fingering')))
          if (ties.includes('stop')) {
            const prev = [...hand].reverse().find((n) => n.midi === midi && Math.abs(n.startBeat + n.beats - startBeat) < 0.02)
            if (prev) {
              prev.beats += beats
              continue
            }
          }
          const n: NoteSpec = { midi, startBeat, beats }
          if (finger >= 1 && finger <= 5) n.finger = finger as NoteSpec['finger']
          hand.push(n)
        }
      }
      measureStart += maxT / divisions
    }
  })
  if (parts.length > 2) warn(0, 'other', `Only the first two parts were used (the score has ${parts.length}).`)
  if (!R.length && !L.length) throw new MusicXmlError('The score has no notes.')
  const song: Song = {
    id:
      opts.id ??
      `xml-${title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 30)}-${Date.now().toString(36)}`,
    title: { en: title, vi: title },
    composer,
    difficulty: 2,
    bpm: Math.round(bpm || 100),
    timeSig,
    keySig,
    source: 'imported',
    hands: { R: quantize16({ notes: R, rests: [] }), L: quantize16({ notes: L, rests: [] }) },
  }
  return { song, warnings }
}
