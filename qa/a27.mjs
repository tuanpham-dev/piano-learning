const URL = 'http://127.0.0.1:5317'
export const context = { viewport: { width: 1280, height: 900 }, permissions: ['microphone'] }
export default async ({ page, shot, log }) => {
  await page.goto(URL)
  await page.click("text=I'm an adult"); await page.click("text=Let's play")
  // Part 1: both hands + mic → asks which hand
  await page.goto(URL + '/songs/twinkle'); await page.waitForSelector('.staff-host svg')
  await page.check('#in-mic')
  log('asks which hand:', await page.waitForSelector('text=Which hand will you play?', { timeout: 3000 }).then(() => 1, () => 0))
  await page.click('[role=dialog] >> text=Right')
  await page.click('text=▶ Start')
  const t0 = Date.now()
  let hits = 0
  while (Date.now() - t0 < 12000) {
    await page.waitForTimeout(500)
    hits = await page.evaluate(() => window.__pa.states.filter((s) => s === 'hit').length)
    if (hits >= 8) break
  }
  log('notes advanced by mic tones:', hits, 'heard pill:', await page.locator('text=/Hearing|Listening/').first().innerText().catch(() => '-'))
  await shot('a27-mic-twinkle')
  // Part 2: Minuet left hand opens on a chord → notice
  await page.goto(URL + '/songs/minuet-in-g'); await page.waitForSelector('.staff-host svg')
  await page.click('#pa-hands >> text=Left')
  await page.click('text=▶ Start'); await page.waitForTimeout(600)
  log('chord notice:', await page.locator('text=Use the on-screen keys or a MIDI piano for this part.').count(), '| due', await page.evaluate(() => window.__pa.dueMidis()))
  await shot('a27-minuet-chord')
  await page.click('#pa-mode >> text=Perform')
  log('mic disabled in perform:', await page.locator('#in-mic').isDisabled())
}
