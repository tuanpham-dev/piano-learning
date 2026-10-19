export default async ({ page, shot }) => {
  await page.goto('http://127.0.0.1:5317'); await page.click("text=I'm an adult"); await page.click("text=Let's play")
  await page.goto('http://127.0.0.1:5317/rhythm'); await page.click('#rh-level >> text=Level 3'); await page.waitForTimeout(400)
  await page.locator('main svg').first().screenshot({ path: 'qa/out/rh-staff.png' })
}
