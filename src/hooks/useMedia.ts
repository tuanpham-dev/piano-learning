import { useEffect, useState } from 'react'

export function useMedia(query: string): boolean {
  const get = () => typeof matchMedia !== 'undefined' && matchMedia(query).matches
  const [match, setMatch] = useState(get)
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return
    const mq = matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

/** Below 1024px (phones, iPad portrait) playing screens stack and move controls into a bottom sheet (R30). */
export function useNarrow(): boolean {
  return useMedia('(max-width: 1023.98px)')
}
