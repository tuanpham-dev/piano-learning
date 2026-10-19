import { readFileSync } from 'node:fs'
const AXE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8')
const URL = 'http://127.0.0.1:5317'
export default async ({ browser, log }) => {
  for (const scheme of ['light', 'dark']) for (const mode of ['adult', 'kid']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme })
    const page = await ctx.newPage()
    await page.goto(URL)
    await page.click(mode === 'kid' ? "text=I'm a kid" : "text=I'm an adult"); await page.click("text=Let's play")
    const out = []
    for (const p of ['/', '/songs/ode-to-joy', '/drills', '/ear', '/rhythm', '/lessons', '/lessons/l01-posture', '/reference', '/progress', '/settings', '/free']) {
      await page.goto(URL + p); await page.waitForTimeout(500)
      await page.addScriptTag({ content: AXE })
      const res = await page.evaluate(async () => {
        const r = await window.axe.run(document, { resultTypes: ['violations'] })
        return r.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious').map((v) => `${v.id}×${v.nodes.length} ${v.nodes[0].target.join(' ').slice(0, 50)} ${v.id === 'color-contrast' ? v.nodes[0].any[0]?.message.slice(40, 120) : ''}`)
      })
      if (res.length) out.push(`${p}: ${res.join(' | ')}`)
      if (p === '/songs/ode-to-joy' || p === '/') await page.screenshot({ path: `qa/out/${scheme}-${mode}${p.replace(/\//g, '_')}.png` })
    }
    log(`${scheme} ${mode}:`, out.length ? '\n  ' + out.join('\n  ') : 'no serious/critical issues')
    await ctx.close()
  }
}
