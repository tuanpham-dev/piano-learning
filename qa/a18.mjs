const URL = 'http://127.0.0.1:5317'
const cur = (page) => page.evaluate(() => { const e = document.querySelector('[data-testid=ear-q]'); return { notes: e.dataset.notes.split(',').map(Number), answer: e.dataset.answer } })
const press = (page, ms) => page.evaluate((xs) => xs.forEach((x) => { window.__dev.emitNote('on', x, 'virtual'); window.__dev.emitNote('off', x, 'virtual') }), ms)
async function round(page, type, how) {
  await page.goto(URL + '/ear')
  await page.click(`#ear-type >> text=${type}`)
  await page.click('text=Start round')
  for (let i = 0; i < 10; i++) {
    await page.waitForSelector('[data-testid=ear-q]', { state: 'attached' })
    await page.waitForTimeout(150)
    const q = await cur(page)
    if (how === 'keys-reversed') await press(page, [...q.notes].reverse())
    else if (how === 'keys') await press(page, q.notes)
    else await page.click(`[data-choice="${q.answer}"]`)
    await page.waitForTimeout(900)
  }
  await page.waitForSelector('[data-testid=round-summary]')
  return (await page.locator('[data-testid=round-summary]').innerText()).replace(/\n/g, ' | ')
}
export default async ({ page, log }) => {
  await page.goto(URL)
  await page.click("text=I'm an adult"); await page.click("text=Let's play")
  log('interval by two keys (reversed order):', await round(page, 'Interval', 'keys-reversed'))
  log('chord quality by button:', await round(page, 'Chord quality', 'button'))
  log('melody played in order:', await round(page, 'Melody playback', 'keys'))
  log('stored:', await page.evaluate(() => JSON.stringify(Object.fromEntries(['interval', 'chord', 'melody'].map((k) => [k, window.__dev.useProgress.getState().drills[k]])))))
}
