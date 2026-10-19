import { useT } from '../app/i18n'
import { Button } from '../components/PrimaryButton'
import { Icon } from '../components/Icon'
import { useEditor } from '../store/editor'

/** Connect AI button (live MCP bridge). Wired in phase 4. */
export function AiConnectButton() {
  const { t, kid } = useT()
  if (kid) return null
  return (
    <Button disabled>
      <Icon name="sparkle" /> {t('editor.connectAi')}
    </Button>
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
            <span className="font-mono">{a.tool}</span> · {a.summary}
          </li>
        ))}
      </ul>
    </section>
  )
}
