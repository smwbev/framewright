#!/usr/bin/env node
// Soundtrack of the promo, 24 s at 120 BPM, timed to the page's cues (curves.json). Everything synthesized.
//   node scripts/export-curves.mjs curves.json ; node audio.mjs track.wav
import fs from 'node:fs';
import * as NS from './nature.mjs';
const OUT = process.argv[2] || 'track.wav', C = JSON.parse(fs.readFileSync('curves.json', 'utf8')), FPS = C.fps;
const cue = n => { const c = C.cues.find(c => c.name === n); if (!c) throw new Error(`no cue ${n}`); return c.f / FPS; };
const END = C.total / FPS, SR = NS.SR, BEAT = 60 / C.bpm;
NS.init(END, C, 7);
let z = 12345; const rnd = () => { z = (Math.imul(z, 1664525) + 1013904223) >>> 0; return z / 4294967296; };
const U = (a, b) => a + (b - a) * rnd();
function osc(dur, f0, f1 = f0, wave = 'saw', o = {}) { const n = Math.round(dur * SR), x = new Float32Array(n); let ph = rnd();
  for (let i = 0; i < n; i++) { const u = i / n, f = o.exp === false ? f0 + (f1 - f0) * u : f0 * Math.pow(f1 / f0, u); ph += f / SR; ph -= Math.floor(ph);
    x[i] = wave === 'sine' ? Math.sin(2 * Math.PI * ph) : wave === 'square' ? (ph < 0.5 ? 1 : -1) : wave === 'tri' ? 1 - 4 * Math.abs(ph - 0.5) : 2 * ph - 1; } return x; }
function env(x, att, dec, o = {}) { const n = x.length; for (let i = 0; i < n; i++) { const t = i / SR; let e = t < att ? t / att : o.hold && t < att + o.hold ? 1 : Math.exp(-(t - att - (o.hold || 0)) / dec); if (i > n - 200) e *= (n - i) / 200; x[i] *= e; } return x; }
const noise = (dur, s) => NS.gauss(Math.round(dur * SR), s ?? ((rnd() * 4294967296) >>> 0));
const put = (t, x, pan = 0, db = 0) => NS.add(t, x, pan, NS.db2a(db));

/* ---- instruments ---- */
const kick = (t, db = -4) => { const x = osc(0.45, 130, 42, 'sine'); env(x, 0.002, 0.16); const c = env(NS.bq(noise(0.02), 'hp', 2500), 0.0005, 0.004); put(t, x, 0, db); put(t, c, 0, db - 16); };
const snare = (t, db = -9) => { put(t, env(NS.bq(noise(0.3), 'bp', 1900, 0.7), 0.001, 0.09), 0, db); put(t, env(osc(0.15, 200, 170, 'tri'), 0.001, 0.05), 0, db - 4); };
const hat = (t, open, db = -21) => put(t, env(NS.bq(noise(open ? 0.3 : 0.06), 'hp', 7500), 0.0005, open ? 0.12 : 0.022), U(-0.3, 0.3), db);
const bass = (t, f, dur, db = -10) => { const x = osc(dur, f, f, 'saw'); env(NS.bq(x, 'lp', 260, 0.9), 0.005, dur * 0.8); put(t, x, 0, db); put(t, env(osc(dur, f, f, 'sine'), 0.005, dur), 0, db - 2); };
const pluck = (t, f, db = -20, pan = 0) => { const x = osc(0.4, f, f, 'saw'); env(NS.bq(x, 'lp', 2400, 1.5), 0.002, 0.11); put(t, x, pan, db); };
function pad(t, fs, dur, db = -24) { for (const f of fs) for (const d of [-0.12, 0, 0.12]) { const x = osc(dur, f * Math.pow(2, d / 12), f * Math.pow(2, d / 12), 'saw'); const y = NS.bq(NS.bq(x, 'lp', 1100, 0.7), 'hp', 140, 0.7);
  for (let i = 0; i < y.length; i++) { const tt = i / SR; y[i] *= Math.min(1, tt / 0.6) * Math.min(1, (dur - tt) / 0.5); } put(t, y, d * 4, db); } }
