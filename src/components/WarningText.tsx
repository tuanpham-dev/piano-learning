import { useT } from '../app/i18n'
import type { SongWarning } from '../engine/song-check'

/** A song warning in the person's language (the engine's English text is for AI tools). */
export function useWarningText() {
  const { t } = useT()
  return (w: SongWarning) => {
    const hand = w.hand ? t(w.hand === 'R' ? 'warn.right' : 'warn.left') : ''
    const body = t(`warn.${w.kind}`, { ...w.params, defaultValue: w.message })
    return hand ? `${hand}: ${body}` : body
  }
}
