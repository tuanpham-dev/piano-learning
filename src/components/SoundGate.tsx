import { useTranslation } from 'react-i18next'
import { useAudioStatus, resume } from '../audio/context'

/** Visible prompt when something tried to play before the browser allowed audio (R31). */
export function SoundGate() {
  const { t } = useTranslation()
  const needs = useAudioStatus((s) => s.needsGesture && !s.running)
  const fallback = useAudioStatus((s) => s.fallback)
  if (needs)
    return (
      <button
        type="button"
        onClick={() => void resume()}
        className="w-full bg-accent text-accent-ink font-semibold py-3 text-lg"
        aria-live="assertive"
      >
        🔊 {t('common.soundGate')}
      </button>
    )
  if (fallback) return <div className="bg-warn/20 text-center text-sm py-1 px-4">{t('common.synthFallback')}</div>
  return null
}
