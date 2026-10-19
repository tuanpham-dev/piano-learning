const URL = 'http://127.0.0.1:5317'
export default async ({ page, log }) => {
  await page.goto(URL)
  await page.click("text=I'm an adult"); await page.click("text=Let's play")
  await page.goto(URL + '/settings')
  for (let i = 0; i < 5; i++) await page.click('text=Version 1.0.0')
  await page.goto(URL + '/songs/twinkle')
  await page.waitForSelector('.staff-host svg')
  await page.click('#pa-hands >> text=Right')
  await page.click('text=Virtual MIDI')
  await page.click('[data-script="song-perfect"]')
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1500)
    const st = await page.evaluate(() => { const e = window.__pa; return `${e.status} cur=${e.cursor.toFixed(2)} end=${e.endBeat} due=${e.dueMidis()} states=${e.states.map((s) => s[0]).join('')}` }); log(st); if (st.startsWith('done')) { log(await page.locator('[role=dialog]').innerText()); break }
  }
}
