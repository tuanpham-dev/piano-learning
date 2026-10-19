// Editor shows the whole song: every line of bars, the cursor on the edited bar, click a bar to select it.
const URL = 'http://127.0.0.1:5317'
export default async ({ page, log }) => {
  await page.goto(URL); await page.click("text=I'm an adult"); await page.click("text=Let's play")
  await page.goto(URL + '/songs/import'); await page.setInputFiles('#import-file', 'qa/fixtures/twinkle-g.song.json')
  await page.waitForURL(/review/); await page.getByRole('button', { name: 'Edit first' }).click(); await page.waitForURL(/edit/)
  await page.waitForSelector('[data-testid=ed-score] .vf-stavenote')
  log('lines:', await page.locator('[data-testid=ed-score] [data-line]').count(), '| bars in strip:', await page.locator('[data-bar]').count())
  const visibleBand = () => page.evaluate(() => [...document.querySelectorAll('[data-testid=ed-score] [data-line]')].filter((l) => l.querySelector('[data-testid=staff-cursor]')?.style.opacity === '1').map((l) => l.dataset.line))
  log('cursor on line:', await visibleBand())
  await page.screenshot({ path: 'qa/out/editor-score-top.png' })
  // Click the third bar of line 4 (bar 15).
  const line = page.locator('[data-testid=ed-score] [data-line="4"]')
  const box = await line.boundingBox()
  const barW = (box.width - 96) / 4
  await line.click({ position: { x: 88 + barW * 2 + barW / 2, y: box.height / 2 } })
  await page.waitForTimeout(400)
  log('after click: selected bar', await page.locator('[data-bar][aria-current=true]').getAttribute('data-bar'), '| cursor on line:', await visibleBand())
  log('tokens:', (await page.locator('[data-testid=ed-bar-tokens]').innerText()).replace(/\n/g, ' '))
  // Selecting the last bar scrolls its line into view.
  await page.click('[data-bar="21"]'); await page.waitForTimeout(600)
  log('bar 21 line in view:', await page.evaluate(() => { const c = document.querySelector('[data-testid=ed-score]'); const l = c.querySelector('[data-line="6"]'); const a = c.getBoundingClientRect(), b = l.getBoundingClientRect(); return b.top >= a.top - 1 && b.bottom <= a.bottom + 1 }), '| cursor on line:', await visibleBand())
  await page.screenshot({ path: 'qa/out/editor-score-end.png' })
}
