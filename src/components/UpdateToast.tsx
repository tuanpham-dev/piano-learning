import { useTranslation } from 'react-i18next'
import { usePwa } from '../app/pwa'

export function UpdateToast() {
  const { t } = useTranslation()
  const { needRefresh, update, dismiss } = usePwa()
  if (!needRefresh) return null
  return (
    <div
      role="status"
      className="fixed z-50 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-[var(--radius)] bg-fg text-bg px-4 py-2 shadow-xl"
      style={{ bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
    >
      <span>{t('common.updateReady')}</span>
      <button type="button" className="font-semibold underline" onClick={update}>
        {t('common.reload')}
      </button>
      <button type="button" aria-label={t('common.close')} onClick={dismiss}>
        ✕
      </button>
    </div>
  )
}
