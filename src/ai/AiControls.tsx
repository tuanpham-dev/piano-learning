import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../app/i18n'
import { Button } from '../components/PrimaryButton'
import { Icon } from '../components/Icon'
import { useEditor } from '../store/editor'
import { connectAi, disconnectAi, resumeAi, useAi } from './bridge'

/** Connect AI toggle (live MCP bridge, adult only). */
export function AiConnectButton() {
  const { t, kid } = useT()
  const status = useAi((s) => s.status)
  if (kid) return null
  const on = status !== 'off'
  return (
    <Button onClick={() => (on ? disconnectAi() : connectAi())} aria-pressed={on} data-testid="ai-connect">
      <Icon name="sparkle" /> {on ? t('editor.disconnectAi') : t('editor.connectAi')}
      {on && <span className={`size-2 rounded-full ${status === 'connected' ? 'bg-ok' : 'bg-warn'}`} aria-label={t(`ai.${status}`)} />}
    </Button>
  )
}

/** Connection state and any warning, in the app's language. */
export function AiStatusLine() {
  const { t } = useT()
  const { status, warning } = useAi()
  if (status === 'off' && !warning) return null
  return (
    <p className="text-sm" role="status" data-testid="ai-status">
      {status !== 'off' && <span className="text-muted">{t(`ai.${status}`)}. </span>}
      {warning && <span className="text-warn">{t(`ai.${warning}`)}</span>}
    </p>
  )
}

/** Recent AI tool calls on this song. */
export function AiActivityList() {
  const { t } = useT()
  const activity = useEditor((s) => s.activity)
  if (!activity.length) return null
  return (
    <section className="grid gap-1 text-sm" data-testid="ai-activity">
      <strong>{t('editor.aiActivity')}</strong>
      <ul className="grid gap-0.5 list-none p-0">
        {activity.slice(0, 6).map((a) => (
          <li key={a.at + a.tool} className={a.ok ? '' : 'text-accent'}>
            <span className="font-mono">{a.tool}</span>
            {a.summary && ` · ${a.summary}`}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Inside the router: follows pages the bridge asks for, and resumes a connection after a reload. */
export function AiNavigator() {
  const nav = useNavigate()
  const goto = useAi((s) => s.goto)
  useEffect(() => resumeAi(), [])
  useEffect(() => {
    if (!goto) return
    useAi.setState({ goto: null })
    if (location.pathname !== goto) nav(goto)
  }, [goto, nav])
  return null
}
