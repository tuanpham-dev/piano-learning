import { chromium } from 'playwright-core'
const URL = 'http://127.0.0.1:5317'
const sizes = [['ipad-land', 1180, 820], ['ipad-port', 820, 1180], ['iphone', 390, 844]]
const pages = ['/', '/songs/ode-to-joy', '/drills', '/ear', '/rhythm', '/free', '/reference', '/lessons', '/progress', '/settings']
export default async ({ browser, log }) => {
  for (const mode of ['adult', 'kid']) {
    for (const [name, w, h] of sizes) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: name === 'iphone', deviceScaleFactor: 1 })
      const page = await ctx.newPage()
      await page.goto(URL)
      await page.click(mode === 'kid' ? "text=I'm a kid" : "text=I'm an adult")
      await page.click("text=Let's play")
      const issues = []
      for (const p of pages) {
        await page.goto(URL + p)
        await page.waitForTimeout(450)
        const r = await page.evaluate(() => {
          const over = document.documentElement.scrollWidth - document.documentElement.clientWidth
          const whites = [...document.querySelectorAll('[data-midi]')].filter((k) => k.getBoundingClientRect().height > 60 && !/key-black/.test(k.style.background))
          const minKey = whites.length ? Math.min(...whites.map((k) => k.getBoundingClientRect().width)) : null
          return { over, minKey }
        })
        if (r.over > 0) issues.push(`${p}: horizontal overflow ${r.over}px`)
        if (r.minKey !== null && r.minKey < 55) issues.push(`${p}: key ${r.minKey.toFixed(0)}px`)
        if (p === '/songs/ode-to-joy') await page.screenshot({ path: `qa/out/a23-${mode}-${name}-play.png` })
      }
      log(`${mode} ${name}:`, issues.length ? issues.join('; ') : 'ok')
      await ctx.close()
    }
  }
}
