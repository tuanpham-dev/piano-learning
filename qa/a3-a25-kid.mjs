const URL = 'http://127.0.0.1:5317'
const primaries = (page) => page.evaluate(() => [...document.querySelectorAll('[data-primary]')].filter((e) => e.offsetParent).length)
const pctText = (page) => page.evaluate(() => (document.querySelector('main')?.innerText.match(/\d+\s?%|\d+\s?ms\b/g) ?? []).join(','))
const minTarget = (page, sel) => page.evaluate((s) => { const els = [...document.querySelectorAll(s)].filter((e) => e.offsetParent); return els.length ? Math.round(Math.min(...els.map((e) => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height)))) : null }, sel)
async function drillRound(page, wrongFirst) {
  await page.click('text=Start ▶')
  for (let i = 0; i < 10; i++) {
    await page.waitForFunction(() => /Which key|Phím nào/.test(document.querySelector('main').innerText), null, { timeout: 5000 })
    const label = await page.locator('main div[role=img][aria-label]').first().getAttribute('aria-label')
    const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
    const m = /^([A-G]♯?)(-?\d)$/.exec(label)
    const midi = (Number(m[2]) + 1) * 12 + names.indexOf(m[1])
    const ans = wrongFirst && i === 0 ? midi + 2 : midi
    await page.evaluate((x) => { window.__dev.emitNote('on', x, 'virtual'); window.__dev.emitNote('off', x, 'virtual') }, ans)
    await page.waitForTimeout(150)
    if (i === 0) {
      const mood = await page.locator('main svg.mascot').first().getAttribute('class')
      const msg = await page.locator('main [aria-live=polite]').first().innerText()
      console.log(`  mascot after ${wrongFirst ? 'wrong' : 'right'} answer: ${mood} — "${msg.split('\n')[0]}"`)
    }
    await page.waitForTimeout(wrongFirst && i === 0 ? 1500 : 700)
  }
}
export default async ({ browser, log }) => {
  for (const motion of ['no-preference', 'reduce']) {
    const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, reducedMotion: motion })
    const page = await ctx.newPage()
    await page.goto(URL)
    await page.fill('#welcome-name', 'Linh')
    await page.click("text=I'm a kid"); await page.click("text=Let's play"); await page.waitForSelector('main a[href^="/"]')
    log(`— reduced motion: ${motion}`)
    log('Home: primaries', await primaries(page), '| min tile', await minTarget(page, 'main a[href^="/"]'), '| % or ms:', (await pctText(page)) || 'none', '| mascot', await page.locator('main svg.mascot').count())
    await page.goto(URL + '/songs/twinkle'); await page.waitForSelector('.vf-stavenote')
    log('Play-along: primaries', await primaries(page), '| min white key', await page.evaluate(() => Math.round(Math.min(...[...document.querySelectorAll('[data-midi]')].filter((k) => !/key-black/.test(k.style.background) && k.getBoundingClientRect().height > 100).map((k) => k.getBoundingClientRect().width)))), '| key dots', await page.evaluate(() => new Set([...document.querySelectorAll('[data-midi] span')].map((s) => s.style.background).filter(Boolean)).size), 'colors | % or ms:', (await pctText(page)) || 'none')
    await page.goto(URL + '/lessons'); await page.waitForSelector('[data-island]')
    log('Lessons: journey map islands', await page.locator('[data-island]').count(), '| primaries', await primaries(page))
    await page.goto(URL + '/drills'); await page.waitForSelector('[data-primary]')
    log('Drills idle: primaries', await primaries(page), '| min button', await minTarget(page, 'main button:not([data-vmidi])'))
    await page.evaluate(() => (window.__chimes = 0))
    await drillRound(page, true)
    await page.waitForSelector('[data-testid=round-summary]')
    await page.waitForTimeout(400)
    log('Drill done: confetti canvas', await page.evaluate(() => document.querySelectorAll('canvas').length > 0 && [...document.querySelectorAll('canvas')].some((c) => c.style.position === 'fixed')), '| chimes', await page.evaluate(() => window.__chimes), '| stars svg', await page.locator('[data-testid=round-summary] [role=img][aria-label*=stars]').count(), '| % or ms:', (await pctText(page)) || 'none', '| primaries', await primaries(page))
    if (motion === 'reduce') {
      log('mascot animation under reduced motion:', await page.evaluate(() => getComputedStyle(document.querySelector('svg.mascot')).animationName))
    }
    await page.screenshot({ path: `qa/out/a3-${motion}.png` })
    await ctx.close()
  }
}
