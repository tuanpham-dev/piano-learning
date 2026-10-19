import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app/theme.css'
import './app/i18n'
import { App } from './app/App'
import { useProgress } from './store/progress'
import { useSession } from './store/session'
import { installAudioUnlock } from './audio/unlock'
import { loadSamples } from './audio/sampler'

installAudioUnlock()
if (import.meta.env.DEV) void import('./app/dev').then((m) => m.installDevHandles())
void loadSamples()
void Promise.all([useProgress.getState().hydrate(), useSession.getState().hydrateSongs()])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
