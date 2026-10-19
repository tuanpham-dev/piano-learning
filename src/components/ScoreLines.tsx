import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../hooks/useReducedMotion'
import { GrandStaff, type NoteColorFn } from '../notation/Staff'
import { barCount, beatsPerBar, type Song } from '../engine/song'

interface Props {
  song: Song
  /** Live playback beat (−1 when stopped). */
  getCursor?: () => number
  kid?: boolean
  color?: NoteColorFn
  /** Bars to mark (1-based), e.g. bars with warnings. */
  marked?: number[]
  /** Called with the 1-based bar when a bar on the staff is clicked. */
  onBarClick?: (bar: number) => void
  /** Keep the line holding this 1-based bar scrolled into view. */
  followBar?: number
}

/** Matches the bar layout in renderGrandStaff: an 8 px margin, then the first bar carries the 80 px clef and key. */
function barAt(x: number, width: number, count: number): number {
  const barW = (width - 96) / count
  return x < 88 + barW ? 0 : Math.min(count - 1, Math.floor((x - 88) / barW))
}

/** The whole song as stacked lines of grand staff, 4 bars a line (2 on narrow screens). */
export function ScoreLines({ song, getCursor, kid = false, color, marked = [], onBarClick, followBar }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [perLine, setPerLine] = useState(4)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setPerLine(e!.contentRect.width < 600 ? 2 : 4))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const bars = barCount(song)
  const bpb = beatsPerBar(song.timeSig)
  const lines = Math.max(1, Math.ceil(bars / perLine))
  const followLine = followBar ? Math.floor((followBar - 1) / perLine) + 1 : 0
  useEffect(() => {
    if (!followLine) return
    ref.current?.querySelector(`[data-line="${followLine}"]`)?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [followLine])
  return (
    <div ref={ref} className="grid gap-1" data-testid="score-lines">
      {Array.from({ length: lines }, (_, i) => {
        const first = i * perLine + 1
        const last = Math.min(bars, first + perLine - 1)
        const hasMark = marked.some((b) => b >= first && b <= last)
        return (
          <div
            key={i}
            className={`relative rounded-md ${hasMark ? 'ring-2 ring-warn/60' : ''} ${onBarClick ? 'cursor-pointer' : ''}`}
            data-line={i + 1}
            onClick={
              onBarClick &&
              ((e) => {
                const box = e.currentTarget.getBoundingClientRect()
                onBarClick(first + barAt(e.clientX - box.left, box.width, last - first + 1))
              })
            }
          >
            <span className="absolute left-1 -top-0.5 text-[10px] text-muted tabular">{first}</span>
            <GrandStaff song={song} cursorBeat={(first - 1) * bpb} getCursor={getCursor} barsPerLine={perLine} kid={kid} color={color} />
          </div>
        )
      })}
    </div>
  )
}
