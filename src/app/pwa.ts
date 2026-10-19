import { create } from 'zustand'
import { registerSW } from 'virtual:pwa-register'

interface PwaState {
  needRefresh: boolean
  update: () => void
  dismiss: () => void
}

export const usePwa = create<PwaState>()((set) => ({ needRefresh: false, update: () => {}, dismiss: () => set({ needRefresh: false }) }))

/** Registers the service worker that caches the app, songs and piano samples for offline use (R5). */
export function installPwa(): void {
  if (!('serviceWorker' in navigator)) return
  const updateSW = registerSW({
    immediate: true,
    // A new version waits for the learner to accept it, so a lesson is never interrupted.
    onNeedRefresh: () => usePwa.setState({ needRefresh: true }),
  })
  usePwa.setState({ update: () => void updateSW(true) })
}
