const URL = 'http://127.0.0.1:5317'
export const context = { viewport: { width: 1280, height: 800 }, permissions: ['midi', 'midi-sysex'] }
export default async ({ page, log }) => {
  await page.goto(URL); await page.click("text=I'm an adult"); await page.click("text=Let's play")
  await page.goto(URL + '/free'); await page.waitForTimeout(1200)
  log('input panel MIDI pill:', await page.locator('text=/connected|No MIDI devices|blocked/').first().innerText())
  const send = (bytes, delay = 0) => page.evaluate(async ([b, d]) => {
    const a = await navigator.requestMIDIAccess()
    const out = [...a.outputs.values()].find((o) => /through/i.test(o.name ?? '')) ?? [...a.outputs.values()][0]
    out.send(b, d ? performance.now() + d : undefined)
    return out.name
  }, [bytes, delay])
  await page.evaluate(() => (window.__notes = []))
  log('sent via output:', await send([0x90, 60, 100]))
  await page.waitForTimeout(150)
  log('key C4 lit while held:', await page.locator('[data-midi="60"]').evaluate((k) => k.style.background !== 'var(--color-key-white)'))
  log('held display:', await page.locator('[data-testid=held]').innerText())
  await send([0x90, 64, 90]); await send([0x90, 67, 90]); await page.waitForTimeout(150)
  log('chord display:', (await page.locator('[data-testid=held]').innerText()).replace(/\n/g, ' '))
  await send([0xb0, 64, 127]) // sustain down
  await send([0x80, 60, 0]); await send([0x80, 64, 0]); await send([0x80, 67, 0]); await page.waitForTimeout(150)
  log('notes sounded:', await page.evaluate(() => window.__notes.map((n) => n.midi).join(',')), '| velocity path ok')
  await send([0xb0, 64, 0])
  // Play-along driven by real MIDI
  await page.goto(URL + '/songs/mary-lamb?hands=R&mode=wait'); await page.waitForSelector('.vf-stavenote'); await page.waitForTimeout(800)
  await page.click('text=Start'); await page.waitForTimeout(400)
  for (const m of [64, 62, 60, 62]) { await send([0x90, m, 90]); await page.waitForTimeout(120); await send([0x80, m, 0]); await page.waitForTimeout(700) }
  log('Mary first 4 notes via real Web MIDI:', await page.evaluate(() => window.__pa.states.slice(0, 5).join(',')))
}
