// A13 step 1: render Twinkle's first 4 bars as a PNG (the "sheet music image" to transcribe).
import { writeFileSync } from 'node:fs'
export default async ({ page, log }) => {
  await page.goto('http://127.0.0.1:5317'); await page.waitForTimeout(300)
  const data = await page.evaluate(async () => {
    const { bundledSongById } = await import('/src/content/songs/index.ts')
    const { staffPng } = await import('/src/notation/staff-image.ts')
    const s = bundledSongById('twinkle')
    // No fingering, as on a plain score.
    const plain = { ...s, hands: { R: { ...s.hands.R, notes: s.hands.R.notes.map(({ finger, ...n }) => n) }, L: s.hands.L } }
    return staffPng(plain, 1, 4)
  })
  writeFileSync('qa/out/a13-twinkle.png', Buffer.from(data.split(',')[1], 'base64'))
  log('A13 image written')
}
