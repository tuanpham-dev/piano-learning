export default async ({ page, log }) => {
  await page.goto('http://127.0.0.1:5317')
  await page.click("text=I'm a kid"); await page.click("text=Let's play")
  await page.goto('http://127.0.0.1:5317/songs/twinkle'); await page.waitForSelector('.staff-host svg')
  log(await page.evaluate(() => { const g = document.querySelector('.staff-host svg .vf-stavenote'); return g ? g.outerHTML.slice(0, 1500) : 'no stavenote' }))
}
