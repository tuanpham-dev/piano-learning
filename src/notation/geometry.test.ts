import { keyGeometry, snapRange, visibleWindow, whiteCount } from './geometry'

describe('keyboard geometry', () => {
  it('counts 52 white keys on a full piano', () => {
    expect(whiteCount(21, 108)).toBe(52)
  })
  it('snaps ranges to white keys', () => {
    expect(snapRange(61, 66)).toEqual([60, 67])
  })
  it('places black keys between their neighbours', () => {
    const g = keyGeometry(60, 64, 300)
    const c = g.find((k) => k.midi === 60)!
    const cs = g.find((k) => k.midi === 61)!
    const d = g.find((k) => k.midi === 62)!
    expect(c.w).toBe(100)
    expect(cs.black).toBe(true)
    expect(cs.x + cs.w / 2).toBeCloseTo(d.x)
  })
  it('shows the whole range when keys fit', () => {
    expect(visibleWindow(21, 108, 1180, 20)).toEqual([21, 108])
  })
  it('shows two octaves on a phone and follows the start note', () => {
    const [lo, hi] = visibleWindow(48, 84, 390, 26, 60)
    expect(lo).toBe(60)
    expect(whiteCount(lo, hi)).toBe(15)
  })
  it('extends backwards at the top of the range', () => {
    const [lo, hi] = visibleWindow(48, 72, 390, 40, 71)
    expect(hi).toBe(72)
    expect(whiteCount(lo, hi)).toBe(9)
  })
})
