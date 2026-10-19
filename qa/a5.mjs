const URL = 'http://127.0.0.1:5318'
export default async ({ page, context, shot, log }) => {
  await page.goto(URL)
  await page.click("text=I'm an adult"); await page.click("text=Let's play")
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.waitForTimeout(3000) // let precache finish
  log('SW controller after reload:', await page.reload().then(() => page.evaluate(() => !!navigator.serviceWorker.controller)))
  await context.setOffline(true)
  await page.reload()
  await page.waitForSelector('text=Free play', { timeout: 10000 })
  log('offline reload ok, title:', await page.title())
  await page.goto(URL + '/songs/ode-to-joy')
  await page.waitForSelector('.vf-stavenote', { timeout: 10000 })
  log('offline: Ode staff rendered; samples loaded:', await page.evaluate(() => new Promise((r) => setTimeout(() => r(performance.getEntriesByType('resource').filter((e) => e.name.includes('/samples/')).length), 1500))))
  await page.click('text=Listen')
  await page.waitForTimeout(800)
  await page.goto(URL + '/lessons/l05-c-position-left')
  log('offline lesson 5 locked view or body:', await page.locator('main').innerText().then((t) => t.slice(0, 60).replace(/\n/g, ' ')))
  await page.goto(URL + '/reference')
  await page.click('text=Play chord')
  log('offline reference ok:', await page.locator('[data-testid=ref-notes]').innerText())
  await shot('a5-offline')
}
