export default async ({ page, log }) => {
  await page.goto('http://127.0.0.1:5317/free')
  await page.waitForTimeout(800)
  log(await page.evaluate(async () => {
    const { getAudioContext } = await import('/src/audio/context.ts')
    const c = getAudioContext(); await c.resume()
    await new Promise((r) => setTimeout(r, 300))
    return JSON.stringify({ base: c.baseLatency, out: c.outputLatency, sr: c.sampleRate, state: c.state })
  }))
}
