// T7: on kid Drills, Do's color equals the asked note's color for 5 questions.
const HEX = { C: '#e63946', D: '#f4811f', E: '#f6c90e', F: '#3fb34f', G: '#1fa8b5', A: '#2d5fd1', B: '#8e44ad' }
export default async ({ page, log }) => {
  await page.goto('http://127.0.0.1:5317'); await page.click("text=I'm a kid"); await page.click("text=Let's play")
  await page.goto('http://127.0.0.1:5317/drills'); await page.click('[data-primary]')
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
  const rows = []
  for (let i = 0; i < 5; i++) {
    await page.waitForFunction(() => /Which key/.test(document.querySelector('main').innerText))
    const label = await page.locator('main div[role=img][aria-label]').first().getAttribute('aria-label')
    const m = /^([A-G])(♯?)(-?\d)$/.exec(label)
    const doColor = await page.locator('svg.mascot').first().getAttribute('data-color')
    rows.push(`${label}: Do ${doColor} ${doColor === HEX[m[1]] ? '✓' : '✗ expected ' + HEX[m[1]]}`)
    const midi = (Number(m[3]) + 1) * 12 + names.indexOf(m[1] + m[2])
    await page.evaluate((x) => { window.__dev.emitNote('on', x, 'virtual'); window.__dev.emitNote('off', x, 'virtual') }, midi)
    await page.waitForTimeout(800)
  }
  log(rows.join('\n'))
  await page.screenshot({ path: 'qa/out/restyle-drills-kid.png' })
}
