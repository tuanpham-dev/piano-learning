const URL = 'http://127.0.0.1:5317'
export const context = { viewport: { width: 1280, height: 900 }, permissions: ['microphone'] }
export default async ({ page, shot, log }) => {
  await page.goto(URL)
  await page.click("text=I'm an adult"); await page.click("text=Let's play")
  await page.goto(URL + '/songs/twinkle'); await page.waitForTimeout(500)
  log('mic offered on rhythm:', await page.goto(URL + '/rhythm').then(() => page.waitForTimeout(400)).then(() => page.locator('#in-mic').count()))
  await page.goto(URL + '/drills')
  await page.check('#in-mic')
  await page.waitForSelector('text=/Hearing A4/', { timeout: 8000 }).then(() => log('indicator: Hearing A4 ✓'), () => log('indicator: not seen'))
  await shot('a9-mic-indicator')
  await page.click('text=Start round')
  let sawA4Correct = false
  const seen = []
  for (let i = 0; i < 40 && !sawA4Correct; i++) {
    await page.waitForTimeout(400)
    const text = await page.locator('main [aria-live=polite]').first().innerText()
    const label = await page.locator('main [role=img][aria-label]').first().getAttribute('aria-label').catch(() => null)
    if (text.startsWith('Correct!')) { sawA4Correct = true; seen.push(`correct on ${label}`) }
    else if (text.startsWith('That was')) seen.push(text.split('\n')[0])
  }
  log('A9 drill accepted A4 from mic:', sawA4Correct, '|', [...new Set(seen)].slice(0, 4).join(' / '))
}
