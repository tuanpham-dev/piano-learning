import type { Song } from '../../engine/song'
import twinkle from './twinkle'
import maryLamb from './mary-lamb'
import auClair from './au-clair'
import kiaConBuomVang from './kia-con-buom-vang'
import jingleBells from './jingle-bells'
import happyBirthday from './happy-birthday'
import odeToJoy from './ode-to-joy'
import amazingGrace from './amazing-grace'
import greensleeves from './greensleeves'
import minuetInG from './minuet-in-g'
import furElise from './fur-elise'
import canonInD from './canon-in-d'

/** In difficulty order. */
export const bundledSongs: Song[] = [twinkle, maryLamb, auClair, kiaConBuomVang, jingleBells, happyBirthday, odeToJoy, amazingGrace, greensleeves, minuetInG, furElise, canonInD]

export function bundledSongById(id: string): Song | undefined {
  return bundledSongs.find((s) => s.id === id)
}
