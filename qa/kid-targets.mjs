export const context = { viewport: { width: 1180, height: 820 }, hasTouch: true }
export default async ({ page, log }) => {
  await page.goto('http://127.0.0.1:5317'); await page.click("text=I'm a kid"); await page.click("text=Let's play")
  for (const p of ['/', '/drills', '/songs/twinkle', '/ear', '/rhythm', '/reference', '/lessons/l01-posture', '/progress', '/free']) {
    await page.goto('http://127.0.0.1:5317' + p); await page.waitForTimeout(500)
    const small = await page.evaluate(() => [...document.querySelectorAll('main button, main a[href], main select, main input, header button, header a')].filter((e) => e.offsetParent && !e.dataset.midi).map((e) => ({ e, r: e.getBoundingClientRect() })).filter(({ r }) => Math.min(r.width, r.height) < 56).map(({ e, r }) => `${e.tagName}${e.id ? '#' + e.id : ''} "${(e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 20)}" ${Math.round(r.width)}x${Math.round(r.height)}`))
    log(p, small.length ? small.join(' ; ') : 'ok')
  }
}
