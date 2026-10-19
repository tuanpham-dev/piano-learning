import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { bus, emitNote } from '../input/bus'
import { letterOf, MIDDLE_C, prettyName } from '../engine/notes'
import { keyGeometry, snapRange, visibleWindow, whiteCount } from './geometry'
import { colorForMidi, inkForMidi } from './note-colors'

export type KeyMark = 'due' | 'dueL' | 'hit' | 'wrong' | 'show'

export interface KeyboardProps {
  /** Range the activity may use; the keyboard shows all of it if it fits. */
  low: number
  high: number
  highlight?: Map<number, KeyMark>
  /** Notes that must stay in view (due notes). */
  focus?: number[]
  showNames?: boolean
  kid?: boolean
  /** Key labels, e.g. the QWERTY mapping. */
  labels?: Map<number, string>
  /** Reports the visible window so a Lane above can align with it. */
  onWindow?: (low: number, high: number, width: number) => void
  height?: number
  interactive?: boolean
  className?: string
}

const MARK_STYLE: Record<KeyMark, { white: string; black: string }> = {
  due: { white: 'color-mix(in srgb, var(--color-accent) 30%, var(--color-key-white))', black: 'color-mix(in srgb, var(--color-accent) 70%, var(--color-key-black))' },
  dueL: { white: 'color-mix(in srgb, var(--color-left) 30%, var(--color-key-white))', black: 'color-mix(in srgb, var(--color-left) 70%, var(--color-key-black))' },
  hit: { white: 'color-mix(in srgb, var(--color-ok) 45%, var(--color-key-white))', black: 'var(--color-ok)' },
  wrong: { white: 'color-mix(in srgb, var(--color-accent) 55%, var(--color-key-white))', black: 'var(--color-accent)' },
  show: { white: 'color-mix(in srgb, var(--color-accent) 22%, var(--color-key-white))', black: 'color-mix(in srgb, var(--color-accent) 60%, var(--color-key-black))' },
}

function useHeldNotes(): Set<number> {
  const [held, setHeld] = useState<Set<number>>(() => bus.heldNotes())
  useEffect(() => bus.subscribe((e) => e.kind !== 'tap' && setHeld(bus.heldNotes())), [])
  return held
}

