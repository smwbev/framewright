#!/usr/bin/env node
// Soundtrack of "Lake at dawn" from nature.mjs, timed to the page's cues and gust curve.
//   node scripts/export-curves.mjs curves.json ; node audio.mjs track.wav [filmSeed]
// What plays: from frame 0 a very quiet air bed (wind in a calm) under the fade-in; from `alive` the ambience opens:
// lapping at the jetty and the boat, wind in the reeds and a reed/leaf rustle that follow the page's gust (the same
// gust(t) the reeds and the birch crown sway on), a dawn chorus of three songbirds, a brighter call as the bird pair
// crosses (cue `birds`), a distant cuckoo pair near 9.5 s. Nothing on the drawing but the bed; no whoosh.
// The blocks are in nature.mjs (a copy of assets/nature.mjs); assets/audio-nature.mjs is this file made generic.
// Without curves.json, or with curves from another page (no `birds` cue), the FALLBACK table below times it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as NS from './nature.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || 'track.wav', FILM_SEED = +(process.argv[3] ?? process.env.SEED ?? 7), LUFS = -20;
const FALLBACK = { fps: 30, total: 450, cues: { marks: 6, wash: 60, finish: 73, step: 87, done: 98, alive: 105, push: 110, birds: 200 } };
const CJ = path.join(DIR, 'curves.json'), HTML = path.join(DIR, 'index.html');
const C = fs.existsSync(CJ) ? JSON.parse(fs.readFileSync(CJ, 'utf8')) : null;
if (C && fs.existsSync(HTML) && fs.statSync(CJ).mtimeMs < fs.statSync(HTML).mtimeMs) console.warn('curves.json is older than index.html: run node scripts/export-curves.mjs curves.json');
const FILM = C?.cues?.some(c => c.name === 'birds') ? C : null;
const FPS = FILM ? FILM.fps : FALLBACK.fps, TOTAL = FILM ? FILM.total : FALLBACK.total, used = {};
const cue = name => { const c = FILM?.cues?.find(c => c.name === name); if (c) { used[name] = `f${c.f}`; return c.f / FPS; }
  const f = FALLBACK.cues[name]; if (f === undefined) throw new Error(`no cue ${name}`); used[name] = `f${f} (fallback)`; return f / FALLBACK.fps; };

NS.init(TOTAL / FPS, FILM, FILM_SEED);
const END = TOTAL / FPS, ALIVE = cue('alive');
// the page's wind: gust in about -2..2 and life 0..1 per frame; 0..1 for the blocks, calm before life
const g01 = t => { const c = NS.at(t); if (c.gust === undefined) return t < ALIVE ? 0.1 : 0.45; return NS.clamp(0.1 + (0.45 + 0.28 * c.gust) * NS.smooth((t - ALIVE) / 1.8)); };

/* ---------- air and water ---------- */
NS.wind(0, END, { level: -46, f: 260, q: 0.7, lp: 1100, gust: g01, width: 0.8 });                       // wind over the water and in the reeds
// reeds and birch leaves (left side of the frame): 30-280 grains per second with the gust, opening over 1.8 s from `alive`
// (the block's own rate would start at 30 per second on the cue frame)
NS.rustle(ALIVE, END - ALIVE, { rate: t => (30 + 250 * g01(t) ** 2) * NS.smooth((t - ALIVE) / 1.8), band: [2200, 6500], level: -50, pan: -0.45, spread: 0.45 });
NS.lapping(ALIVE - 0.2, END - ALIVE + 0.2, { rate: t => 1.6 * NS.clamp((t - ALIVE + 0.2) / 1.2), level: -36, pan: 0.35, spread: 0.3 });   // jetty and boat (right)

/* ---------- birds ---------- */
NS.birds(cue('alive') + 0.6, END - ALIVE - 0.6, { voices: 3, phrase: [2.2, 5], level: -39, f: [2600, 6800], pan: [-0.8, 0.8], lp: 7500 });
NS.birds(cue('birds') + 0.3, 3.2, { voices: 1, phrase: [4, 5], first: [0.1, 0.3], notes: [4, 7], level: -34, f: [3200, 6500], pan: [-0.3, 0.3], trill: 0.6 });
// a distant cuckoo: two soft notes a third apart, falling (common cuckoo ~ 650 -> 540 Hz, ~0.2 s and ~0.3 s, 0.15 s apart)
function coo(t, f0, d, lvl, pan) { const m = Math.round(d * NS.SR), x = new Float32Array(m); let ph = 0;
  for (let i = 0; i < m; i++) { const u = i / m, f = f0 * (1 - 0.03 * u); ph += f / NS.SR; const e = Math.sin(Math.PI * Math.min(1, u / 0.2)) ** 2 * (u > 0.55 ? Math.cos(0.5 * Math.PI * (u - 0.55) / 0.45) ** 2 : 1);
    x[i] = e * (Math.sin(2 * Math.PI * ph) + 0.12 * Math.sin(4 * Math.PI * ph)); }
  NS.add(t, NS.bq(x, 'lp', 2500, 0.707), pan, NS.db2a(lvl)); }
for (const t of [9.3, 10.35]) { coo(t, 660, 0.2, -40, -0.55); coo(t + 0.36, 545, 0.3, -41, -0.55); }

/* ---------- master ---------- */
NS.room({ wetDb: -9 });
const m = NS.masterNature({ end: END, lufs: LUFS });
NS.writeWav(path.isAbsolute(OUT) ? OUT : path.resolve(process.cwd(), OUT));
const st = NS.stats();
console.log(`${OUT}: ${END} s, timeline ${FILM ? 'curves.json' : 'fallback'}, cues ${JSON.stringify(used)}; ${m.lufs.toFixed(2)} LUFS, peak ${st.peakDb.toFixed(2)} dBFS, TP ~${NS.truePeak().toFixed(2)} dBTP`);
