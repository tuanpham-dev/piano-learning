// Checks the kid sticker shape (outline + lift) and that adult mode stays plain (plan T4).
export default async ({ browser, log }) => {
  for (const mode of ['kid', 'adult']) {
    const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 } })
    const page = await ctx.newPage()
    await page.goto('http://127.0.0.1:5317')
    await page.click(mode === 'kid' ? "text=I'm a kid" : "text=I'm an adult"); await page.click("text=Let's play")
    await page.goto('http://127.0.0.1:5317/drills'); await page.waitForSelector('[data-primary]')
    log(mode, await page.locator('[data-primary]').evaluate((b) => { const s = getComputedStyle(b); return `primary: border-top ${s.borderTopWidth} ${s.borderTopColor} | shadow ${s.boxShadow} | font ${s.fontFamily.split(',')[0]}` }))
    await ctx.close()
  }
}
