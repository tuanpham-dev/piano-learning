const URL = 'http://127.0.0.1:5317'
export const context = { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: false }
export default async ({ page, shot, log }) => {
  await page.goto(URL)
  await page.fill('#welcome-name', 'Linh')
  await page.click("text=I'm a kid"); await page.click("text=Let's play")
  await page.goto(URL + '/songs')
  await page.waitForTimeout(400)
  await shot('p3-kid-library')
  await page.goto(URL + '/songs/ode-to-joy')
  await page.waitForSelector('.staff-host svg')
  await page.click('text=▶ Play'); await page.waitForTimeout(600)
  await shot('p3-kid-play')
  const keyW = await page.locator('[data-midi="60"]').evaluate((e) => e.getBoundingClientRect().width)
  log('kid white key width px:', keyW)
  log('kid colored note heads:', await page.evaluate(() => new Set([...document.querySelectorAll('.staff-host svg path')].map((p) => p.getAttribute('fill')).filter((f) => f && f.startsWith('#') && f !== '#3b2a12')).size))
}
