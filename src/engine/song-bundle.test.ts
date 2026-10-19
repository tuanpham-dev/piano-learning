import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { bundleIdFor, bundleSource, registerInIndex } from './song-bundle'
import { songToDraft, draftToSong } from './song-text'
import { parseVoice } from './song-dsl'
import odeToJoy from '../content/songs/ode-to-joy'

describe('bundling a song', () => {
  it('suggests an id from a My songs id or the title', () => {
    expect(bundleIdFor({ ...songToDraft(odeToJoy), id: 'my-ode-to-joy-lx3k9ab' })).toBe('ode-to-joy')
    expect(bundleIdFor({ ...songToDraft(odeToJoy), id: 'my-Bad Id', title: { en: 'Bà ơi! Đi', vi: '' } })).toBe('ba-oi-di')
  })

  it('writes source whose bars parse back to the same notes', () => {
    const src = bundleSource(songToDraft(odeToJoy), 'ode-copy')
    expect(src).toContain("id: 'ode-copy'")
    const right = /right: `([^`]*)`/.exec(src)![1]!
    expect(parseVoice(right, odeToJoy.timeSig).notes).toEqual(draftToSong(songToDraft(odeToJoy)).song.hands.R.notes)
  })

  it('registers the song once in the index', () => {
    const index = readFileSync('src/content/songs/index.ts', 'utf8')
    const once = registerInIndex(index, 'my-tune')
    expect(once).toContain("import myTune from './my-tune'\n")
    expect(once).toMatch(/canonInD, myTune\]/)
    expect(registerInIndex(once, 'my-tune')).toBe(once)
  })
})
