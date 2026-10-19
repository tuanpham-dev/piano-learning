const URL = 'http://127.0.0.1:5317'
export default async ({ page, log }) => {
  await page.goto(URL)
  await page.click("text=I'm an adult"); await page.click("text=Let's play")
  await page.goto(URL + '/songs/ode-to-joy'); await page.waitForSelector('.staff-host svg')
  const vis = () => page.evaluate(() => ({ staff: !!document.querySelector('.staff-host svg'), lane: !!document.querySelector('canvas') }))
  await page.click('#pa-view >> text=Staff'); log('staff only', await vis())
  await page.click('#pa-view >> text=Falling notes'); log('lane only', await vis())
  await page.reload(); await page.waitForTimeout(800); log('after reload', await vis())
  await page.click('#pa-view >> text=Both'); log('both', await vis())
  // L/R colors differ in adult both-hands mode
  log('note fills:', await page.evaluate(() => [...new Set([...document.querySelectorAll('.staff-host svg path')].map((p) => p.getAttribute('fill')).filter(Boolean))]))
}
