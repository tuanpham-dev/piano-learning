const URL = 'http://127.0.0.1:5317'
export const context = { viewport: { width: 1280, height: 800 }, permissions: ['microphone'] }
const key = (page, m) => page.locator(`[data-midi="${m}"]`)
export default async ({ page, shot, log }) => {
  await page.goto(URL)
  await page.waitForSelector('text=Welcome')
  await page.click("text=I'm an adult")
  await page.click("text=Let's play")
  await page.goto(URL + '/settings')
  for (let i = 0; i < 5; i++) await page.click('text=Version 1.0.0')
  // A24: key press before any click → sound gate
  await page.goto(URL + '/free')
  await page.waitForSelector('[data-midi="60"]')
  const ctxBefore = await page.evaluate(() => window.__notes?.length ?? 0)
  log('A24 notes before gesture', ctxBefore)
  await page.keyboard.down('KeyA') // keydown is a gesture in Chrome; check gate state either way
  await page.waitForTimeout(150)
  const gate = await page.locator('text=Tap to enable sound').count()
  await page.keyboard.up('KeyA')
  log('A24 gate visible after first key:', gate, ' notes:', await page.evaluate(() => window.__notes?.map((n) => n.midi)))
  await page.evaluate(() => (window.__notes = []))
  await page.waitForFunction(() => true)
  // A7: click middle C
  const box = await key(page, 60).boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 10)
  await page.mouse.down()
  await page.waitForTimeout(120)
  const bgHeld = await key(page, 60).evaluate((el) => getComputedStyle(el).backgroundColor)
  await shot('p2-click-c4')
  await page.mouse.up()
  // QWERTY A
  await page.keyboard.down('KeyA'); await page.waitForTimeout(80); await page.keyboard.up('KeyA')
  // Z then A → C3
  await page.keyboard.press('KeyZ')
  await page.keyboard.down('KeyA'); await page.waitForTimeout(80); await page.keyboard.up('KeyA')
  await page.keyboard.press('KeyX')
  // Virtual MIDI noteOn 60
  await page.click('text=Virtual MIDI')
  await page.locator('[data-vmidi="60"]').dispatchEvent('pointerdown')
  await page.waitForTimeout(80)
  const vHeld = await key(page, 60).evaluate((el) => getComputedStyle(el).backgroundColor)
  await page.locator('[data-vmidi="60"]').dispatchEvent('pointerup')
  const notes = await page.evaluate(() => window.__notes)
  log('A7 played midis (click, A, Z+A, virtual):', notes.map((n) => n.midi).join(','))
  log('A7 key lit while held (click / virtual):', bgHeld, '/', vHeld, ' idle:', await key(page, 60).evaluate((el) => getComputedStyle(el).backgroundColor))
  log('A10 latency ms (scheduling + base + output):', notes.map((n) => n.latencyMs.toFixed(1)).join(', '))
  // A11: metronome 60 BPM for 4 s, count clicks & accents
  await page.evaluate(async () => {
    const m = await import('/src/audio/metronome.ts')
    window.__clicks = []
    m.onClick((i, accent, t) => window.__clicks.push({ i, accent, t }))
    m.useMetronome.getState().setBpm(60)
    m.useMetronome.getState().start()
  })
  await page.waitForTimeout(4100)
  await shot('p2-metronome')
  const clicks = await page.evaluate(async () => {
    const m = await import('/src/audio/metronome.ts')
    m.useMetronome.getState().setSig('6/8')
    return window.__clicks.map((c) => c.accent[0]).join('')
  })
  await page.waitForTimeout(3100)
  const after = await page.evaluate(async () => {
    const m = await import('/src/audio/metronome.ts'); m.useMetronome.getState().stop()
    return window.__clicks
  })
  const iv = after.slice(1, 5).map((c, i) => (c.t - after[i].t).toFixed(3))
  log('A11 4/4 accents:', clicks, ' intervals:', iv.join(','), ' then 6/8:', after.map((c) => c.accent[0]).join('').slice(clicks.length))
  // mic: enable via settings in drills later; here check the Free play hides it
  log('mic row on free play:', await page.locator('#in-mic').count())
}
