# Piano Learning

A piano tutor for kids and adults that runs in the browser and installs as an app (PWA). It works offline once loaded.

- **Seven modes**: Free play, Play-along (12 songs + your own MIDI files), Note drills, Ear training, Rhythm, an 18-lesson course, and a Chord & scale reference. There's also a progress dashboard.
- **Kid mode / Adult mode**, switched in Settings. Kid mode is styled like a toy xylophone: every mode is a bar in its note's color, and the mascot, **Miu the cat**, wears a bow tie in the color of whatever note is being played or asked for. Adult mode keeps the same shapes and icons in a quiet navy-and-cobalt palette. Both modes share one progress store on the device.
- **English and Vietnamese**.
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
| `npm run icons` | Redraw the app icons in `public/icons/` |
| `node scripts/make-midi-fixtures.mjs` | Regenerate the MIDI test files |

If `npm run samples` can't reach the network, the app still works with a simple synthesized tone and shows a banner saying so. Run the script again later.

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

Generate the tone fixtures first with `node qa/make-tones.mjs qa/fixtures/a440.wav 69,69,69,69,69,69,69,69,69,69,69,69 0.8 0.4 0.5 1` and `node qa/make-tones.mjs qa/fixtures/twinkle8.wav 60,60,67,67,69,69,67,65`. `qa/a5.mjs` and `qa/install.mjs` need `npm run preview -- --host 127.0.0.1 --port 5318`.

## Code map

```
src/engine/     pure logic, unit-tested: notes, song format + parser, scoring, play-along state machine,
                drills, ear training, rhythm, chords & scales, pitch detection, MIDI import, lessons, badges, streaks
src/audio/      Web Audio: sampled piano, lookahead scheduler, metronome, chime, iOS unlock
src/input/      input bus + on-screen / computer keyboard / Web MIDI / microphone / virtual MIDI
src/notation/   keyboard, grand staff (VexFlow), falling-notes lane, note colors
src/components/ Miu the cat (Mascot), xylophone Bar, stickers, Phosphor icon wrapper
src/content/    12 songs, 18 lessons, EN/VI strings
src/store/      progress store (IndexedDB + localStorage mirror), export/import
src/pages/      one file per screen
```

Songs are written in a compact text format (`E4q3` = E4, quarter note, finger 3; `|` checks bar lengths). See `src/engine/song-dsl.ts`.
