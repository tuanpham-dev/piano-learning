import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../app/Layout'
import { useT } from '../app/i18n'
import { NoNotesError, parseMidiFile, suggestMapping, toSong, type ParsedMidi, type TrackRole } from '../engine/midi-import'
import { useSession } from '../store/session'
import { Button } from '../components/PrimaryButton'

export function ImportMidiPage() {
  const { t } = useT()
  const nav = useNavigate()
  const add = useSession((s) => s.addImportedSong)
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<{ midi: ParsedMidi; file: string } | null>(null)
  const [mapping, setMapping] = useState<Record<number, TrackRole>>({})
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const read = async (f: File | undefined) => {
    if (!f) return
    setError(null)
    try {
      const midi = parseMidiFile(new Uint8Array(await f.arrayBuffer()))
      setParsed({ midi, file: f.name })
      setMapping(suggestMapping(midi))
      setTitle(
        f.name
          .replace(/\.midi?$/i, '')
          .replace(/[_-]+/g, ' ')
          .trim(),
      )
    } catch (e) {
      setParsed(null)
      setError(e instanceof NoNotesError ? t('importer.noNotes', { file: f.name }) : String(e))
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const save = () => {
    if (!parsed) return
    try {
      const song = toSong(parsed.midi, mapping, title || parsed.file)
      add(song)
      nav(`/songs/${song.id}`)
    } catch {
      setError(t('importer.noNotes', { file: parsed.file }))
    }
  }

  return (
    <Page title={t('importer.title')} back="/songs">
      <div className="max-w-2xl grid gap-4">
        <p className="text-muted">{t('importer.hint')}</p>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            void read(e.dataTransfer.files[0])
          }}
          className={`grid place-items-center gap-3 rounded-[var(--radius)] border-2 border-dashed p-8 text-center ${dragging ? 'border-accent bg-accent/5' : 'border-line'}`}
        >
          <span>{t('importer.drop')}</span>
          <Button onClick={() => fileRef.current?.click()}>{t('importer.choose')}</Button>
          <input ref={fileRef} id="import-file" type="file" accept=".mid,.midi,audio/midi,audio/x-midi" hidden onChange={(e) => void read(e.target.files?.[0])} />
        </div>
        {error && (
          <p role="alert" className="text-accent">
            {error}
          </p>
        )}
        {parsed && (
          <div className="grid gap-3 rounded-[var(--radius)] border border-line p-4" data-testid="mapping">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{parsed.file}</strong>
              <span className="text-sm text-muted tabular">{t('importer.summary', { bpm: parsed.midi.bpm, sig: parsed.midi.timeSig.join('/') })}</span>
            </div>
            <label className="grid gap-1 text-sm" htmlFor="import-title">
              {t('importer.songTitle')}
              <input id="import-title" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded border border-line bg-bg px-3 min-h-[var(--touch)]" />
            </label>
            {parsed.midi.tracks.map((tr) => (
              <div key={tr.index} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
                <span className="min-w-0">{t('importer.track', { name: tr.name, count: tr.noteCount })}</span>
                <select
                  id={`import-track-${tr.index}`}
                  value={mapping[tr.index] ?? 'ignore'}
                  disabled={tr.noteCount === 0}
                  onChange={(e) => setMapping({ ...mapping, [tr.index]: e.target.value as TrackRole })}
                  className="rounded border border-line bg-bg px-2 min-h-9"
                >
                  <option value="R">{t('importer.right')}</option>
                  <option value="L">{t('importer.left')}</option>
                  <option value="ignore">{t('importer.ignore')}</option>
                </select>
              </div>
            ))}
            <div className="flex gap-2">
              <Button variant="primary" onClick={save} disabled={!Object.values(mapping).some((r) => r !== 'ignore')}>
                {t('importer.add')}
              </Button>
              <Button variant="ghost" onClick={() => setParsed(null)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Page>
  )
}
