const URL = 'http://127.0.0.1:5317'
const EN = /\b(the|and|Play|Start|Lesson|Lessons|notes?|Settings|Home|Listen|Wait|Perform|Tempo|Hands|Right|Left|Both|Correct|Exercise|Back|Next|Stop|Inputs|keyboard|Microphone|Import|Library|Easy|Medium|Hard|Dashboard|Streak|Badges|Rhythm|Level|Chords?|Scales?|Root|Type|Major|Minor)\b/g
export default async ({ browser, log }) => {
  for (const mode of ['adult', 'kid']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    await page.goto(URL)
    await page.click('text=Tiếng Việt')
    await page.click(mode === 'kid' ? 'text=Mình là trẻ em' : 'text=Tôi là người lớn')
    await page.click('text=Bắt đầu chơi')
    for (const p of ['/', '/free', '/songs', '/songs/twinkle', '/drills', '/ear', '/rhythm', '/lessons', '/lessons/l01-posture', '/reference', '/progress', '/settings']) {
      await page.goto(URL + p); await page.waitForTimeout(400)
      const text = await page.evaluate(() => document.body.innerText)
      const hits = [...new Set(text.match(EN) ?? [])]
      log(`${mode} ${p}:`, hits.length ? hits.join(', ') : 'all Vietnamese')
    }
    await page.reload(); await page.waitForTimeout(500)
    log(`${mode} after reload html lang:`, await page.evaluate(() => document.documentElement.lang))
    await ctx.close()
  }
}
