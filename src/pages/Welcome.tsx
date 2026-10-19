import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useProgress, type Lang, type Mode } from '../store/progress'
import { setLanguage } from '../app/i18n'
import { Mascot } from '../components/Mascot'
import { PrimaryButton } from '../components/PrimaryButton'
import { Segmented } from '../components/Segmented'

export function WelcomePage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const setProfile = useProgress((s) => s.setProfile)
  const [name, setName] = useState('')
  const [mode, setMode] = useState<Mode | null>(null)
  const [lang, setLang] = useState<Lang>(navigator.language.startsWith('vi') ? 'vi' : 'en')

  const pickLang = (l: Lang) => {
    setLang(l)
    setLanguage(l)
  }
  const pickMode = (m: Mode) => {
    setMode(m)
    document.documentElement.dataset.mode = m
  }

  return (
    <main className="min-h-full grid place-items-center px-[max(16px,env(safe-area-inset-left,0px))] py-10">
      <div className="w-full max-w-md grid gap-6 justify-items-center text-center">
        <Mascot mood={mode === 'kid' ? 'cheering' : 'idle'} size={110} />
        <h1 className="text-3xl font-bold">{t('welcome.title')}</h1>
        <input
          id="welcome-name"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 24))}
          placeholder={t('welcome.namePlaceholder')}
          className="w-full rounded-[var(--radius)] border border-line bg-bg px-4 min-h-[var(--touch)] text-lg"
          autoComplete="given-name"
        />
        <div className="grid grid-cols-2 gap-3 w-full">
          {(['kid', 'adult'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => pickMode(m)}
              aria-pressed={mode === m}
              className={`rounded-[var(--radius)] border-2 py-5 text-lg font-semibold ${mode === m ? 'border-accent bg-accent/10' : 'border-line bg-bg'}`}
            >
              <span className="block text-3xl" aria-hidden>
                {m === 'kid' ? '🧒' : '🙂'}
              </span>
              {t(`welcome.${m}`)}
            </button>
          ))}
        </div>
        <div className="grid gap-2 justify-items-center">
          <span className="text-sm text-muted">{t('welcome.language')}</span>
          <Segmented
            id="welcome-lang"
            value={lang}
            onChange={pickLang}
            options={[
              { value: 'en', label: 'English' },
              { value: 'vi', label: 'Tiếng Việt' },
            ]}
          />
        </div>
        <PrimaryButton
          disabled={!mode}
          onClick={() => {
            setProfile({ name: name.trim(), mode: mode!, lang })
            nav('/', { replace: true })
          }}
          className="w-full"
        >
          {t('welcome.go')} ▶
        </PrimaryButton>
      </div>
    </main>
  )
}
