import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AiNavigator } from '../ai/AiControls'
import { useTranslation } from 'react-i18next'
import { useProgress } from '../store/progress'
import { setLanguage } from './i18n'
import { AppRoutes } from './routes'
import { UpdateToast } from '../components/UpdateToast'

export function App() {
  const { i18n } = useTranslation()
  const loaded = useProgress((s) => s.loaded)
  const mode = useProgress((s) => s.mode)
  const lang = useProgress((s) => s.lang)

  useEffect(() => {
    document.documentElement.dataset.mode = mode
  }, [mode])
  useEffect(() => setLanguage(lang), [lang])

  // Hold the tree until i18next matches the stored language, so nothing renders in the wrong one.
  if (!loaded || i18n.language !== lang) return <div className="grid h-full place-items-center text-muted">…</div>
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes />
      <AiNavigator />
      <UpdateToast />
    </BrowserRouter>
  )
}
