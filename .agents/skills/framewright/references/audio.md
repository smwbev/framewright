# Sound

Sound is written last, to locked scene lengths, and synthesized entirely inside
`audio.mjs` (template in `assets/audio-template.mjs`). No samples, no libraries. The script
writes a 16-bit stereo WAV that `build.sh` muxes into the MP4.

## 1. The timeline table

```bash
node scripts/export-curves.mjs curves.json    # make.sh and `npm run audio` do this first
```

`audio.mjs` builds `T` (plate starts in seconds, plus `end`) and `BPM` from `curves.json`, which
the export script takes from the page's `RISO.curves()`, so the sound cannot drift from the
picture when a plate changes length: export again, regenerate the WAV. The template warns when `curves.json`
is older than `index.html`. For a page without `curves()` (projects made before it existed),
copy the starts from `node scripts/look.mjs info` into the fallback table by hand. The beat
grid is the same as the video's: at 120 BPM `BEAT = 0.5`, `BAR = 2.0`. An event that must land
on a frame takes its time from the film, `T.plate + beats * BEAT` or `frame / fps`, never from
seconds retyped by hand.

A moment the picture marks (a splash, a stamp, a lamp) is named once in the page, `CUES` in the
plate skeleton or `W.cues.push({name, f})` in a world builder, and read here with `cue('splash')`:
its time in seconds on the frame the picture shows it. Move the moment in the picture, export the
curves, and the hit moves with it. A hit that belongs to the groove (a drum pattern, hats on the
off-beats) keeps `T.plate + beats * BEAT`: on an eighth at 120 BPM (7.5 frames) the two differ by
17 ms, far below the 45 ms at which sound ahead of picture begins to show, while a pattern moved
onto frames starts to swing. (`at(t)` in `audio.mjs` is the curve sampler of section 7, not the
page's `at()`.)

## 2. Cue map

| On screen | In sound |
|---|---|
| power on, lights up | click plus a low sine falling 90 → 40 Hz over 120 ms; then a bed (hum, room, pad) that lasts until the end |
| static, snow, waiting | white noise through a 6.5 kHz low-pass at low level with a slow amplitude wave |
| a word or line appears | a data chirp (12 short square tones 1.2–2.6 kHz) or a single sine tick |
| a cut, a channel switch | click plus a 40 ms noise burst |
| a count, a timer | sine beep 880 Hz for 120 ms per count; the last one longer and higher |
| something breaks | alternating 700/900 Hz square at 8 Hz, noise bursts, a 110 Hz square buzz |
| a hold with text | a beat: kick on the beat, hat on the off-beat, rim on 2 and 4, a sine bass pulse |
| a search, a sweep | filtered noise panned left to right over the sweep, a sine glide following a moving line |
| a signal locks, a reveal | decaying noise with crackle, then a pad swelling over one second, a bright "click" of lock |
| a lower third slides in | a short high-passed whoosh, 350 ms |
| a stab, a big word | a short saw chord through a 2.6 kHz filter, 350 ms, two stabs on consecutive beats |
| the end approaches | a riser: noise with a rising high-pass over the last bar |
| power off | click, sine 120 → 38 Hz over 90 ms, a 15.7 kHz whine decaying over 1.5 s, then silence |
| an end card | a soft bell: sine 1760 Hz plus 2640 Hz with 0.35 s decay |

Per style: retro TV uses hum, hiss, tones and beeps; risograph likes warm bass, brushes and
paper; terminal uses key clicks and modem chirps; blueprint uses pencil, ruler and a
metronome; poster uses a click track and snare hits on cuts; neon grid wants a
four-on-the-floor kick, gated snare and detuned saw pads; pixel game uses square and
triangle waves with noise drums.

## 3. Building blocks in the template

- `osc(dur, f0, {f1, wave, amp, vib, vibHz, noiseAmt})`: sine, saw, square, triangle with
  exponential glide from `f0` to `f1`.
- `noise(dur, {amp, lpf, hpf})`: white noise with one-pole low- and high-pass filters.
- `shape(buf, {att, rel, decay, hold})`: linear attack, hold, linear release, optional
  exponential decay.
- `mul(buf, fn)`: multiply by a function of time (tremolo, custom envelopes).
- `lp`, `hp`: one-pole filters on any buffer.
- `add(t, buf, pan, gain)`: mix into the master with constant-power pan.
- Instruments: `kick`, `hat`, `rim`, `click`, `beep`, `chord` (detuned saw pad through a
  low-pass), `chirp`, `riser`. Notes are MIDI numbers: A2 = 45, A3 = 57, E4 = 64.

A drum pattern for one bar at `b0`:

```js
for (let k = 0; k < 4; k++) { const t = b0 + k*BEAT; kick(t, 0.5); hat(t + BEAT/2, 0.09); if (k === 1 || k === 3) rim(t, 0.16); }
```

## 4. Levels

The master applies `tanh(x·1.3)` and normalizes to −1 dBFS. Aim for the loudest scene to
peak around 0.7 before normalization; the template prints the pre-normalization peak. A bed
(hum, hiss, pad) sits at 0.02–0.06, cues at 0.1–0.3, drums at 0.5. Nothing inside an active
scene should fall silent unless the picture is silent too.

## 5. Checks without ears

```bash
node audio.mjs track.wav
ffmpeg -y -i track.wav -filter_complex "showwavespic=s=1800x300:split_channels=1" -frames:v 1 shots/wave.png
ffmpeg -i track.wav -af ebur128 -f null - 2>&1 | grep -A2 "Integrated"
```

Read the waveform against the plate table: every plate has visible activity, the beat
sections show even spikes, the ending decays to zero, nothing is a solid block pinned to the
ceiling. A voice that follows the picture (section 7) is checked alone: comment out the other
events, render, and compare its loudness per few frames with the `sp` column of `curves.json`;
the two must rise and fall together, the sound a frame or two behind. Loudness around −14 LUFS integrated suits social platforms; for a chat it does not
matter. The waveform picture goes to the user only if they ask; the MP4 is the proof.

## 6. Room for the user's track

When the user brings a track: ask its BPM, set `BPM` in both the HTML and `audio.mjs`, keep
cuts on bars, deliver the MP4 without audio (`build.sh` does that when `track.wav` is
absent) and a note with the timecodes of the cuts. When a voice-over comes later, leave the
bed only and no melodic elements under the lines of text.

## 7. Sound that follows the picture

In a world film (`references/world.md`) the sound can read the picture instead of a cue list.
`RISO.curves()` adds one record per frame to `curves.json`:

| field | meaning |
|---|---|
| `sp` | speed of the line's head on screen, logical px per frame; 0 while it rests |
| `pan` | the head's position on screen, −1 left edge … 1 right edge |
| `z` | the camera: world units across the short side |
| `w` | line width at the head, 0 while the pen is lifted |

And `strokes`: the frames where the pen touches down after a lift (`pen.lift`). A tick or a
pencil tap on each of them lands exactly on the picture; detecting touch-downs from per-frame
`w` misses lifts shorter than a frame. And `cues`, the moments the builders marked with
`W.cues.push`, read with `cue(name)` (section 1).

Add fields the sound needs (a character on screen, a second head) in `curves()` the same way.
In `audio.mjs`, `at(t)` interpolates the records at time `t`, and `follow(fn, opts)` runs a voice
sample by sample: `fn(c, t)` returns `{f, a, pan}`. Mapping that worked in a finished film:

- loudness from speed with a soft curve and a ceiling: `a = amp · clamp(sp / sMax)^0.8`, with
  `sMax` the speed of a brisk stroke, 20–35 px per frame;
- pitch rises a little with speed, 2–6 %, never enough to read as a melody;
- pan follows the head's screen position times 0.8, so nothing sits hard in one ear;
- every control is smoothed by a one-pole follower of 20–30 ms (`follow` does it), or the 33 ms
  steps between frames zipper;
- a line being drawn: `tone`, a sine with 0.28 of the second harmonic on a chord tone of the pad,
  around 0.05;
- a creature in flight: `buzz`, two saws a hair apart (1 : 2.003) through two one-pole low-passes
  near 1.1 kHz, at 200–250 Hz, louder and slightly higher in fast flight, a tremolo of 15–20 Hz
  when it wiggles;
- when the line stops for good, let the voice die with it; silence after a long drone is an event;
- a pencil or a marker on paper: band-passed noise (1.3–5 kHz) whose loudness follows `sp` only
  while `w` shows ink, roughened by a slow random grain, plus a tap on every entry of `strokes`.

The curves come from the main aspect; one track serves the vertical cut too.
