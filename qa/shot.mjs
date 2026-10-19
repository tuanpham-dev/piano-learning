// Headless QA helper: node qa/shot.mjs <script.mjs>  — the script exports default async ({ page, shot, log }) => {}
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const OUT = process.env.QA_OUT ?? 'qa/out'
mkdirSync(OUT, { recursive: true })
const mod = await import(new URL(process.argv[2], `file://${process.cwd()}/`).href)
const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: [...(process.env.QA_STRICT_AUDIO ? [] : ['--autoplay-policy=no-user-gesture-required']), '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
})
const opts = mod.context ?? { viewport: { width: 1280, height: 800 } }
const context = await browser.newContext(opts)
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(`${m.type()}: ${m.text()}`))
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` })
const log = (...a) => console.log(...a)
try {
  await mod.default({ page, context, shot, log, browser })
} catch (e) {
  console.log('SCRIPT ERROR', e)
  await shot('error')
} finally {
  if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'))
  await browser.close()
}
