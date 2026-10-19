// Phase 3 visual + computed-style check against the look book's xylophone mock.
const URL = 'http://127.0.0.1:5317'
export default async ({ browser, log }) => {
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, colorScheme: scheme, hasTouch: true })
    const page = await ctx.newPage()
    await page.goto(URL); await page.fill('#welcome-name', 'Linh')
    await page.click("text=I'm a kid"); await page.click("text=Let's play"); await page.waitForSelector('[data-note]')
    await page.evaluate(() => { const s = window.__dev.useProgress.getState(); s.awardBadges(['first-song', 'streak-7', 'three-star']); s.addStars(7) })
    const tile = await page.locator('main a[data-note]').first().evaluate((el) => {
      const s = getComputedStyle(el); const plate = el.querySelector('[data-plate]'); const ps = getComputedStyle(plate)
      return `tile bg ${s.backgroundColor}, border ${s.borderTopWidth} ${s.borderTopColor}, lift ${s.boxShadow} | plate ${ps.backgroundColor} / ${ps.color} | font ${s.fontFamily.split(',')[0]}`
    })
    log(`${scheme}:`, tile)
    for (const p of ['/', '/songs', '/drills', '/ear', '/lessons', '/progress', '/welcome-preview']) {
      if (p === '/welcome-preview') continue
      await page.goto(URL + p); await page.waitForTimeout(500)
      if (p === '/ear') { await page.click('#ear-type >> text=Chord quality').catch(() => {}); await page.click('[data-primary]'); await page.waitForTimeout(400) }
      if (p === '/drills') { await page.click('[data-primary]'); await page.waitForTimeout(400) }
      await page.screenshot({ path: `qa/out/restyle-kid-${scheme}${p.replace(/\//g, '_')}.png` })
    }
    await ctx.close()
  }
}
