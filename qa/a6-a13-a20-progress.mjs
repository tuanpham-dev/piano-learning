const URL = 'http://127.0.0.1:5317'
export default async ({ page, shot, log, context }) => {
  await page.clock.install()
  await page.goto(URL)
  await page.fill('#welcome-name', 'Linh')
  await page.click("text=I'm an adult"); await page.click("text=Let's play")
  // A20: only lesson 1 unlocked
  await page.goto(URL + '/lessons')
  log('A20 unlocked on fresh store:', await page.evaluate(() => [...document.querySelectorAll('a[data-lesson]')].map((a) => a.dataset.lesson)))
  await page.click('[data-lesson="l01-posture"]')
  await page.waitForSelector('[data-testid=lesson-body]')
  await shot('p5-lesson1')
  await page.click('text=Try it')
  await page.waitForURL(/rhythm\?lesson=/)
  log('A20 banner:', await page.locator('[data-testid=lesson-banner]').innerText())
  // pass lesson 1 via rhythm exact script
  await page.goto(URL + '/settings'); for (let i = 0; i < 5; i++) await page.click('text=Version 1.0.0')
  await page.goto(URL + '/rhythm?lesson=l01-posture')
  await page.click('text=Virtual MIDI')
  await page.click('[data-script="rhythm-exact"]')
  for (let i = 0; i < 40; i++) { await page.clock.runFor(250); if (await page.locator('text=Lesson passed!').count()) break }
  log('A20 lesson 1 result:', (await page.locator('[data-testid=lesson-banner]').innerText()).replace(/\n/g, ' | '))
  await page.goto(URL + '/lessons')
  log('A20 unlocked after pass:', await page.evaluate(() => [...document.querySelectorAll('a[data-lesson]')].map((a) => a.dataset.lesson)))
  // skip ahead (adult)
  await page.goto(URL + '/settings'); await page.click('#set-skip')
  await page.goto(URL + '/lessons')
  log('A20 skip-ahead unlocked count:', await page.locator('a[data-lesson]').count())
  // kid: setting hidden, journey map shows island 2 reachable
  await page.goto(URL + '/settings'); await page.click('#set-mode >> text=Kid')
  log('A20 skip setting in kid mode:', await page.locator('#set-skip').count())
  await page.goto(URL + '/lessons')
  log('A20 journey states:', await page.evaluate(() => [...document.querySelectorAll('[data-island]')].slice(0, 4).map((b) => `${b.dataset.island}:${b.dataset.state}`).join(' ')))
  await shot('p5-journey')
  // A13: 5 minutes of free play with notes each minute
  await page.goto(URL + '/settings'); await page.click('#set-mode >> text=Adult')
  await page.goto(URL + '/free'); await page.waitForSelector('[data-midi="60"]')
  const before = await page.evaluate(() => { const s = window.__dev.useProgress.getState(); return Object.values(s.dailyMinutes).reduce((a, b) => a + b, 0) })
  for (let m = 0; m < 5; m++) {
    for (let k = 0; k < 12; k++) {
      await page.evaluate(() => { window.__dev.emitNote('on', 60, 'virtual'); window.__dev.emitNote('off', 60, 'virtual') })
      await page.clock.runFor(5000)
    }
  }
  const after = await page.evaluate(() => { const s = window.__dev.useProgress.getState(); return Object.values(s.dailyMinutes).reduce((a, b) => a + b, 0) })
  log('A13 minutes added:', after - before)
  // idle minute should not count
  await page.clock.runFor(120000)
  const idle = await page.evaluate(() => Object.values(window.__dev.useProgress.getState().dailyMinutes).reduce((a, b) => a + b, 0))
  log('A13 idle 2 min adds:', idle - after)
  await page.goto(URL + '/progress')
  await page.waitForSelector('[data-testid=week-chart]')
  log('A13/A22 streak:', await page.locator('[data-testid=streak]').innerText(), '| lessons:', await page.locator('[data-testid=lessons-done]').innerText())
  log('A22 badges earned:', await page.evaluate(() => window.__dev.useProgress.getState().badges))
  await shot('p5-dashboard')
  // A6: export → clear → import
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('text=Export progress')])
  const path = 'qa/out/export.json'
  await download.saveAs(path)
  log('A6 exported file:', download.suggestedFilename())
  await page.evaluate(async () => { localStorage.clear(); await new Promise((r) => { const d = indexedDB.deleteDatabase('keyval-store'); d.onsuccess = d.onerror = d.onblocked = r }) })
  await page.goto(URL)
  log('A6 after clearing:', page.url().replace(URL, ''))
  await page.click("text=I'm an adult"); await page.click("text=Let's play")
  await page.goto(URL + '/settings')
  await page.setInputFiles('#set-import', path)
  await page.click('text=Replace current')
  await page.goto(URL + '/progress')
  await page.waitForSelector('[data-testid=week-chart]')
  log('A6 restored:', await page.locator('[data-testid=streak]').innerText(), '| lessons', await page.locator('[data-testid=lessons-done]').innerText(), '| name', await page.evaluate(() => window.__dev.useProgress.getState().name))
}
