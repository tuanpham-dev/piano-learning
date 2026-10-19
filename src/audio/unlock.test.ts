import { isIOS, startSilentMediaElement } from './unlock'

describe('iOS audio unlock', () => {
  it('detects iPhone, iPad and iPadOS-as-Mac', () => {
    expect(isIOS('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5)).toBe(true)
    expect(isIOS('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)', 5)).toBe(true)
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari', 5)).toBe(true)
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari', 0)).toBe(false)
    expect(isIOS('Mozilla/5.0 (X11; Linux x86_64) Chrome/130', 0)).toBe(false)
  })
  it('creates a looping silent media element', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    const el = startSilentMediaElement('/silence.wav')
    expect(el.loop).toBe(true)
    expect(el.getAttribute('playsinline')).toBe('')
    expect(play).toHaveBeenCalled()
  })
})
