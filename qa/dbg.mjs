const URL = 'http://127.0.0.1:5317'
export default async ({ page, log }) => {
  await page.goto(URL)
  await page.waitForSelector('text=Welcome')
  await page.click("text=I'm an adult")
  await page.click("text=Let's play")
  await page.goto(URL + '/settings')
  await page.click('text=Tiếng Việt')
  await page.waitForTimeout(600)
  log('html lang before reload', await page.evaluate(() => document.documentElement.lang))
  await page.reload()
  await page.waitForTimeout(800)
  log('html lang after reload', await page.evaluate(() => document.documentElement.lang))
  log('stored', await page.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const tx = r.result.transaction('keyval').objectStore('keyval').get('piano.progress'); tx.onsuccess = () => res(JSON.stringify({ lang: tx.result?.value?.lang, mode: tx.result?.value?.mode })) }
  })))
  log('h1', await page.textContent('h1'))
}
