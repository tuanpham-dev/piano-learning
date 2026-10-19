// Measures the staff cursor band against the due notehead (drawn in the accent color) during play.
const URL = 'http://127.0.0.1:5317'
const measure = (page) => page.evaluate(() => {
  const svg = document.querySelector('.staff-host svg')
  const rect = document.querySelector('[data-testid=staff-cursor]')
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim().toLowerCase()
  const heads = [...svg.querySelectorAll('.vf-notehead')].filter((g) => (g.getAttribute('fill') || '').toLowerCase() === accent)
  const rb = rect?.getBoundingClientRect()
  const hb = heads.map((h) => h.getBoundingClientRect())
  return {
    beat: window.__pa.cursor.toFixed(2), status: window.__pa.status,
    band: rb ? `${Math.round(rb.left)}–${Math.round(rb.right)}` : 'none',
    bandCenter: rb ? Math.round(rb.left + rb.width / 2) : null,
    dueHeads: hb.map((b) => Math.round(b.left + b.width / 2)).join(','),
  }
})
export default async ({ browser, log }) => {
  for (const mode of ['adult', 'kid']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    await page.goto(URL); await page.click(mode === 'kid' ? "text=I'm a kid" : "text=I'm an adult"); await page.click("text=Let's play")
    await page.goto(URL + '/songs/ode-to-joy?hands=R&mode=wait'); await page.waitForSelector('.vf-stavenote')
    await page.getByRole('button', { name: /^(Start|Play)$/ }).click(); await page.waitForTimeout(500)
    log(`${mode} wait, first step:`, JSON.stringify(await measure(page)))
    for (const m of [64, 64, 65]) { await page.evaluate((x) => { window.__dev.emitNote('on', x, 'virtual'); window.__dev.emitNote('off', x, 'virtual') }, m); await page.waitForTimeout(900) }
    log(`${mode} wait, 4th step:`, JSON.stringify(await measure(page)))
    await page.screenshot({ path: `qa/out/cursor-${mode}-wait.png` })
    await ctx.close()
  }
  // Perform: sample while it plays
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(URL); await page.click("text=I'm an adult"); await page.click("text=Let's play")
  await page.goto(URL + '/songs/ode-to-joy?hands=R&mode=perform'); await page.waitForSelector('.vf-stavenote')
  await page.getByRole('button', { name: /^Start$/ }).click()
  // Sample right when the playhead reaches each note (beats 0..7 of Ode's right hand are quarter notes).
  let checked = 0
  for (let i = 0; i < 400 && checked < 8; i++) {
    const r = await measure(page)
    const b = Number(r.beat)
    if (r.status === 'playing' && Math.abs(b - Math.round(b)) < 0.06 && r.dueHeads) {
      const heads = r.dueHeads.split(',').map(Number)
      log(`perform beat ${r.beat}: band center ${r.bandCenter}, due head ${heads.join(',')} → off by ${Math.min(...heads.map((h) => Math.abs(h - r.bandCenter)))} px`)
      checked++
      await page.waitForTimeout(250)
    }
    await page.waitForTimeout(8)
  }
  await page.screenshot({ path: 'qa/out/cursor-perform.png' })
}
