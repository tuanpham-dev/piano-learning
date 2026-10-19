const URL = 'http://127.0.0.1:5317'
export default async ({ page, log }) => {
  await page.goto(URL)
  await page.waitForSelector('text=Welcome')
  await page.click("text=I'm an adult")
  await page.click("text=Let's play")
  await page.goto(URL + '/settings')
  await page.click('text=Tiếng Việt')
  await page.waitForTimeout(400)
  await page.reload()
  await page.waitForTimeout(800)
  log(await page.textContent("h1"))
}