export function Keyboard({
  low,
  high,
  highlight,
  focus,
  showNames,
  kid,
  labels,
  onWindow,
  height,
  interactive = true,
  className = '',
}: KeyboardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [start, setStart] = useState<number | undefined>(undefined)
  const held = useHeldNotes()
  const pointers = useRef(new Map<number, number>())
  const [focusKey, setFocusKey] = useState(MIDDLE_C)
  const [hasFocus, setHasFocus] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e!.contentRect.width)))
    ro.observe(el)
    setWidth(Math.floor(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])

  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
  const minKey = kid ? 52 : coarse ? 40 : 22
  const [wLow, wHigh] = useMemo(() => (width ? visibleWindow(low, high, width, minKey, start) : snapRange(low, high)), [low, high, width, minKey, start])
  const scrollable = whiteCount(...snapRange(low, high)) > whiteCount(wLow, wHigh)

  // Keep due notes in view.
  const focusKeyStr = (focus ?? []).join(',')
  useEffect(() => {
    if (!scrollable || !focus?.length) return
    const lo = Math.min(...focus)
    const hi = Math.max(...focus)
    if (lo < wLow || hi > wHigh) setStart(Math.max(low, lo - 2))
  }, [focusKeyStr, scrollable, wLow, wHigh, low])

  useEffect(() => {
    if (width) onWindow?.(wLow, wHigh, width)
  }, [wLow, wHigh, width, onWindow])

  const keys = useMemo(() => (width ? keyGeometry(wLow, wHigh, width) : []), [wLow, wHigh, width])
  const h = height ?? (kid ? 150 : coarse ? 140 : 120)

  const midiAt = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null
    const v = el?.closest<HTMLElement>('[data-midi]')?.dataset.midi
    return v === undefined ? null : Number(v)
  }

  const press = (pointerId: number, midi: number | null) => {
    const prev = pointers.current.get(pointerId)
    if (prev === midi) return
    if (prev !== undefined) emitNote('off', prev, 'screen', 0)
    if (midi === null) pointers.current.delete(pointerId)
    else {
      pointers.current.set(pointerId, midi)
      emitNote('on', midi, 'screen', 90)
    }
  }

  const shift = (dir: -1 | 1) => setStart(Math.max(low, Math.min(high, wLow + dir * 12)))

  return (
    <div className={`select-none ${className}`}>
      {scrollable && (
        <div className="flex justify-between text-sm mb-1">
          <button type="button" className="px-3 min-h-9 rounded-md bg-panel disabled:opacity-40" onClick={() => shift(-1)} disabled={wLow <= snapRange(low, high)[0]} aria-label="Lower octave">
            ◀ {prettyName(wLow)}
          </button>
          <button type="button" className="px-3 min-h-9 rounded-md bg-panel disabled:opacity-40" onClick={() => shift(1)} disabled={wHigh >= snapRange(low, high)[1]} aria-label="Higher octave">
            {prettyName(wHigh)} ▶
          </button>
        </div>
      )}
      <div
        ref={ref}
        role="group"
        aria-label={`Piano keyboard ${prettyName(wLow)} to ${prettyName(wHigh)}`}
        tabIndex={interactive ? 0 : -1}
        className="relative w-full rounded-b-md overflow-hidden"
        style={{ height: h, touchAction: 'none' }}
        onFocus={() => setHasFocus(true)}
        onBlur={() => setHasFocus(false)}
        onKeyDown={(e) => {
          if (!interactive) return
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault()
            setFocusKey((k) => Math.max(wLow, Math.min(wHigh, k + (e.key === 'ArrowRight' ? 1 : -1))))
          } else if (e.key === 'Enter' && !e.repeat) {
            emitNote('on', focusKey, 'screen', 90)
          }
        }}
        onKeyUp={(e) => {
          if (interactive && e.key === 'Enter') emitNote('off', focusKey, 'screen', 0)
        }}
        onPointerDown={(e) => {
          if (!interactive) return
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
          press(e.pointerId, midiAt(e.clientX, e.clientY))
        }}
        onPointerMove={(e) => {
          if (!interactive || !pointers.current.has(e.pointerId)) return
          press(e.pointerId, midiAt(e.clientX, e.clientY))
        }}
        onPointerUp={(e) => interactive && press(e.pointerId, null)}
        onPointerCancel={(e) => interactive && press(e.pointerId, null)}
        onLostPointerCapture={(e) => interactive && press(e.pointerId, null)}
      >
        {keys.map((k) => {
          const mark = highlight?.get(k.midi)
          const isHeld = held.has(k.midi)
          const color = isHeld ? (mark === 'wrong' ? MARK_STYLE.wrong : mark === 'due' || mark === 'dueL' || mark === 'hit' ? MARK_STYLE.hit : null) : mark ? MARK_STYLE[mark] : null
          const pressedFill = isHeld && !color ? (k.black ? 'color-mix(in srgb, var(--color-key-black) 70%, var(--color-muted))' : 'color-mix(in srgb, var(--color-key-white) 80%, var(--color-muted))') : undefined
          const style: CSSProperties = {
            left: k.x,
            width: k.w,
            height: k.black ? '62%' : '100%',
            background: color ? (k.black ? color.black : color.white) : pressedFill ?? (k.black ? 'var(--color-key-black)' : 'var(--color-key-white)'),
            zIndex: k.black ? 2 : 1,
            transform: isHeld ? 'translateY(1px)' : undefined,
          }
          const label = labels?.get(k.midi)
          const letter = letterOf(k.midi)
          const showKidDot = kid && !k.black
          const showAdultName = !kid && !k.black && (showNames || letter === 'C')
          return (
            <div
              key={k.midi}
              data-midi={k.midi}
              aria-label={prettyName(k.midi)}
              className={`absolute top-0 flex flex-col items-center justify-end gap-1 pb-1.5 ${k.black ? 'rounded-b-md shadow-md' : 'border border-line rounded-b-md'} ${mark === 'wrong' && isHeld ? 'anim-wobble' : ''}`}
              style={style}
            >
              {label && (
                <span className={`text-[10px] font-mono leading-none ${k.black ? 'text-key-white/80' : 'text-muted'}`}>{label}</span>
              )}
              {showKidDot && (
                <span
                  className="grid place-items-center rounded-full font-extrabold leading-none"
                  style={{ width: Math.min(30, k.w * 0.7), height: Math.min(30, k.w * 0.7), background: colorForMidi(k.midi), color: inkForMidi(k.midi), fontSize: Math.min(15, k.w * 0.38) }}
                >
                  {letter}
                </span>
              )}
              {showAdultName && (
                <span className={`text-[10px] leading-none ${letter === 'C' ? 'font-semibold text-fg' : 'text-muted'}`}>
                  {letter === 'C' ? prettyName(k.midi) : letter}
                </span>
              )}
              {k.midi === focusKey && hasFocus && <span className="absolute inset-x-1 top-1 h-1.5 rounded bg-accent" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
