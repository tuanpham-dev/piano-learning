import { useLayoutEffect, useRef, useState } from 'react'
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
}

/** The whole song as stacked lines of grand staff, 4 bars a line (2 on narrow screens). */
export function ScoreLines({ song, getCursor, kid = false, color, marked = [] }: Props) {
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
  return (
    <div ref={ref} className="grid gap-1" data-testid="score-lines">
      {Array.from({ length: lines }, (_, i) => {
        const first = i * perLine + 1
        const last = Math.min(bars, first + perLine - 1)
        const hasMark = marked.some((b) => b >= first && b <= last)
        return (
          <div key={i} className={`relative rounded-md ${hasMark ? 'ring-2 ring-warn/60' : ''}`} data-line={i + 1}>
            <span className="absolute left-1 -top-0.5 text-[10px] text-muted tabular">{first}</span>
            <GrandStaff song={song} cursorBeat={(first - 1) * bpb} getCursor={getCursor} barsPerLine={perLine} kid={kid} color={color} />
          </div>
        )
      })}
    </div>
  )
}
