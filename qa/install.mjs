import { chromium } from 'playwright-core'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const dir = mkdtempSync(join(process.env.QA_TMP ?? tmpdir(), 'pwa-'))
const ctx = await chromium.launchPersistentContext(dir, { executablePath: '/usr/bin/google-chrome', headless: true })
const page = await ctx.newPage()
await page.goto('http://127.0.0.1:5318')
await page.evaluate(async () => { await navigator.serviceWorker.ready })
await page.reload(); await page.waitForTimeout(1500)
const cdp = await ctx.newCDPSession(page)
console.log('installability errors:', JSON.stringify((await cdp.send('Page.getInstallabilityErrors')).installabilityErrors))
await ctx.close()
