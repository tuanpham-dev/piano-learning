import { resume } from './context'

export function isIOS(ua = navigator.userAgent, maxTouchPoints = navigator.maxTouchPoints): boolean {
  // iPadOS reports a Mac user agent; touch support tells them apart.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1)
}

let silentEl: HTMLAudioElement | null = null

/**
 * iOS routes Web Audio through the ringer channel unless a media element is playing,
 * so the side switch would mute the piano. A looping silent media element moves
 * Web Audio onto the media channel (R32).
 */
export function startSilentMediaElement(src = `${import.meta.env.BASE_URL}silence.wav`): HTMLAudioElement {
  if (silentEl) return silentEl
  const el = document.createElement('audio')
  el.src = src
  el.loop = true
  el.setAttribute('playsinline', '')
  el.setAttribute('x-webkit-airplay', 'deny')
  el.preload = 'auto'
  el.volume = 0.01
  silentEl = el
  void el.play().catch(() => {
    silentEl = null
  })
  return el
}

/** Installs one-time gesture listeners that unlock audio on the first tap or key. */
export function installAudioUnlock(): () => void {
  const ios = isIOS()
  const handler = () => {
    if (ios) startSilentMediaElement()
    void resume().then((ok) => {
      if (ok) remove()
    })
  }
  const events = ['pointerdown', 'touchend', 'keydown'] as const
  const remove = () => events.forEach((e) => window.removeEventListener(e, handler, true))
  events.forEach((e) => window.addEventListener(e, handler, true))
  return remove
}
