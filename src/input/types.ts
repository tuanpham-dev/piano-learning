export type InputSource = 'screen' | 'qwerty' | 'midi' | 'mic' | 'virtual'

export interface NoteEvent {
  kind: 'on' | 'off' | 'tap'
  midi: number
  /** 1–127 */
  velocity: number
  /** AudioContext seconds when the note happened. */
  time: number
  source: InputSource
}
