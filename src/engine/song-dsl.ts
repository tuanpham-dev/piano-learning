import { nameToMidi } from './notes'
import { beatsPerBar, round, type Finger, type NoteSpec, type RestSpec, type Voice } from './song'

/**
 * Compact text format for authoring songs:
 *   E4q3      note E4, quarter, finger 3      (durations: w h q e s; "." dots it)
 *   F#4e.     dotted eighth, no finger
 *   [C4 E4 G4]h  chord
 *   rq / rh.  rests
 *   |         bar line: checks that the bar is exactly full
 *   E4q~ E4q  tie: the second note extends the first (must stay within the bar)
 */

const DUR: Record<string, number> = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 }
const NOTE_RE = /^([A-G](?:#|b)?-?\d)([whqes])(\.?)([1-5])?(~)?$/
const CHORD_RE = /^\[([^\]]+)\]([whqes])(\.?)(~)?$/
const REST_RE = /^r([whqes])(\.?)$/
const TOKEN_RE = /\[[^\]]*\][whqes]\.?~?|\S+/g

export class SongSyntaxError extends Error {}

function dur(letter: string, dot: string): number {
  return DUR[letter]! * (dot ? 1.5 : 1)
}

export interface ParseIssue {
  /** 1-based bar number. */
  bar: number
  message: string
}

/**
 * Parses note text. Strict by default (throws on the first problem). With `issues`, it is lenient:
 * problems are recorded per bar and parsing continues, so a song with one bad bar can still be reviewed.
 */
export function parseVoice(text: string, timeSig: [number, number], issues?: ParseIssue[]): Voice {
  const fail = (bar: number, message: string) => {
    if (!issues) throw new SongSyntaxError(message)
    if (!issues.some((i) => i.bar === bar && i.message === message)) issues.push({ bar, message })
  }
  const barLen = beatsPerBar(timeSig)
  const notes: NoteSpec[] = []
  const rests: RestSpec[] = []
  let pos = 0
  let barStart = 0
  let bar = 1
  let tieFrom: NoteSpec[] = []

  const addNotes = (midis: number[], beats: number, finger: Finger | undefined, tie: boolean) => {
    const made: NoteSpec[] = []
    for (const midi of midis) {
      const tied = tieFrom.find((n) => n.midi === midi && Math.abs(n.startBeat + n.beats - pos) < 1e-6)
      if (tied) {
        tied.beats = round(tied.beats + beats)
        made.push(tied)
      } else {
        const n: NoteSpec = { midi, startBeat: round(pos), beats }
        if (finger) n.finger = finger
        notes.push(n)
        made.push(n)
      }
    }
    tieFrom = tie ? made : []
    pos = round(pos + beats)
  }

  for (const tok of text.match(TOKEN_RE) ?? []) {
    if (tok === '|') {
      if (Math.abs(pos - barStart - barLen) > 1e-6) {
        fail(bar, `Bar ${bar} has ${round(pos - barStart)} beats, expected ${barLen}`)
        // Lenient: pad a short bar so later bars keep the bar numbers shown in the text.
        if (pos < barStart + barLen) {
          rests.push({ startBeat: round(pos), beats: round(barStart + barLen - pos) })
          pos = round(barStart + barLen)
          tieFrom = []
        }
      }
      barStart = pos
      bar++
      continue
    }
    let m: RegExpExecArray | null
    try {
      if ((m = NOTE_RE.exec(tok))) {
        addNotes([nameToMidi(m[1]!)], dur(m[2]!, m[3]!), m[4] ? (Number(m[4]) as Finger) : undefined, !!m[5])
      } else if ((m = CHORD_RE.exec(tok))) {
        const midis = m[1]!.trim().split(/\s+/).map(nameToMidi)
        addNotes(midis, dur(m[2]!, m[3]!), undefined, !!m[4])
      } else if ((m = REST_RE.exec(tok))) {
        const beats = dur(m[1]!, m[2]!)
        rests.push({ startBeat: round(pos), beats })
        tieFrom = []
        pos = round(pos + beats)
      } else {
        fail(bar, `Bar ${bar}: can't read "${tok}"`)
      }
    } catch (e) {
      if (!(e instanceof SongSyntaxError) && issues) fail(bar, `Bar ${bar}: can't read "${tok}"`)
      else throw e
    }
    if (pos - barStart > barLen + 1e-6 && !issues) throw new SongSyntaxError(`Bar ${bar} is longer than ${barLen} beats`)
  }
  if (pos > barStart + 1e-6 && Math.abs(pos - barStart - barLen) > 1e-6) {
    fail(bar, issues ? `Bar ${bar} has ${round(pos - barStart)} beats, expected ${barLen}` : `Last bar (${bar}) has ${round(pos - barStart)} beats, expected ${barLen}`)
  }
  return { notes, rests }
}
