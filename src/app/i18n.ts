import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import en from '../content/strings/en.json'
import vi from '../content/strings/vi.json'
import { useProgress, type Lang, type Mode } from '../store/progress'
import type { Localized } from '../engine/song'

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, vi: { translation: vi } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
  // Initialize synchronously so a later changeLanguage() isn't overwritten by a deferred init.
  initImmediate: false,
})

export default i18n

export function setLanguage(lang: Lang): void {
  if (i18n.language !== lang) void i18n.changeLanguage(lang)
  if (document.documentElement.lang !== lang) document.documentElement.lang = lang
}

/** Translation hook plus the current mode, language, and a picker for bilingual content. */
export function useT() {
  const { t } = useTranslation()
  const mode = useProgress((s) => s.mode)
  const lang = useProgress((s) => s.lang)
  const kid = mode === 'kid'
  /** Kid copy when in kid mode and the key exists under `kid.`, otherwise the shared key. */
  const tm = (key: string, opts?: Record<string, unknown>): string =>
    kid && i18n.exists(`kid.${key}`) ? t(`kid.${key}`, opts) : t(key, opts)
  const L = (s: Localized): string => s[lang] || s.en
  return { t, tm, L, kid, mode: mode as Mode, lang }
}

if (import.meta.env.DEV) (window as unknown as { __i18n: typeof i18n }).__i18n = i18n
