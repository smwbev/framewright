#!/usr/bin/env node
// Nature soundtrack template for painting and landscape films, built on the blocks in ./nature.mjs (keep both files
// next to index.html; init.sh --painting copies them). No samples, no libraries.
//   node scripts/export-curves.mjs curves.json   (cues, and in a painting film per-frame life and gust, from index.html)
//   node audio.mjs track.wav [filmSeed]
// How to use:
//   1. The timeline comes from curves.json (scripts/make.sh and `npm run audio` refresh it first): the film's length,
//      the cues the page marks in CUES, and per frame `life` (0..1, the painting coming alive) and `gust` (the wind the
//      painted trees and reeds sway on, about -2..2). Without curves.json the FALLBACK table below stands in: copy the
//      total from `node scripts/look.mjs info` and the cue frames from the page.
//   2. What plays: a quiet air bed from frame 0 (the master fades it in over 1.7 s); the drawing and the colour add
//      nothing. From the `alive` cue the ambience opens over ONSET seconds: wind and a leaf rustle that follow the page's
//      gust, then songbirds. Below the ambience, options to switch on when the picture shows them: a sea, lapping
//      water, a bird call on an optional cue. Keep only what the picture shows; references/audio.md section 8 lists
//      every block with its levels.
//   3. Render, then read it without ears: a spectrogram (bed before `alive`, ambience after, birds as short strokes at
//      2-8 kHz), the loudness, and a second render that must be byte-identical:
//      ffmpeg -y -i track.wav -lavfi "showspectrumpic=s=1600x600:legend=1:fscale=log" -frames:v 1 shots/spec.png
//      ffmpeg -hide_banner -nostats -i track.wav -af ebur128=peak=true -f null - 2>&1 | tail -12
//      node audio.mjs shots/again.wav && cmp track.wav shots/again.wav
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as NS from './nature.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || 'track.wav', FILM_SEED = +(process.argv[3] ?? process.env.SEED ?? 7);
const LUFS = -20;     // integrated loudness of the track: an ambience under a picture, quieter than the -14 of a music track
const ONSET = 1.8;    // seconds over which the ambience opens after `alive`: life appears in a few frames, the sound follows more slowly
// without curves.json: frames per second, the film's total in frames, and the frames of the cues the sound uses
const FALLBACK = { fps: 30, total: 360, cues: { marks: 6, wash: 60, finish: 73, step: 87, done: 98, alive: 105, push: 110 } };

const CJ = path.join(DIR, 'curves.json'), HTML = path.join(DIR, 'index.html');
const C = fs.existsSync(CJ) ? JSON.parse(fs.readFileSync(CJ, 'utf8')) : null;
if (!C) console.warn('no curves.json: the FALLBACK table stands in (node scripts/export-curves.mjs curves.json)');
else if (fs.existsSync(HTML) && fs.statSync(CJ).mtimeMs < fs.statSync(HTML).mtimeMs) console.warn('curves.json is older than index.html: run node scripts/export-curves.mjs curves.json');
const FPS = C ? C.fps : FALLBACK.fps, TOTAL = C ? C.total : FALLBACK.total, END = TOTAL / FPS, used = {};
// a moment the picture marks, in seconds, on the frame the picture shows it. has(name) guards a cue the page may not mark.
const frameOf = name => C ? C.cues?.find(c => c.name === name)?.f : FALLBACK.cues[name];
const has = name => frameOf(name) !== undefined;
const cue = name => { const f = frameOf(name);
  if (f === undefined) throw new Error(`no cue ${name} (cues: ${(C ? (C.cues ?? []).map(c => c.name) : Object.keys(FALLBACK.cues)).join(', ') || 'none'}): mark it in the page's CUES or guard it with has()`);
  used[name] = C ? `f${f}` : `f${f} (fallback)`; return f / FPS; };

