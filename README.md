# Piano Learning

A piano tutor for kids and adults that runs in the browser and installs as an app (PWA). It works offline once loaded.

- **Seven modes**: Free play, Play-along (12 songs + your own MIDI files), Note drills, Ear training, Rhythm, an 18-lesson course, and a Chord & scale reference. There's also a progress dashboard.
- **Kid mode / Adult mode**, switched in Settings. Kid mode is styled like a toy xylophone: every mode is a bar in its note's color, and the mascot, **Miu the cat**, wears a bow tie in the color of whatever note is being played or asked for. Adult mode keeps the same shapes and icons in a quiet navy-and-cobalt palette. Both modes share one progress store on the device.
- **English and Vietnamese**.
- **Make your own songs**: write them in the song editor, record them in Free play, import song files or MIDI, or have an AI assistant transcribe sheet music through the MCP server (see [Song authoring](#song-authoring)).
- **Ways to play**: the on-screen keyboard (multi-touch), the computer keyboard, a USB/MIDI piano (Chrome/Edge on a computer or Android), or a microphone for single notes on an acoustic piano.

Spec: [`plans/piano-learning-app.spec.html`](plans/piano-learning-app.spec.html) · Plan: [`plans/piano-learning-app.md`](plans/piano-learning-app.md) · QA results: [`plans/piano-learning-app.qa.md`](plans/piano-learning-app.qa.md)

## Setup

```sh
npm install
npm run samples      # downloads the 30 Salamander piano samples (2 MB) into public/samples
npm run dev          # http://localhost:5173
```

Other scripts:

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests (scoring, timing, MIDI parsing, pitch detection, streaks, lessons, songs, strings) |
| `npm run build` | Type-check and build the PWA into `dist/` |
| `npm run preview` | Serve the production build (service worker on, so offline works) |
| `npm run build:mcp` | Build the MCP server into `mcp/dist/piano-mcp.js` |
| `npm run icons` | Redraw the app icons in `public/icons/` |
| `node scripts/make-midi-fixtures.mjs` | Regenerate the MIDI test files |

If `npm run samples` can't reach the network, the app still works with a simple synthesized tone and shows a banner saying so. Run the script again later.

## Song authoring

Spec: [`plans/song-authoring.spec.html`](plans/song-authoring.spec.html) · Plan: [`plans/song-authoring.md`](plans/song-authoring.md)

- **Song files** (`.song.json`): every song's ⋯ menu in the library has *Export song file*. *Import* in the library opens a song file (or a MIDI file) on a review screen: listen, read the warnings (bar lengths, notes off the piano, stretches one hand can't reach), then *Save to My songs*, *Edit first*, or *Discard*. Each hand is stored as bar text, so the files are readable and easy to diff:
  ```json
  { "format": "piano-learning-song", "version": 1, "title": { "en": "Ode to Joy", "vi": "Khúc hoan ca" },
    "bpm": 100, "timeSig": [4, 4], "keySig": "C", "right": "E4q3 E4q3 F4q4 G4q5 | …", "left": "C3w | …" }
  ```
- **Song editor** (adult): *New song* in the library, or *Edit* on one of My songs. *Play to enter*: pick the hand, note length, dot and finger, then play keys (on screen, computer keyboard, MIDI piano); keys pressed together become a chord, and the cursor moves to the next bar when a bar is full. Backspace deletes, arrows move. *Text*: edit each hand as note text; a bar that doesn't read or doesn't add up is shown and not applied until fixed. Undo/redo cover every change, including AI edits. Leaving with unsaved changes asks to save.
- **Recording** (Free play): adults press *Record*: one bar of metronome count-in at the metronome's tempo and time, then everything played is captured; *Stop* snaps notes to eighths, puts notes below middle C in the left hand and opens the review screen. Kids get a big *Record a song* button: the song is saved straight away as "Linh's song 1", "Linh's song 2"… (or "My song N" with no name), with a celebration and *Listen*. Nothing is saved if nothing was played.

### MCP server (AI transcription and editing)

The MCP server lets an AI assistant (for example Claude Code) build songs. It doesn't read images itself: the assistant looks at the sheet music, writes the notes with the tools, checks them with `check_song`, and compares a `screenshot` of the result with the source.

```sh
npm run build:mcp
claude mcp add piano -- node /path/to/piano-learning/mcp/dist/piano-mcp.js
```

It works in two modes; every song tool takes an optional `file`:

| Mode | How | Tools |
| --- | --- | --- |
| **File** | Pass `file` with the path of a `.song.json`. No app needed. | `new_song`, `get_song`, `set_song_info`, `set_bars`, `delete_bars`, `transpose`, `check_song`, `get_reference`, `import_musicxml`, `export_song_file`, `add_to_bundled` |
| **Live** | Leave `file` out. Open the app (adult mode) and press **Connect AI** in the song editor or in Settings. Tools then act on the song open in the editor; each change is one undo step and appears under *AI activity*. | all of the above, plus `list_songs`, `open_song` (bundled songs are copied into My songs), `open_file`, `save_song`, `play_song`, `screenshot` (PNG of the staff), `call_tool` |

- There is no default folder: file tools always take the path to use.
- `import_musicxml {path}` converts `.musicxml`/`.xml`/`.mxl` (from MuseScore or an OMR program). Part 1 staff 1 becomes the right hand; staff 2 or part 2 the left hand. Rhythms are rounded to sixteenths; tuplets and grace notes come back as warnings.
- `add_to_bundled {file, id?}` writes `src/content/songs/<id>.ts` and lists it in `src/content/songs/index.ts`, so it ships with the next `npm run build`. It refuses an existing id unless `replace: true`.
- **Port**: the server listens on `ws://127.0.0.1:8766`, only for pages served from localhost. Change it with `PIANO_PORT=8800` (in `claude mcp add`: `-e PIANO_PORT=8800`) and enter the same port in Settings → AI connection. `PIANO_ALLOWED_ORIGINS` adds other page origins, comma-separated.
- If the app is newer than the server build, the app shows a note and tool results say so; `call_tool {name, args}` still reaches new tools. Rebuild with `npm run build:mcp` and reconnect the server (`/mcp` in Claude Code).
- Connect AI is hidden in kid mode, and the app refuses AI edits while in kid mode.

## Devices

| Device / browser | On-screen | Computer keyboard | MIDI piano | Microphone | Install |
| --- | --- | --- | --- | --- | --- |
| Desktop Chrome / Edge | ✓ | ✓ | ✓ | ✓ | ✓ |
| Desktop Firefox / Safari | ✓ | ✓ | – (no Web MIDI) | ✓ | Safari only |
| iPad (any browser) | ✓ multi-touch | with a keyboard | – (iPadOS has no Web MIDI) | ✓ drills, ear training, one-hand songs | Add to Home Screen |
| Android Chrome | ✓ | with a keyboard | ✓ USB-OTG | ✓ | ✓ |
| iPhone | ✓ | – | – | ✓ | Add to Home Screen |

**iPad**: open the site in Safari, then Share → Add to Home Screen. Landscape works best. Sound plays even with the silent switch on. A USB piano can't connect to an iPad, but the microphone can hear an acoustic piano one note at a time.

## Testing without hardware

- **Virtual MIDI panel**: open Settings and tap the version number 5 times. A panel appears on every playing screen. It sends events exactly like a MIDI keyboard. It also has ready-made scripts, such as "Play this song perfectly" and "Tap on the beat / 120 ms late".
- **Real Web MIDI on Linux**: Chrome exposes ALSA's *Midi Through* port. Anything sent to its output comes back as MIDI input. `qa/midi-e2e.mjs` uses this.
- **Microphone**: `node qa/make-tones.mjs out.wav 69,69,69` writes a WAV of piano-like tones. Chrome can use it as the microphone with `--use-file-for-fake-audio-capture=out.wav`.

## Browser QA scripts

The scripts in `qa/` drive the local Chrome (`/usr/bin/google-chrome`) headlessly through `playwright-core`. Each one is named after the acceptance criteria it checks.

```sh
npm run dev -- --host 127.0.0.1 --port 5317     # in another terminal
node qa/shot.mjs qa/a15-playalong.mjs           # screenshots land in qa/out/
QA_MIC_FILE=$PWD/qa/fixtures/a440.wav node qa/shot.mjs qa/a9.mjs
```

Song authoring checks: `qa/a2-a3-songfiles.mjs`, `qa/a4-a5-editor.mjs`, `qa/a6-a7-record.mjs`, `qa/a9-a10-mcp-live.mjs` and `qa/a14-authoring-vi.mjs` run through `qa/shot.mjs`; the file-mode MCP checks run directly: `node qa/a8-a11-a12-mcp-file.mjs` and `node qa/a13-transcribe.mjs` (build the server first).

Generate the tone fixtures first with `node qa/make-tones.mjs qa/fixtures/a440.wav 69,69,69,69,69,69,69,69,69,69,69,69 0.8 0.4 0.5 1` and `node qa/make-tones.mjs qa/fixtures/twinkle8.wav 60,60,67,67,69,69,67,65`. `qa/a5.mjs` and `qa/install.mjs` need `npm run preview -- --host 127.0.0.1 --port 5318`.

## Code map

```
src/engine/     pure logic, unit-tested: notes, song format + parser, song files, bar text, song checks,
                song tools (shared by app and MCP server), MusicXML, recording, scoring, play-along state machine,
                drills, ear training, rhythm, chords & scales, pitch detection, MIDI import, lessons, badges, streaks
src/audio/      Web Audio: sampled piano, lookahead scheduler, metronome, chime, iOS unlock
src/input/      input bus + on-screen / computer keyboard / Web MIDI / microphone / virtual MIDI
src/notation/   keyboard, grand staff (VexFlow), staff PNG, falling-notes lane, note colors
src/ai/         live bridge to the MCP server (Connect AI)
mcp/            MCP server (stdio + local WebSocket), built with esbuild
src/components/ Miu the cat (Mascot), xylophone Bar, stickers, Phosphor icon wrapper
src/content/    12 songs, 18 lessons, EN/VI strings
src/store/      progress store (IndexedDB + localStorage mirror), export/import
src/pages/      one file per screen
```

Songs are written in a compact text format (`E4q3` = E4, quarter note, finger 3; `|` checks bar lengths). See `src/engine/song-dsl.ts`.
