// The kid Slower / Challenge toggles must look different when on (and back when off).
export default async ({ browser, log }) => {
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, colorScheme: scheme })
    const page = await ctx.newPage()
    await page.goto('http://127.0.0.1:5317'); await page.click("text=I'm a kid"); await page.click("text=Let's play")
    await page.goto('http://127.0.0.1:5317/songs/twinkle'); await page.waitForSelector('.vf-stavenote')
    const look = (name) => page.getByRole('button', { name }).evaluate((b) => { const s = getComputedStyle(b); return `${b.getAttribute('aria-pressed')} bg ${s.backgroundColor} text ${s.color} shadow ${s.boxShadow === 'none' ? 'none' : 'lift'}` })
    const off = await look(/Slower/)
    await page.getByRole('button', { name: /Slower/ }).click(); await page.waitForTimeout(300)
    const on = await look(/Slower/)
    await page.screenshot({ path: `qa/out/toggle-${scheme}.png`, clip: { x: 0, y: 70, width: 1180, height: 120 } })
    await page.getByRole('button', { name: /Slower/ }).click(); await page.waitForTimeout(300)
    log(`${scheme} Slower  off: ${off}\n${' '.repeat(scheme.length)}         on: ${on}\n${' '.repeat(scheme.length)}  off again: ${await look(/Slower/)}`)
    await page.getByRole('button', { name: /Challenge/ }).click(); await page.waitForTimeout(300)
    log(`${scheme} Challenge on: ${await look(/Challenge/)}`)
    await ctx.close()
  }
}