NS.init(END, C, FILM_SEED);
const ALIVE = cue('alive');
// how open the ambience is at t, 0..1: nothing before `alive`, then a smoothstep over ONSET s, times the page's life
// (NS.at(t) samples the per-frame curves; a page that exports no life counts as alive)
const open = t => NS.smooth((t - ALIVE) / ONSET) * (NS.at(t).life ?? 1);
// the page's wind for the blocks, 0..1: a calm 0.1 until life, then the page's gust around 0.45 (0.45 +- 0.28 per unit)
const gust = t => NS.clamp(0.1 + (0.45 + 0.28 * (NS.at(t).gust ?? 0)) * open(t));

/* ---------- cues of a painting film: what each one gets ----------
   marks, wash, finish, step, done   nothing: the drawing and the colour arrive over the bed alone, no pencil, no whoosh
   alive                             the ambience opens (wind and rustle over ONSET s, birds from +0.6 s, a wave's rise)
   push                              nothing: the camera is silent
   a cue of your own (birds, gulls)  one accent on it; at most one accent every 6 s, never on `alive` itself */

/* ---------- the bed: from frame 0 ---------- */
// wind in a calm (gust 0.1); the same call carries the gusts once the picture lives. level = dBFS of the body at gust 0.
NS.wind(0, END, { level: -46, f: 260, q: 0.7, lp: 1100, gust, width: 0.8 });

/* ---------- the ambience: opens with `alive` ---------- */
// leaves and grass: short grains, 30-280 per second with the gust, opening with the ambience (the block's own default
// rate would start at 30 per second on the cue frame); pan = where the foliage stands (-1 left .. 1 right of the frame)
NS.rustle(ALIVE, END - ALIVE, { rate: t => (30 + 250 * gust(t) ** 2) * open(t), band: [2200, 6500], level: -50, pan: -0.45, spread: 0.45 });
// songbirds from 0.6 s after `alive`: three singers taking turns, a phrase every 2-5 s, softened by distance (lp)
NS.birds(ALIVE + 0.6, END - ALIVE - 0.6, { voices: 3, phrase: [2.2, 5], level: -39, f: [2600, 6800], pan: [-0.8, 0.8], lp: 7500 });

/* ---------- options: switch on what the picture shows ---------- */
// a bird that crosses the frame on a cue the page marks (a CUES row named 'birds'): one nearer, brighter call
if (has('birds')) NS.birds(cue('birds') + 0.3, 3.2, { voices: 1, phrase: [4, 5], first: [0.1, 0.3], notes: [4, 7], level: -34, f: [3200, 6500], pan: [-0.3, 0.3], trill: 0.6 });
// a sea: the surf bed from frame 0 (under it the wind bed can stay), a wave that enters 0.35 s before `alive` so its rise
// lands on the cue, its backwash, and in a longer film a wave every 8 +- 1 s after it. The bed dips before each wave.
// const W0 = ALIVE - 0.35, later = NS.surfWaves(W0 + 8, END - 2);
// NS.surfBed(0, END, { dips: [W0, ...later] });
// const w = NS.surfWave(W0); NS.backwash(w.end, { from: w.last, fadeIn: w.fade });
// small waves at a jetty, a moored boat or a stony bank (a lake, a river): slaps and gurgles that open with the ambience
// NS.lapping(ALIVE, END - ALIVE, { rate: t => 1.6 * open(t), level: -36, pan: 0.35, spread: 0.3 });
// more blocks (references/audio.md section 8): NS.gulls over an open sea, NS.insects at dusk or noon, NS.rain, NS.brook,
// NS.thunder, NS.paperTouch on the blooms of a pencil-and-wash film.

/* ---------- master: a short room, fades, soft clip, loudness to LUFS, 16-bit stereo WAV ---------- */
NS.room();
const m = NS.masterNature({ end: END, lufs: LUFS });
NS.writeWav(path.resolve(process.cwd(), OUT));
const st = NS.stats();
console.log(`${OUT}: ${END} s, timeline ${C ? 'curves.json' : 'fallback'}, cues ${JSON.stringify(used)}; ${m.lufs.toFixed(2)} LUFS, peak ${st.peakDb.toFixed(2)} dBFS, TP ~${NS.truePeak().toFixed(2)} dBTP`);
