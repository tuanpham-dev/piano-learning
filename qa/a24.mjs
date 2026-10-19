export default async ({ page, shot, log }) => {
  await page.goto('http://127.0.0.1:5317/')
  await page.click("text=I'm an adult"); await page.click("text=Let's play")
  await page.goto('http://127.0.0.1:5317/free')
  await page.waitForSelector('[data-midi="60"]')
  // Headless Chrome never blocks audio, so simulate the blocked state the sampler reports.
  await page.evaluate(() => window.__dev.useAudioStatus.setState({ needsGesture: true, running: false }))
  await page.waitForTimeout(100)
  log('gate visible:', await page.locator('text=Tap to enable sound').count())
  await shot('a24-gate')
  await page.locator('text=Tap to enable sound').click({ force: true, noWaitAfter: true, trial: false }).catch(() => {})
  await page.waitForTimeout(200)
  log('gate after tap:', await page.locator('text=Tap to enable sound').count())
  await page.evaluate(() => (window.__notes = []))
  await page.locator('[data-midi="60"]').click({ position: { x: 5, y: 100 } })
  log('note after tap:', await page.evaluate(() => window.__notes.map((n) => n.midi)))
}
