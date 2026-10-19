import { useRef, useState, type ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { Page } from '../app/Layout'
import { useT } from '../app/i18n'
import { useProgress, type NotationView } from '../store/progress'
import { applyImport, downloadExport, parseExport, resetAll, type ExportFile } from '../store/export'
import { Button } from '../components/PrimaryButton'
import { Segmented } from '../components/Segmented'
import { VirtualMidiPanel } from '../components/VirtualMidiPanel'

const VERSION = '1.0.0'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 border-b border-line">
      <span className="w-48 max-w-full text-muted">{label}</span>
      <div className="flex-1 min-w-0 flex flex-wrap gap-2 items-center">{children}</div>
    </div>
  )
}

export function SettingsPage() {
  const { t } = useT()
  const p = useProgress()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ file: ExportFile; name: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [taps, setTaps] = useState(0)

  const onFile = async (f: File | undefined) => {
    if (!f) return
    const parsed = parseExport(await f.text())
    if (!parsed) setMessage(t('settings.importBad', { file: f.name }))
    else setPending({ file: parsed, name: f.name })
    if (fileRef.current) fileRef.current.value = ''
  }

  const tapVersion = () => {
    const n = taps + 1
    setTaps(n)
    if (n >= 5 && !p.settings.virtualMidi) {
      p.updateSettings({ virtualMidi: true })
      setMessage(t('settings.devUnlocked'))
    }
  }

  return (
    <Page title={t('settings.title')}>
      <div className="max-w-3xl">
        <Row label={t('settings.mode')}>
          <Segmented
            id="set-mode"
            value={p.mode}
            onChange={p.setMode}
            options={[
              {
                value: 'kid',
                label: (
                  <>
                    <Icon name="child" size={18} /> {t('settings.kidMode')}
                  </>
                ),
              },
              {
                value: 'adult',
                label: (
                  <>
                    <Icon name="adult" size={18} /> {t('settings.adultMode')}
                  </>
                ),
              },
            ]}
          />
        </Row>
        <Row label={t('settings.name')}>
          <input
            id="set-name"
            aria-label={t('settings.name')}
            value={p.name}
            onChange={(e) => p.setName(e.target.value.slice(0, 24))}
            className="w-full max-w-xs min-w-0 rounded-[var(--radius)] border border-line bg-bg px-3 min-h-[var(--touch)]"
          />
        </Row>
        <Row label={t('settings.language')}>
          <Segmented
            id="set-lang"
            value={p.lang}
            onChange={p.setLang}
            options={[
              { value: 'en', label: 'English' },
              { value: 'vi', label: 'Tiếng Việt' },
            ]}
          />
        </Row>
        <Row label={t('settings.notation')}>
          <Segmented<NotationView>
            id="set-view"
            value={p.settings.view}
            onChange={(view) => p.updateSettings({ view })}
            options={[
              { value: 'staff', label: t('settings.viewStaff') },
              { value: 'lane', label: t('settings.viewLane') },
              { value: 'both', label: t('settings.viewBoth') },
            ]}
          />
        </Row>
        <Row label={t('settings.noteNames')}>
          <Toggle id="set-names" label={t('settings.noteNames')} checked={p.settings.noteNames} onChange={(noteNames) => p.updateSettings({ noteNames })} />
        </Row>
        {p.mode === 'adult' && (
          <Row label={t('settings.skipAhead')}>
            <Toggle id="set-skip" label={t('settings.skipAhead')} checked={p.settings.skipAhead} onChange={(skipAhead) => p.updateSettings({ skipAhead })} />
          </Row>
        )}
        <Row label={t('settings.data')}>
          <Button onClick={downloadExport}>{t('settings.export')}</Button>
          <Button onClick={() => fileRef.current?.click()}>{t('settings.import')}</Button>
          <input ref={fileRef} id="set-import" type="file" accept="application/json,.json" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
          <Button onClick={() => setConfirmReset(true)} className="text-accent border-accent">
            {t('settings.reset')}
          </Button>
        </Row>

        {pending && (
          <div className="my-3 rounded-[var(--radius)] border border-accent p-4 grid gap-3" role="alertdialog" aria-live="polite">
            <p>{t('settings.importAsk', { file: pending.name })}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  applyImport(pending.file, 'merge')
                  setPending(null)
                  setMessage(t('settings.importDone'))
                }}
              >
                {t('settings.importMerge')}
              </Button>
              <Button
                onClick={() => {
                  applyImport(pending.file, 'replace')
                  setPending(null)
                  setMessage(t('settings.importDone'))
                }}
              >
                {t('settings.importReplace')}
              </Button>
              <Button variant="ghost" onClick={() => setPending(null)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}
        {confirmReset && (
          <div className="my-3 rounded-[var(--radius)] border border-accent p-4 grid gap-3" role="alertdialog">
            <p>{t('settings.resetConfirm')}</p>
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={async () => {
                  await resetAll()
                  setConfirmReset(false)
                  setMessage(t('settings.resetDone'))
                }}
              >
                {t('common.confirm')}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}
        {message && (
          <p role="status" className="my-3 text-ok">
            {message}
          </p>
        )}

        <div className="py-4 grid gap-3">
          <button type="button" onClick={tapVersion} className="justify-self-start text-sm text-muted tabular">
            {t('settings.version', { v: VERSION })}
          </button>
          {p.settings.virtualMidi && (
            <Row label={t('settings.virtualMidi')}>
              <Toggle id="set-vmidi" label={t('settings.virtualMidi')} checked={p.settings.virtualMidi} onChange={(virtualMidi) => p.updateSettings({ virtualMidi })} />
            </Row>
          )}
          {p.settings.virtualMidi && <VirtualMidiPanel />}
        </div>
      </div>
    </Page>
  )
}

export function Toggle({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-14 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-line'}`}
    >
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-bg shadow transition-all ${checked ? 'left-7' : 'left-1'}`} />
    </button>
  )
}
