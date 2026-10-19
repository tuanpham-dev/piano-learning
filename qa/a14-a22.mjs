const URL = 'http://127.0.0.1:5317'
export default async ({ page, shot, log }) => {
  await page.goto(URL); await page.click("text=I'm an adult"); await page.click("text=Let's play")
  await page.goto(URL + '/songs'); await page.waitForSelector('[data-song]')
  const ids = await page.evaluate(() => [...document.querySelectorAll('[data-song]')].map((a) => [a.dataset.song, a.innerText.split('\n').pop()]))
  const rows = []
  for (const [id, diff] of ids) {
    await page.goto(URL + '/songs/' + id); await page.waitForSelector('.vf-stavenote')
    const fingers = await page.evaluate(() => [...document.querySelectorAll('.staff-host svg text')].filter((t) => /^[1-5]$/.test(t.textContent)).length)
    await page.evaluate(() => (window.__notes = []))
    await page.click('text=Listen'); await page.waitForTimeout(1500)
    const played = await page.evaluate(() => window.__notes.length)
    rows.push(`${id} (${diff}): fingering ${fingers}, notes sounded in 1.5 s: ${played}`)
  }
  log('A14:\n  ' + rows.join('\n  '))
  // A22: finish a song, then dashboard + kid stickers
  await page.goto(URL + '/settings'); for (let i = 0; i < 5; i++) await page.click('text=Version 1.0.0')
  await page.goto(URL + '/songs/twinkle?hands=R&mode=perform'); await page.waitForSelector('.vf-stavenote')
  await page.click('text=Virtual MIDI'); await page.click('[data-script="song-perfect"]')
  await page.waitForSelector('text=· Perform', { timeout: 60000 })
  await page.goto(URL + '/progress'); await page.waitForSelector('[data-testid=week-chart]')
  log('A22 adult: chart bars', await page.locator('[data-testid=week-chart] rect').count(), '| best:', (await page.locator('[data-testid=best-scores]').innerText()).replace(/\n/g, ' '), '| badges earned:', await page.evaluate(() => window.__dev.useProgress.getState().badges.join(',')))
  await shot('a22-dashboard')
  await page.goto(URL + '/settings'); await page.click('#set-mode >> text=Kid')
  await page.goto(URL + '/progress'); await page.waitForSelector('[data-testid=stickers]')
  log('A22 kid stickers:', await page.evaluate(() => [...document.querySelectorAll('[data-sticker]')].map((b) => `${b.dataset.sticker}:${b.dataset.earned}`).join(' ')), '| total stars', await page.locator('[data-testid=total-stars]').innerText())
  await shot('a22-kid-stars')
}
