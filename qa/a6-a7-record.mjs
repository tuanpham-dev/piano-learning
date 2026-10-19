// A6: adult recording at 80 BPM, notes 30 ms late, snapped and split by hand. A7: kid recording auto-named and saved.
const URL = 'http://127.0.0.1:5317'
async function recordScript(page, bpm, plays) {
  await page.evaluate(() => { window.__t0 = null; window.__offClick = window.__dev.onClick((i, a, t) => { if (window.__t0 === null) window.__t0 = t }) })
  await page.waitForTimeout(100)
  return plays
}
// Plays [midi, beat, lengthBeats] relative to beat 1 after a one-bar count-in.
const play = (page, bpm, notes) => page.evaluate(({ bpm, notes }) => {
  const spb = 60 / bpm, start = window.__t0 + 4 * spb
  for (const [m, b, len] of notes) {
    window.__dev.emitNote('on', m, 'virtual', 90, start + b * spb + 0.03)
    window.__dev.emitNote('off', m, 'virtual', 0, start + (b + len) * spb - 0.05)
  }
}, { bpm, notes })
export default async ({ browser, log, shot }) => {
  // A6
  const a = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const page = await a.newPage()
  await page.goto(URL); await page.click("text=I'm an adult"); await page.click("text=Let's play")
  await page.goto(URL + '/free'); await page.waitForFunction(() => window.__dev)
  await page.evaluate(() => { window.__dev.useMetronome.getState().setBpm(80); window.__dev.useMetronome.getState().setSig('4/4') })
  await recordScript(page)
  await page.getByRole('button', { name: 'Record' }).click()
  await page.waitForFunction(() => window.__t0 !== null)
  await page.waitForSelector('text=Get ready')
  log('A6 count-in shown')
  await play(page, 80, [[60, 0, 1], [64, 1, 1], [67, 2, 1], [48, 0, 4]])
  await page.waitForSelector('text=/Recording · bar/', { timeout: 6000 })
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: /Stop/ }).click()
  await page.waitForURL(/review/)
  const hands = await page.evaluate(async () => { const m = await import('/src/engine/song-text.ts'); const s = window.__dev.useSession.getState().pendingReview.song; const d = m.songToDraft(s); return [d.right.join(' | '), d.left.join(' | '), s.bpm] })
  log('A6 R:', hands[0], '| L:', hands[1], '| bpm', hands[2])
  log('A6 review:', (await page.locator('main').innerText()).split('\n').slice(0, 3).join(' | '))
  await page.screenshot({ path: 'qa/out/a6-review.png', fullPage: true })
  // empty adult recording
  await page.goto(URL + '/free'); await page.getByRole('button', { name: 'Record' }).click(); await page.waitForTimeout(400)
  await page.getByRole('button', { name: /Stop/ }).click()
  log('A6 empty:', await page.locator('[role=status]').innerText())
  await a.close()

  // A7
  const k = await browser.newContext({ viewport: { width: 1180, height: 820 } }); const kp = await k.newPage()
  await kp.goto(URL); await kp.fill('#welcome-name', 'Linh'); await kp.click("text=I'm a kid"); await kp.click("text=Let's play")
  await kp.goto(URL + '/free'); await kp.waitForFunction(() => window.__dev)
  const size = async () => kp.evaluate(() => Math.round(Math.min(...[...document.querySelectorAll('[data-testid^=kid-record] button')].map((b) => b.getBoundingClientRect().height))))
  const kidTake = async (notes) => {
    await recordScript(kp)
    await kp.getByRole('button', { name: /Record a song|Record again/ }).click()
    await kp.waitForFunction(() => window.__t0 !== null)
    const bpm = await kp.evaluate(() => window.__dev.useMetronome.getState().bpm)
    if (notes) await play(kp, bpm, notes)
    await kp.waitForTimeout(notes ? (4 * 60 / bpm + 4 * 60 / bpm) * 1000 : 300)
    await kp.getByRole('button', { name: 'Stop' }).click()
  }
  await recordScript(kp)
  log('A7 button height:', await size())
  await kidTake([[60, 0, 1], [62, 1, 1], [64, 2, 1], [65, 3, 1]])
  await kp.waitForSelector('[data-testid=celebration]')
  log('A7 first:', await kp.locator('[data-testid=kid-record-title]').innerText(), '| controls min height:', await size())
  await kp.screenshot({ path: 'qa/out/a7-kid-saved.png' })
  await kp.evaluate(() => (window.__notes = []))
  await kp.getByRole('button', { name: 'Listen' }).click(); await kp.waitForTimeout(1500)
  log('A7 listen notes:', await kp.evaluate(() => window.__notes?.length))
  await kidTake([[67, 0, 2], [64, 2, 2]])
  await kp.waitForSelector('[data-testid=kid-record-title]')
  log('A7 second:', await kp.locator('[data-testid=kid-record-title]').innerText())
  const before = await kp.evaluate(() => window.__dev.useSession.getState().importedSongs.length)
  await kp.goto(URL + '/free'); await kp.waitForFunction(() => window.__dev)
  await kidTake(null)
  log('A7 empty:', await kp.locator('[data-testid=kid-record]').innerText(), '| songs', before, '->', await kp.evaluate(() => window.__dev.useSession.getState().importedSongs.length))
  await kp.goto(URL + '/songs'); await kp.waitForTimeout(400)
  log('A7 library:', (await kp.locator('main').innerText()).match(/Linh's song \d/g))
  await kp.screenshot({ path: 'qa/out/a7-kid-library.png' })
  await k.close()
}
