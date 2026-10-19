export default async ({ page, log }) => {
  await page.goto('http://127.0.0.1:5317/dev/mascot'); await page.waitForTimeout(800)
  await page.screenshot({ path: 'qa/out/restyle-mascot.png', fullPage: true })
  log('mascots rendered:', await page.locator('svg.mascot').count())
}
