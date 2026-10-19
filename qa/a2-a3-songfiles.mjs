// A2: export Ode to Joy, import it in a fresh profile, review, save, compare notes. A3: warnings and unreadable files.
const URL = 'http://127.0.0.1:5317'
async function adult(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true })
  const page = await ctx.newPage()
  await page.goto(URL); await page.click("text=I'm an adult"); await page.click("text=Let's play")
  return { ctx, page }
}
export default async ({ browser, log }) => {
  const a = await adult(browser)
  await a.page.goto(URL + '/songs'); await a.page.waitForSelector('[data-menu="ode-to-joy"]')
  await a.page.click('[data-menu="ode-to-joy"]')
  const [dl] = await Promise.all([a.page.waitForEvent('download'), a.page.click('text=Export song file')])
  await dl.saveAs('qa/out/ode-to-joy.song.json')
  log('A2 exported:', dl.suggestedFilename())
  const orig = await a.page.evaluate(async () => { const m = await import('/src/content/songs/index.ts'); const s = m.bundledSongs.find((x) => x.id === 'ode-to-joy'); return JSON.stringify([s.hands.R.notes, s.hands.L.notes]) })
  await a.ctx.close()

  const b = await adult(browser) // fresh profile
  await b.page.goto(URL + '/songs/import')
  await b.page.setInputFiles('#import-file', 'qa/out/ode-to-joy.song.json')
  await b.page.waitForURL(/review/)
  await b.page.waitForSelector('[data-testid=score-lines] .vf-stavenote')
  log('A2 review:', (await b.page.locator('main').innerText()).split('\n').slice(0, 3).join(' | '), '| staff lines:', await b.page.locator('[data-line]').count(), '|', await b.page.locator('[data-testid=review-warnings]').innerText())
  await b.page.evaluate(() => (window.__notes = []))
  await b.page.getByRole('button', { name: 'Listen' }).click(); await b.page.waitForTimeout(1200)
  log('A2 listen notes:', await b.page.evaluate(() => window.__notes.length))
  await b.page.getByRole('button', { name: 'Save to My songs' }).click()
  await b.page.waitForURL(/\/songs\/my-ode-to-joy-/)
  const saved = await b.page.evaluate(() => { const s = window.__dev.useSession.getState().importedSongs.find((x) => x.id.startsWith('my-ode-to-joy')); return s && JSON.stringify([s.hands.R.notes, s.hands.L.notes]) })
  const norm = (j) => JSON.stringify(JSON.parse(j).map((h) => h.map((n) => [n.midi, n.startBeat, n.beats, n.finger ?? 0]).sort((x, y) => x[1] - y[1] || x[0] - y[0])))
  log('A2 notes match original:', norm(saved) === norm(orig))
  await b.page.goto(URL + '/songs')
  log('A2 in My songs:', await b.page.locator('#my-songs-h + div [data-song]').count())
  // A3
  await b.page.goto(URL + '/songs/import')
  await b.page.setInputFiles('#import-file', 'qa/fixtures/bad-bars.song.json')
  await b.page.waitForURL(/review/)
  log('A3 warnings:', (await b.page.locator('[data-testid=review-warnings]').innerText()).replace(/\n/g, ' | '))
  await b.page.screenshot({ path: 'qa/out/a3-review.png', fullPage: true })
  await b.page.getByRole('button', { name: 'Discard' }).click()
  await b.page.goto(URL + '/songs/import')
  await b.page.setInputFiles('#import-file', 'qa/fixtures/broken.song.json')
  await b.page.waitForSelector('[role=alert]')
  log('A3 unreadable:', await b.page.locator('[role=alert]').innerText(), '| my songs:', await b.page.evaluate(() => window.__dev.useSession.getState().importedSongs.length))
}