function impact(t, db = -3) { put(t, env(osc(1.2, 70, 34, 'sine'), 0.002, 0.45), 0, db); put(t, env(NS.bq(noise(0.9), 'lp', 3500), 0.001, 0.22), 0, db - 8);
  put(t, env(NS.bq(noise(1.2), 'hp', 5000), 0.002, 0.35), 0, db - 18); }
function riser(t0, dur, db = -14) { const n = Math.round(dur * SR), x = noise(dur), y = new Float32Array(n); let x1 = 0, x2 = 0, y1 = 0, y2 = 0, k = null;
  for (let i = 0; i < n; i++) { const u = i / n; if (i % 64 === 0) k = NS.bqCoefs('bp', 300 * Math.pow(25, u), 1.2); const [b0, b1, b2, a1, a2] = k, xi = x[i], v = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = xi; y2 = y1; y1 = v; y[i] = v * u * u; }
  put(t0, y, 0, db); const s = osc(dur, 180, 900, 'saw'); for (let i = 0; i < s.length; i++) s[i] *= Math.pow(i / s.length, 2) * 0.35; put(t0, NS.bq(s, 'lp', 3000), 0, db - 6); }
const click = (t, db = -30) => { put(t, env(NS.bq(noise(0.03), 'bp', U(2500, 4200), 1.5), 0.0005, 0.008), U(-0.2, 0.2), db); put(t, env(osc(0.03, 170, 120, 'sine'), 0.001, 0.01), 0, db - 6); };

/* ---- 0-1.5 s: the living lake, then the rewind ---- */
const rew = cue('rew'), pr = cue('type') - 0.24;
NS.lapping(0, rew + 0.1, { rate: 1.8, level: -34, pan: 0.3 });
NS.birds(0, rew, { voices: 1, first: [0.05, 0.1], phrase: [2, 3], level: -30, pan: [-0.5, 0.5] });
pad(0, [110, 164.8, 246.9, 261.6], rew + 0.1, -26);
{ const d = pr - rew; const w = osc(d, 1400, 160, 'saw'); for (let i = 0; i < w.length; i++) w[i] *= 0.6 * (0.6 + 0.4 * Math.sin(2 * Math.PI * 38 * i / SR)); put(rew, NS.bq(w, 'lp', 2500), 0, -18);
  put(rew, env(NS.bq(noise(d), 'bp', 1800, 0.8), 0.02, 0.4), 0, -20); for (let k = 0; k < 10; k++) click(rew + k * d / 10, -28); }
/* ---- the prompt: keys ---- */
{ const ts = cue('type'), rate = 1.7 * FPS, nch = 76; for (let k = 0; k < nch; k += 2) click(ts + k / rate + U(-0.01, 0.01), -24); pad(pr, [110, 164.8, 220], cue('paint') - pr + 0.2, -32); }
/* ---- the painting: pencil, colour swell, the lake alive, a riser into the drop ---- */
const P0 = cue('paint'), AL = cue('alive'), DROP = cue('drop');
{ const d = 2.0, x = NS.bq(noise(d), 'bp', 3800, 1.1); for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] *= (0.4 + 0.6 * Math.abs(Math.sin(2 * Math.PI * 3.1 * t + 2 * Math.sin(t * 5)))) * Math.min(1, t / 0.2) * Math.min(1, (d - t) / 0.3); } put(P0 + 0.2, x, -0.2, -26); }
pad(P0, [110, 164.8, 246.9], AL - P0 + 0.3, -24);
{ const d = AL - P0 - 2, x = NS.bq(noise(d), 'lp', 5000); for (let i = 0; i < x.length; i++) x[i] *= Math.pow(i / x.length, 2.5); put(P0 + 2, x, 0, -24); }
kick(AL, -10); pad(AL, [87.3, 130.8, 174.6, 220, 261.6], DROP - AL, -22);
NS.lapping(AL, DROP - AL, { rate: 1.6, level: -32, pan: 0.35 }); NS.birds(AL + 0.3, DROP - AL - 0.5, { voices: 2, phrase: [1.2, 2.5], level: -30 });
NS.wind(AL, DROP - AL, { level: -44, gust: 0.35 });
riser(DROP - 2.0, 2.0, -12);
/* ---- the montage: the beat, a hit on every card ---- */
const CH = [[55, [220, 261.6, 329.6]], [43.65, [174.6, 220, 261.6]], [65.4, [261.6, 329.6, 392]], [49, [196, 246.9, 293.7]]];
for (let bar = 0; bar < 4; bar++) { const t0 = DROP + bar * 4 * BEAT, [root, tri] = CH[bar];
  for (let b = 0; b < 4; b++) { const t = t0 + b * BEAT; kick(t); if (b % 2) snare(t); hat(t + BEAT / 2, b === 3); hat(t, false); bass(t, root, BEAT * 0.9); bass(t + BEAT / 2, root * (b % 2 ? 2 : 1), BEAT * 0.45, -12); }
  for (let s = 0; s < 16; s++) pluck(t0 + s * BEAT / 4, tri[s % 3] * (s % 8 < 4 ? 2 : 4), -24, s % 2 ? 0.4 : -0.4);
  pad(t0, tri, 4 * BEAT, -30); }
