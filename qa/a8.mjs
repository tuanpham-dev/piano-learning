const URL = 'http://127.0.0.1:5317'
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
async function check(browser, label, opts, init) {
  const ctx = await browser.newContext(opts)
  if (init) await ctx.addInitScript(init)
  const page = await ctx.newPage()
  await page.goto(URL); await page.click("text=I'm an adult"); await page.click("text=Let's play")
  await page.goto(URL + '/free'); await page.waitForTimeout(800)
  const box = page.locator('#in-midi')
  const text = await page.locator('text=/MIDI keyboards work|No MIDI devices|MIDI access was blocked|connected/').first().innerText().catch(() => '-')
  console.log(`${label}: midi checkbox disabled=${await box.isDisabled().catch(() => 'sheet')} | "${text}"`)
  await ctx.close()
}
export default async ({ browser }) => {
  await check(browser, 'No Web MIDI (Firefox-like)', { viewport: { width: 1280, height: 800 } }, () => { delete Navigator.prototype.requestMIDIAccess })
  await check(browser, 'iPad (iPadOS UA, 5 touch points)', { viewport: { width: 1180, height: 820 }, userAgent: IPAD, hasTouch: true }, () => Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 5 }))
  await check(browser, 'Desktop Chrome, MIDI allowed, no inputs', { viewport: { width: 1280, height: 800 }, permissions: ['midi', 'midi-sysex'] }, () => {
    const orig = Navigator.prototype.requestMIDIAccess
    Navigator.prototype.requestMIDIAccess = function (o) { return orig.call(this, o).then((a) => Object.assign(Object.create(a), { inputs: new Map(), outputs: a.outputs, addEventListener: a.addEventListener.bind(a) })) }
  })
}
