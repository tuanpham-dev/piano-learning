// A14: new authoring screens in Vietnamese (no English left), kid record controls ≥ 56 px; axe on the new screens.
import { readFileSync } from 'node:fs'
const AXE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8')
const URL = 'http://127.0.0.1:5317'
const EN = /\b(the|and|Play|Start|notes?|Settings|Listen|Tempo|Right|Left|Back|Next|Stop|Import|Easy|Medium|Hard|Level|Record|Recording|Save|Saved|Export|Undo|Redo|Bar|Bars|Text|Edit|Review|Warnings?|Connect|Disconnect|Duplicate|Rename|Delete|Discard|Title|Composer|Key|Time|Hand|Length|Dotted|rest|Finger|None|song|songs|file|beats?|Check|problems|unsaved|changes)\b/g
const press = (page, ms) => page.evaluate((xs) => xs.forEach((x) => { window.__dev.emitNote('on', x, 'virtual'); window.__dev.emitNote('off', x, 'virtual') }), ms)
const axe = async (page) => { await page.addScriptTag({ content: AXE }); return page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((v) => v.impact === 'critical' || v.impact === 'serious').map((v) => `${v.id}×${v.nodes.length} ${v.nodes[0].target.join(' ').slice(0, 60)}`)) }
export default async ({ browser, log }) => {
  const check = async (page, label) => {
    await page.waitForTimeout(400)
    const text = (await page.evaluate(() => document.querySelector("main")?.innerText ?? document.body.innerText)).replace(/[\w-]+\.song\.json|\.song\.json/g, "")
    const hits = [...new Set(text.match(EN) ?? [])]
    log(`vi ${label}:`, hits.length ? hits.join(', ') : 'all Vietnamese', '| axe:', (await axe(page)).join(' | ') || 'clean')
  }
  // Adult
  const a = await browser.newContext({ viewport: { width: 1180, height: 820 } }); const page = await a.newPage()
  await page.goto(URL); await page.click('text=Tiếng Việt'); await page.click('text=Tôi là người lớn'); await page.click('text=Bắt đầu chơi')
  await page.goto(URL + '/songs'); await check(page, 'adult /songs')
  await page.click('[data-menu="twinkle"]'); await check(page, 'adult song menu')
  await page.keyboard.press('Escape')
  await page.goto(URL + '/songs/import'); await check(page, 'adult /songs/import')
  await page.setInputFiles('#import-file', 'qa/fixtures/bad-bars.song.json'); await page.waitForURL(/review/); await check(page, 'adult review (warnings)')
  await page.goto(URL + '/songs'); await page.waitForFunction(() => window.__dev)
  await page.getByRole('button', { name: /Bài mới/ }).click(); await page.waitForURL(/edit/)
  await page.locator('main').click({ position: { x: 5, y: 5 } })
  await press(page, [60]); await page.waitForTimeout(150)
  await check(page, 'adult editor (play)')
  await page.getByRole('radio', { name: 'Văn bản' }).click()
  await page.locator('#ed-text-R').fill('C4q D4q E4q F4q G4q |'); await check(page, 'adult editor (text, error)')
  await page.locator('a[href="/songs"]').first().click(); await page.waitForSelector('[role=dialog]'); await check(page, 'adult leave dialog')
  await page.getByRole('button', { name: /Bỏ/ }).first().click()
  await page.goto(URL + '/settings'); await check(page, 'adult settings')
  await page.goto(URL + '/free'); await check(page, 'adult free play (record)')
  await a.close()
  // Kid
  const k = await browser.newContext({ viewport: { width: 1180, height: 820 } }); const kp = await k.newPage()
  await kp.goto(URL); await kp.click('text=Tiếng Việt'); await kp.fill('#welcome-name', 'Linh'); await kp.click('text=Mình là trẻ em'); await kp.click('text=Bắt đầu chơi')
  await kp.goto(URL + '/free'); await kp.waitForFunction(() => window.__dev); await check(kp, 'kid free play')
  await kp.evaluate(() => { window.__t0 = null; window.__dev.onClick((i, a, t) => { if (window.__t0 === null) window.__t0 = t }) })
  await kp.getByRole('button', { name: 'Ghi một bài' }).click()
  await kp.waitForFunction(() => window.__t0 !== null)
  const bpm = await kp.evaluate(() => window.__dev.useMetronome.getState().bpm)
  await kp.evaluate((bpm) => { const spb = 60 / bpm, s = window.__t0 + 4 * spb; [60, 62, 64, 65].forEach((m, i) => { window.__dev.emitNote('on', m, 'virtual', 90, s + i * spb); window.__dev.emitNote('off', m, 'virtual', 0, s + (i + 0.9) * spb) }) }, bpm)
  await kp.waitForTimeout(8 * 60 / bpm * 1000)
  await kp.getByRole('button', { name: 'Dừng' }).click()
  await kp.waitForSelector('[data-testid=celebration]'); await check(kp, 'kid record saved')
  log('kid record title:', await kp.locator('[data-testid=kid-record-title]').innerText(), '| min control px:', await kp.evaluate(() => Math.round(Math.min(...[...document.querySelectorAll('[data-testid^=kid-record] button')].map((b) => b.getBoundingClientRect().height)))))
  await kp.screenshot({ path: 'qa/out/a14-kid-record-vi.png' })
  await kp.goto(URL + '/songs'); await check(kp, 'kid /songs')
  log('kid library min card px:', await kp.evaluate(() => Math.round(Math.min(...[...document.querySelectorAll('main a[href^="/songs/"]')].map((b) => Math.min(b.getBoundingClientRect().height, b.getBoundingClientRect().width))))))
  await k.close()
}