for (let k = 0; k < 8; k++) { const t = DROP + k * 2 * BEAT; if (k) impact(t, -10); else impact(t, -3);
  const fx = [ () => put(t, env(NS.bq(noise(0.35), 'bp', 3000, 0.5), 0.002, 0.12), 0, -20),                                     // TV static
    () => { put(t + 0.05, env(NS.bq(noise(0.12), 'lp', 900), 0.002, 0.04), -0.3, -16); put(t + 0.3, env(NS.bq(noise(0.12), 'lp', 900), 0.002, 0.04), 0.3, -16); },   // press
    () => { for (const [dt, f] of [[0.05, 1760], [0.14, 1760], [0.3, 2349]]) put(t + dt, env(osc(0.07, f, f, 'square'), 0.001, 0.03), 0, -26); },   // terminal beeps
    () => put(t + 0.05, env(NS.bq(noise(0.5), 'bp', 5200, 2), 0.05, 0.2), 0.2, -26),                                         // pen on vellum
    () => put(t, env(NS.bq(osc(0.6, 220, 220, 'saw'), 'lp', 2200, 2), 0.002, 0.25), 0, -16),                                    // neon stab
    () => { put(t + 0.05, env(osc(0.08, 988, 988, 'square'), 0.001, 0.05), 0, -24); put(t + 0.13, env(osc(0.3, 1319, 1319, 'square'), 0.001, 0.12), 0, -24); },   // coin
    () => put(t, env(osc(0.5, 600, 1400, 'sine'), 0.01, 0.2), 0, -24),                                                        // scope sweep
    () => { put(t, env(NS.bq(noise(0.4), 'bp', 2500, 0.6), 0.02, 0.12), 0, -22); impact(t + 0.4, -14); } ];                   // paper + stamp
  fx[k](); }
/* ---- the numbers, the end card ---- */
for (const n of ['s1', 's2', 's3']) { impact(cue(n), -4); kick(cue(n), -6); }
riser(cue('end') - 0.9, 0.9, -18);
{ const E = cue('end'); impact(E, -8); pad(E, [110, 164.8, 220, 277.2, 329.6], END - E, -20);
  for (const [dt, f] of [[0, 880], [0.25, 1108.7], [0.5, 1318.5]]) put(E + dt, env(osc(2.2, f, f, 'sine'), 0.003, 0.7), 0, -26); }

NS.room({ t60: 0.25, wetDb: -16, ripple: null });
const m = NS.masterNature({ end: END, lufs: -14, fadeIn: 0.01, fadeIn0: 1, fadeOut: 0.8, ceiling: 0.89 });
NS.writeWav(OUT);
console.log(`${OUT}: ${END} s, ${m.lufs.toFixed(2)} LUFS, peak ${NS.stats().peakDb.toFixed(2)} dBFS`);
