import { Mascot, type MascotMood } from '../components/Mascot'
import { LETTER_HEX } from '../notation/note-colors'

/** Dev-only sheet of every mood in every note color. */
export function DevMascotPage() {
  const moods: MascotMood[] = ['idle', 'cheering', 'thinking', 'sleeping']
  return (
    <main className="p-6 grid gap-4 bg-bg">
      {moods.map((m) => (
        <div key={m} className="flex flex-wrap items-center gap-3">
          <span className="w-24">{m}</span>
          {Object.entries(LETTER_HEX).map(([l, c]) => (
            <Mascot key={l} mood={m} color={c} size={84} />
          ))}
        </div>
      ))}
    </main>
  )
}
