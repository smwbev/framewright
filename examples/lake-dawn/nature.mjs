// nature.mjs: nature-sound blocks for framewright soundtracks: sea, wind, leaves, birds, gulls, insects, rain, a brook,
// thunder, lapping water. Plain JS, no dependencies, no samples. Every sound is noise, sines and filters driven by seeded
// generators: the same film seed gives a byte-identical WAV. It sits next to the project's audio.mjs (init.sh --painting
// copies it; assets/audio-nature.mjs is the soundtrack template built on it; references/audio.md section 8 lists the blocks).
//
// From audio.mjs:
//   import * as NS from './nature.mjs';
//   const C = JSON.parse(fs.readFileSync('curves.json', 'utf8'));    // node scripts/export-curves.mjs curves.json
//   const cue = name => C.cues.find(c => c.name === name).f / C.fps;  // a moment the page marks, in seconds
//   NS.init(C.total / C.fps, C, 7);        // 1. length in seconds, the curves (or null), film seed; clears the master
//   NS.wind(0, C.total / C.fps, { gust: t => 0.45 + 0.28 * (NS.at(t).gust ?? 0) });   // 2. blocks, in absolute seconds;
//   NS.birds(cue('alive') + 0.6, 8);        //    NS.at(t): the page's per-frame curves (life, gust, ...) at time t
//   NS.room();                              // 3. a short diffuse room over the whole mix
//   NS.masterNature({ lufs: -20 });         // 4. fades, soft clip, loudness normalisation (replaces the template's master)
//   NS.writeWav('track.wav');               // 5. 16-bit stereo WAV for build.sh
// Keep that order: blocks, room(), masterNature(), writeWav(). NS.stats() and NS.truePeak() report on the master.
// The module follows the conventions of assets/audio-template.mjs (SR 44100, Float32 buffers, add(t0, buf, pan, gain)
// with constant-power pan, one-pole lp/hp): sections 2-4 also paste into the template as they are (strip `export`).
//
// FITTED blocks (surfBed, surfWave, backwash, and the defaults of room and masterNature) were fitted to a recorded surf
// track (band envelopes within ~1.3 dB). DESIGNED blocks (wind, rustle, birds, gulls, insects, rain, brook, thunder,
// lapping, paperTouch) are built from published acoustics, written above each block, and tuned on spectrograms.
//
// LEVELS. `level` is dBFS of the mono source before panning: for noise layers the band power (mean square inside
// the stated band, 4th-order edges, bandNorm), for tonal calls the RMS at the envelope peak. add() puts a centred
// source at -3 dB per channel (constant power), the same for every block, so levels are comparable; the absolute
// level of the film is set at the end by masterNature (K-weighted loudness).
// SEEDS. Every block takes o.seed. Without it the seed is hash(film seed, block name, call number of that name):
// adding a bird never changes the sea, and adding a second bird call changes only the birds after it.

/* ====================================================================================================== */
/* 1. core: the template already has these (SR, N, L, Rr, C, T, clamp, lerp, add, lp, hp, at); nature.mjs keeps its own copy */
/* ====================================================================================================== */
import fs from 'node:fs';

export const SR = 44100;
export let N = 0, L = new Float32Array(0), Rr = new Float32Array(0), C = null, T = { end: 0 };

// start a soundtrack: dur seconds, optional curves (the parsed curves.json), film seed
export function init(dur, curves = null, seed = 1) {
  N = Math.round(dur * SR); L = new Float32Array(N); Rr = new Float32Array(N);
  C = curves; T = { end: dur }; SEED = seed >>> 0; COUNT.clear();
}
export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;

// mix a mono buffer into the master at t0 with constant-power pan (-1..1): the template's add()
export function add(t0, arr, pan = 0, gain = 1) {
  const s0 = Math.round(t0 * SR), gl = Math.cos((pan + 1) * Math.PI / 4) * gain, gr = Math.sin((pan + 1) * Math.PI / 4) * gain;
  const i0 = Math.max(0, -s0), i1 = Math.min(arr.length, N - s0);
  for (let i = i0; i < i1; i++) { L[s0 + i] += arr[i] * gl; Rr[s0 + i] += arr[i] * gr; }
}
// one-pole filters (6 dB/oct), the template's lp/hp
export function lp(arr, fc) { const a = 1 - Math.exp(-2 * Math.PI * fc / SR); let y = 0; const o = new Float32Array(arr.length); for (let i = 0; i < arr.length; i++) { y += a * (arr[i] - y); o[i] = y; } return o; }
export function hp(arr, fc) { const l = lp(arr, fc); const o = new Float32Array(arr.length); for (let i = 0; i < arr.length; i++) o[i] = arr[i] - l[i]; return o; }
// the curve values at time t (seconds), linear between frames; {} when the film exports no per-frame curves
export function at(t) {
  const F = C?.frames; if (!F?.length) return {};
  const x = clamp(t * C.fps, 0, F.length - 1), i = Math.max(0, Math.min(F.length - 2, Math.floor(x))), q = x - i, a = F[i], b = F[i + 1] ?? a, o = {};
  for (const key in a) o[key] = a[key] + ((b[key] ?? a[key]) - a[key]) * q;
  return o;
}
// 16-bit (default) or 32-bit float stereo WAV of the master; refuses NaN/Inf
export function writeWav(path, { bits = 16 } = {}) {
  for (let i = 0; i < N; i++) if (!Number.isFinite(L[i]) || !Number.isFinite(Rr[i])) throw new Error(`writeWav: non-finite sample at ${i}`);
  const bps = bits / 8, fmt = bits === 32 ? 3 : 1, buf = Buffer.alloc(44 + N * 2 * bps), dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  buf.write('RIFF', 0); dv.setUint32(4, 36 + N * 2 * bps, true); buf.write('WAVE', 8); buf.write('fmt ', 12); dv.setUint32(16, 16, true);
  dv.setUint16(20, fmt, true); dv.setUint16(22, 2, true); dv.setUint32(24, SR, true); dv.setUint32(28, SR * 2 * bps, true);
  dv.setUint16(32, 2 * bps, true); dv.setUint16(34, bits, true); buf.write('data', 36); dv.setUint32(40, N * 2 * bps, true);
  const q = v => Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
  for (let i = 0, o = 44; i < N; i++, o += 2 * bps) {
    if (bits === 32) { dv.setFloat32(o, L[i], true); dv.setFloat32(o + 4, Rr[i], true); }
    else { dv.setInt16(o, q(L[i]), true); dv.setInt16(o + 2, q(Rr[i]), true); }
  }
  fs.writeFileSync(path, buf);
}
// quick numbers on the master (or any pair of buffers): peak, RMS dBFS, DC, samples at or over full scale
export function stats(a = L, b = Rr) {
  let pk = 0, s = 0, dc = 0, over = 0, bad = 0;
  for (let i = 0; i < a.length; i++) for (const v of [a[i], b[i]]) { if (!Number.isFinite(v)) { bad++; continue; } const m = Math.abs(v); if (m > pk) pk = m; if (m >= 0.999) over++; s += v * v; dc += v; }
  const n = 2 * a.length;
  return { peakDb: 20 * Math.log10(pk + 1e-12), rmsDb: 10 * Math.log10(s / n + 1e-20), dc: dc / n, over, nonFinite: bad };
}

/* ====================================================================================================== */
/* 2. nature helpers (paste sections 2-4 into the template after its building blocks: they need only SR, N, L, */
/*    Rr, C, T, clamp, lerp, add, lp, hp, at from it; replace its master with masterNature)                          */
/* ====================================================================================================== */
let SEED = 1;                 // the film seed (init() sets it; in the template, set it once before the events)
const COUNT = new Map();      // calls per block name, for the default seeds
export const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const db2a = db => db <= -100 ? 0 : Math.pow(10, db / 20);
// two decorrelated buffers as a diffuse stereo source, each channel at the level a centred mono source would have
export function addDiffuse(t0, a, b, gain = 1) {
  const s0 = Math.round(t0 * SR), g = gain * Math.SQRT1_2, i0 = Math.max(0, -s0), i1 = Math.min(a.length, N - s0);
  for (let i = i0; i < i1; i++) { L[s0 + i] += a[i] * g; Rr[s0 + i] += b[i] * g; }
}
// seeds: FNV-1a of "filmSeed|name|k", then a murmur3 finaliser
function fnv(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
export function hash(name, k = 0) { let h = fnv(`${SEED}|${name}|${k}`); h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; }
// base seed of one block call: o.seed pins it, otherwise the n-th call of this block name
export function seedFor(o, name) { if (o && o.seed !== undefined) return hash(name, 'seed:' + o.seed); const k = COUNT.get(name) || 0; COUNT.set(name, k + 1); return hash(name, k); }
// uniform generator (mulberry32): rng(seed)() in [0, 1)
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const U = (r, a, b) => a + (b - a) * r(), LU = (r, a, b) => a * Math.pow(b / a, r()), IR = (r, a, b) => a + Math.floor(r() * (b - a + 1));
// Gaussian white noise from its own generator (Box-Muller); the surf was fitted with Gaussian, not uniform, noise
export function gauss(n, seed) {
  const r = rng(seed), o = new Float32Array(n);
  for (let i = 0; i < n; i += 2) { const m = Math.sqrt(-2 * Math.log(1 - r())), p = 2 * Math.PI * r(); o[i] = m * Math.cos(p); if (i + 1 < n) o[i + 1] = m * Math.sin(p); }
  return o;
}
// RBJ cookbook biquad: 'lp' 'hp' 'bp' (0 dB peak) 'peak' 'lowshelf' 'highshelf'
export function bqCoefs(type, f0, Q = 0.7071, gainDb = 0) {
  const A = Math.pow(10, gainDb / 40), w = 2 * Math.PI * Math.min(f0, SR * 0.49) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * Q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'peak') { b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; }
  else if (type === 'lowshelf' || type === 'highshelf') {
    const sq = 2 * Math.sqrt(A) * al;
    if (type === 'lowshelf') { b0 = A * ((A + 1) - (A - 1) * c + sq); b1 = 2 * A * ((A - 1) - (A + 1) * c); b2 = A * ((A + 1) - (A - 1) * c - sq); a0 = (A + 1) + (A - 1) * c + sq; a1 = -2 * ((A - 1) + (A + 1) * c); a2 = (A + 1) + (A - 1) * c - sq; }
    else { b0 = A * ((A + 1) + (A - 1) * c + sq); b1 = -2 * A * ((A - 1) + (A + 1) * c); b2 = A * ((A + 1) + (A - 1) * c - sq); a0 = (A + 1) - (A - 1) * c + sq; a1 = 2 * ((A - 1) - (A + 1) * c); a2 = (A + 1) - (A - 1) * c - sq; }
  } else throw new Error(`bq: unknown type ${type}`);
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
export function bq(x, type, f0, Q = 0.7071, gainDb = 0) {
  const [b0, b1, b2, a1, a2] = bqCoefs(type, f0, Q, gainDb), o = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const xi = x[i], y = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = xi; y2 = y1; y1 = y; o[i] = y; }
  return o;
}
// filter chain: [['hp', 57, 0.5], ['lp1', 290], ['peak', 108, 5, 6], ...]; lp1/hp1 are the one-pole lp/hp
export function chain(x, spec) {
  for (const st of spec) x = st[0] === 'lp1' ? lp(x, st[1]) : st[0] === 'hp1' ? hp(x, st[1]) : bq(x, st[0], st[1], st[2] ?? 0.7071, st[3] ?? 0);
  return x;
}
// gain from [t, dB] breakpoints, linear in dB, sampled at t0 + i/SR; held before the first and after the last point;
// <= -100 dB is silence
export function envDb(pts, n, t0 = 0) {
  const o = new Float32Array(n), P = pts.length; let j = 0;
  for (let i = 0; i < n; i++) {
    const t = t0 + i / SR; let d;
    if (t <= pts[0][0]) d = pts[0][1];
    else if (t >= pts[P - 1][0]) d = pts[P - 1][1];
    else { while (j < P - 2 && t > pts[j + 1][0]) j++; const ta = pts[j][0], da = pts[j][1], tb = pts[j + 1][0], dbb = pts[j + 1][1]; d = da + (dbb - da) * (t - ta) / (tb - ta); }
    o[i] = d <= -100 ? 0 : Math.pow(10, d / 20);
  }
  return o;
}
// slow random gain: white -> two one-pole LPs at rateHz -> unit std -> 10^(depthDb*z/20).
// The statistics are taken over at least `span` seconds so a short event wanders as much as a long bed.
// hpHz (default 0 = off): a one-pole high-pass on z before the normalisation, for a layer whose slow shape is already a
// fitted envelope table (the wave): it keeps the texture and drops the slow drift that would double the table's shape.
export function wander(n, rateHz, depthDb, seed, span = 10, hpHz = 0) {
  const m = Math.max(n, Math.round(span * SR)), z0 = lp(lp(gauss(m + SR, seed), rateHz), rateHz), z = hpHz ? hp(z0, hpHz) : z0;
  let mu = 0; for (let i = SR; i < m + SR; i++) mu += z[i]; mu /= m;
  let s = 0; for (let i = SR; i < m + SR; i++) s += (z[i] - mu) ** 2; const sd = Math.sqrt(s / m) + 1e-12;
  const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = Math.pow(10, depthDb * ((z[i + SR] - mu) / sd) / 20);
  return o;
}
// scale x (in place) so its mean square inside lo..hi (two 2nd-order HPs at lo, two 2nd-order LPs at hi) is 1
export function bandNorm(x, lo, hi) {
  const y = bq(bq(bq(bq(x, 'hp', lo), 'hp', lo), 'lp', hi), 'lp', hi);
  let s = 0; for (let i = 0; i < y.length; i++) s += y[i] * y[i];
  const g = 1 / Math.sqrt(s / y.length + 1e-20); for (let i = 0; i < x.length; i++) x[i] *= g;
  return x;
}
// a stationary coloured-noise layer of n samples: chain after a 1-s warm-up, calibrated by band power over >= 4 s
export function noiseLayer(n, spec, band, seed) {
  const m = Math.max(n, 4 * SR), x = chain(gauss(m + SR, seed), spec).slice(SR);
  bandNorm(x, band[0], band[1]);
  return n === m ? x : x.slice(0, n);
}
// time-varying state-variable band-pass (TPT/Zavalishin), unit peak gain; fc(i) and q(i) per sample
function svfBP(x, fcOf, q, kr = 16) {
  const o = new Float32Array(x.length); let ic1 = 0, ic2 = 0, a1 = 0, a2 = 0, a3 = 0, k = 1 / q;
  for (let i = 0; i < x.length; i++) {
    if (i % kr === 0) { const g = Math.tan(Math.PI * Math.min(fcOf(i), SR * 0.45) / SR); k = 1 / (typeof q === 'function' ? q(i) : q); a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2; }
    const v3 = x[i] - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2; o[i] = k * v1;
  }
  return o;
}
// piecewise-linear value of [t, v] points at t, held at both ends
export function pwl(pts, t) { if (t <= pts[0][0]) return pts[0][1]; for (let j = 1; j < pts.length; j++) if (t <= pts[j][0]) { const [ta, va] = pts[j - 1], [tb, vb] = pts[j]; return va + (vb - va) * (t - ta) / (tb - ta); } return pts[pts.length - 1][1]; }
const rmsOf = (x, a = 0, b = x.length) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, b - a)); };
const fnOf = v => typeof v === 'function' ? v : () => v;
// a local stereo bus: blocks that place many events render here, get calibrated, then go to the master
function bus(n) {
  const l = new Float32Array(n), r = new Float32Array(n);
  return { l, r, n,
    add(s0, arr, pan = 0, gain = 1) { const gl = Math.cos((pan + 1) * Math.PI / 4) * gain, gr = Math.sin((pan + 1) * Math.PI / 4) * gain, i0 = Math.max(0, -s0), i1 = Math.min(arr.length, n - s0); for (let i = i0; i < i1; i++) { l[s0 + i] += arr[i] * gl; r[s0 + i] += arr[i] * gr; } },
    power() { let s = 0; for (let i = 0; i < n; i++) s += l[i] * l[i] + r[i] * r[i]; return s / n; },
    mix(t0, gain = 1) { const s0 = Math.round(t0 * SR), i0 = Math.max(0, -s0), i1 = Math.min(n, N - s0); for (let i = i0; i < i1; i++) { L[s0 + i] += l[i] * gain; Rr[s0 + i] += r[i] * gain; } } };
}
// gust curve for wind and rustle: [{t, peak, rise, hold, fall}] over a base level, smoothstep rise and fall
// (real gusts rise in about 1 s and die away more slowly; defaults rise 1.2 s, fall 2.5 s)
export function gusts(list, { base = 0.15 } = {}) {
  return t => { let g = base; for (const e of list) { const { t: te, peak = 0.9, rise = 1.2, hold = 0.4, fall = 2.5 } = e, u = t - te; let v = 0;
    if (u > 0 && u < rise) v = smooth(u / rise); else if (u >= rise && u < rise + hold) v = 1; else if (u >= rise + hold && u < rise + hold + fall) v = 1 - smooth((u - rise - hold) / fall);
    g = Math.max(g, base + (peak - base) * v); } return g; };
}

/* ====================================================================================================== */
/* 3. FITTED blocks: sea surf, fitted to a recorded surf track (band envelopes within ~1.3 dB)            */
/* ====================================================================================================== */
// wave components; filter shapes fitted jointly to the bed-subtracted spectra of four phases of one recorded wave
export const RUMBLE = [['hp', 57, 0.5], ['lp', 290, 0.707], ['peak', 60, 3, 1.5], ['peak', 80, 4, -10], ['peak', 108, 5, 6], ['peak', 38, 1.5, -3]];
const RUMBLE_WASH = RUMBLE.slice(0, 5);   // the wash was fitted on the chain without the 38-Hz cut
export const ROAR = [['hp', 150, 0.707], ['lp1', 290], ['lp1', 1500], ['lp1', 6700]];
export const FOAM = [['hp', 1450, 0.707], ['lp1', 6500]];
export const SURF = {
  // the stationary bed: level = dBFS band power; wander [rate Hz, std dB]; dip = dB of the draw-back before a wave
  bed: {
    sub: { chain: [['hp', 20, 0.7], ['lp', 100, 0.707]], band: [20, 90], level: -49.4, wander: [1.5, 2.0], dip: 0 },
    body: { chain: [['hp', 100, 0.707], ['lp', 540, 0.707], ['peak', 79, 3.0, -6.0]], band: [100, 2000], level: -35.5, wander: [1.5, 1.5], dip: -2 },
    hiss: { chain: [['hp', 2200, 0.707], ['lp1', 12000]], band: [2500, 11500], level: -53.4, wander: [3.0, 1.0], dip: -3 },
  },
  // the draw-back as a share of `dip`, in seconds re the wave's entry t0: the bed sinks from 0.35 s before the entry,
  // stays down for 0.8 s and is back by +1.15 s
  dip: [[-0.35, 0], [-0.05, 1], [0.75, 1], [1.15, 0]],
  // one wave: [t - onset s, dBFS band power], fitted to one recorded wave
  wave: {
    rumble: { chain: RUMBLE, band: [60, 250], wander: [1.5, 1.8], env: [[0, -77.7], [0.8, -52.1], [1.4, -36.6], [2.0, -32.4], [2.2, -33.5], [2.6, -29.3], [3.0, -30.5], [3.2, -29.8], [3.4, -27.2], [3.8, -26.3], [4.0, -24.6], [4.2, -27.1], [4.4, -25.6], [4.6, -20.6], [4.8, -21.4], [5.2, -19.5], [5.4, -22.4], [5.8, -23.3], [6.0, -27.0], [6.15, -27.8]] },
    roar: { chain: ROAR, band: [250, 2000], wander: [1.5, 1.5], env: [[0, -72.9], [0.6, -39.3], [0.8, -31.9], [1.4, -23.6], [1.6, -22.9], [2.6, -28.9], [3.4, -29.0], [4.0, -30.8], [4.2, -30.1], [4.6, -26.3], [4.8, -25.2], [5.4, -26.5], [6.0, -30.2], [6.15, -31.5]] },
    foam: { chain: FOAM, band: [2500, 11500], wander: [3.0, 1.0], env: [[0, -91.9], [0.8, -63.7], [1.0, -58.0], [1.2, -54.3], [1.4, -52.4], [2.2, -49.8], [2.8, -44.3], [3.8, -40.3], [4.6, -32.3], [4.8, -31.4], [5.0, -32.7], [5.4, -32.4], [6.0, -36.3], [6.15, -37.0]] },
  },
  // a receding wash, fitted to a recorded one (dBFS band power), silent by +2.0 s
  wash: {
    rumble: { chain: RUMBLE_WASH, band: [60, 250], wander: [1.5, 2.0], env: [[0, -35.3], [0.25, -36.5], [0.45, -40.2], [1.45, -44.5], [2.0, -120]] },
    roar: { chain: ROAR, band: [250, 2000], wander: [1.5, 1.8], env: [[0, -33.8], [1.05, -46.9], [1.45, -53.5], [2.0, -120]] },
    foam: { chain: FOAM, band: [2500, 11500], wander: [3.0, 1.2], env: [[0, -42.9], [0.85, -52.8], [1.45, -55.7], [2.0, -120]] },
  },
};

// surfBed(t0, dur, o): the stationary sea, three parts calibrated by band power (flat to 25 Hz, notch at 79 Hz,
// 2nd-order roll-off above 540 Hz, hiss shelf ~18 dB under the body). Broadband about -34.6 dBFS RMS per channel.
// o.gainDb shifts all parts; o.dips: wave onsets (s) that get the draw-back before a wave (-2 dB body, -3 dB hiss);
// o.wash (default true): the bed opens with a receding wash (a backwash at t0), false for a flat start; o.wide: hiss
// L/R correlation 0.95 instead of dual mono.
export function surfBed(t0, dur, o = {}) {
  const { gainDb = 0, dips = [], wash = true, wide = false } = o, base = seedFor(o, 'surfBed'), n = Math.round(dur * SR);
  for (const [k, P] of Object.entries(SURF.bed)) {
    const s = noiseLayer(n, P.chain, P.band, hash(k, base)), w = wander(n, P.wander[0], P.wander[1], hash(k + '.w', base)), g = db2a(P.level + gainDb);
    const dipDb = new Float32Array(n);   // dB, linear in dB between the SURF.dip breakpoints
    if (P.dip) for (const d of dips) for (let i = 0; i < n; i++) { const f = pwl(SURF.dip, t0 + i / SR - d); if (f) dipDb[i] += P.dip * f; }
    for (let i = 0; i < n; i++) s[i] *= g * w[i] * (dipDb[i] ? Math.pow(10, dipDb[i] / 20) : 1);
    if (wide && k === 'hiss') {
      const s2 = noiseLayer(n, P.chain, P.band, hash(k + '.R', base)), c = Math.cos(Math.PI / 20), sn = Math.sin(Math.PI / 20), a = new Float32Array(n), b = new Float32Array(n);
      for (let i = 0; i < n; i++) { const y = s2[i] * g * w[i]; a[i] = c * s[i] + sn * y; b[i] = c * s[i] - sn * y; }   // corr cos(2*9 deg) = 0.95
      addDiffuse(t0, a, b);
    } else add(t0, s, 0, 1);
  }
  if (wash) backwash(t0, { gainDb, seed: base });
}

// three wave-shaped parts under breakpoint envelopes (shared by surfWave and backwash)
function surfEvent(t0, parts, envs, o, base, len, fadeIn = 0, fadeOut = 0) {
  const n = Math.round(len * SR), nIn = Math.round(fadeIn * SR), nOut = Math.round(fadeOut * SR);
  for (const [k, P] of Object.entries(parts)) {
    const s = noiseLayer(n, P.chain, P.band, hash(k, base)), w = wander(n, P.wander[0], P.wander[1], hash(k + '.w', base), 10, P.wander[2] || 0), e = envDb(envs[k], n);
    // energy-true wander (default; o.energy: false = the raw fit): the table fixes each part's energy over the event and the
    // wander only moves it in time, so a seed does not make the whole wave louder or quieter (the master's loudness
    // normalisation turned that into a global level offset: band error 1.26-1.84 dB over 12 film seeds, 1.23-1.59 with it)
    if (o.energy !== false) { let a = 0, b = 0; for (let i = 0; i < n; i++) { const q = e[i] * e[i]; a += q * w[i] * w[i]; b += q; } const c = Math.sqrt(b / (a + 1e-30)); for (let i = 0; i < n; i++) w[i] *= c; }
    for (let i = 0; i < n; i++) {
      let g = e[i] * w[i];
      if (i < nIn) g *= Math.sin(0.5 * Math.PI * i / nIn);                         // equal-power cross-fade with the
      if (nOut && i >= n - nOut) g *= Math.cos(0.5 * Math.PI * (i - (n - nOut)) / nOut);   // event it follows
      s[i] *= g;
    }
    add(t0, s, o.pan ?? 0, 1);
  }
}
// surfWave(t0, o): one wave, surge -> break -> wash, entering at t0 (the roar opens it, crest at the surge +1.4-1.6 s; the
// foam lags ~1.5 s; rumble and foam crest together at the break +4.6-5.2 s, two lips 0.5 s apart). Fitted to +6.15 s;
// o.lead (0.15 s): the envelope table starts that long before the wave's first audible energy, so t0 is the entry.
// A wave that should rise on a picture's moment enters 0.35 s before it: with surfWave(cue('alive') - 0.35) the sea is
// back at the bed's level on the cue, ~1.5 dB over it 4 frames later, 8-10 dB over it at 17 frames (30 fps). Then it
// cross-fades (o.fade, 0.1 s) into backwash(): pass {from: w.last, fadeIn: w.fade} to continue it. o.gainDb shifts the
// event (+-2 dB between waves); o.stretch (design) scales the surge-to-break interval (3.0-3.6 s as fitted).
// Returns {t0, end, fade, last: {rumble, roar, foam} dB at the end}.
export function surfWave(t0, o = {}) {
  const { gainDb = 0, stretch = 1, fade = 0.1, lead = 0.15 } = o, base = seedFor(o, 'surfWave'), envs = {}, last = {};
  const tm = t => t <= 1.6 ? t : 1.6 + (t - 1.6) * stretch, z = t0 - lead;
  for (const [k, P] of Object.entries(SURF.wave)) { envs[k] = P.env.map(([t, v]) => [tm(t), v + gainDb]); last[k] = envs[k][envs[k].length - 1][1]; }
  const endT = tm(6.15);
  surfEvent(z, SURF.wave, envs, o, base, endT + fade, 0, fade);
  return { t0, end: z + endT, fade, last };
}
// backwash(t0, o): a receding wash, silent by +2.0 s. o.from = {rumble, roar, foam} start levels (dB) to continue a
// wave (the fitted decay shape is kept); o.gainDb shifts it; o.fadeIn: cross-fade length.
export function backwash(t0, o = {}) {
  const { gainDb = 0, from = null, fadeIn = 0 } = o, base = seedFor(o, 'backwash'), envs = {};
  for (const [k, P] of Object.entries(SURF.wash)) { const d = (from ? from[k] - P.env[0][1] : 0) + gainDb; envs[k] = P.env.map(([t, v]) => [t, v <= -100 ? v : v + d]); }
  surfEvent(t0, SURF.wash, envs, o, base, 2.0, fadeIn, 0);
}
// surfWaves(from, to, o): a sea for any length (design around the fitted wave): a wave every 8 +- 1 s (a choice: one
// recorded wave gives no period), crest +-2 dB, each followed by its backwash. Returns the onsets (pass them to surfBed
// as dips).
export function surfWaves(from, to, o = {}) {
  const { every = 8, jitter = 1, gainJitter = 2, first = from } = o, base = seedFor(o, 'surfWaves'), r = rng(hash('t', base)), on = [];
  for (let t = first, k = 0; t < to - 2; t += every + jitter * (2 * r() - 1), k++) {
    const w = surfWave(t, { gainDb: gainJitter * (2 * r() - 1), seed: hash('w' + k, base), pan: o.pan });
    backwash(w.end, { from: w.last, fadeIn: w.fade, seed: hash('b' + k, base), pan: o.pan }); on.push(t);
  }
  return on;
}

// room(o): a short diffuse room. The recorded surf track has a fixed spectral ripple (std 1.5-2.3 dB, half-width
// 8-19 Hz) that dry synthetic noise lacks; this adds it. Fitted defaults: T60 0.12 s, 4-ms predelay, wet -11 dB, wet
// path high-passed at 200 Hz (below that a random IR moves 1/3-octave bands by +-3 dB). The IR is velvet noise: sparse
// +-1 taps at `density`/s under exp(-6.91 t / T60), unit energy (~290 taps: 0.2 G multiply-adds per channel); over 12 IR
// seeds it gives the same ripple as a dense 6400-tap Gaussian IR (150 Hz-1 kHz std 1.41 vs 1.39 dB at wet -12 dB).
// Works in place on the master; a dual-mono master stays dual mono.
export function room(o = {}) {
  const { t60 = 0.12, predelay = 0.004, wetDb = -11, hp: hpf = 200, density = 2000, tries = 16 } = o, base = seedFor(o, 'room');
  const ripple = o.ripple !== undefined ? o.ripple : wetDb === -11 && t60 === 0.12 ? [1.4, 1.55] : null;   // the window is calibrated for the default room only
  const len = Math.round(1.2 * t60 * SR), Td = SR / density, [lo, hi] = o.band === undefined ? [150, 1000] : (o.band || [150, 1000]);
  // The wet path is scaled to unit mean power inside lo..hi (|H| by a direct DFT of the taps on the 2.7-Hz grid of the
  // ripple measurement): a sparse IR's in-band energy varies from seed to seed, and with it the ripple.
  // o.ripple [a, b]: the predicted 150 Hz-1 kHz ripple (std dB of 20log|1 + k Hhp H| about its quadratic trend, window
  // 1/6 of the band) must fall inside a..b, else the next IR draw (seed:1, seed:2, ...) is tried and the closest one is
  // kept. Over 23 film seeds the first draw alone predicted 0.99-1.56 dB and the tracks measured 1.34-1.71; with
  // [1.4, 1.55] they measure 1.39-1.69, mean 1.59 (the recording: 1.54). The rest of the spread is the dry sea's own
  // fine structure (~0.8 dB without the room). null = the first draw (the default for any other room).
  const df = SR / 16384, F = []; for (let f = Math.ceil(lo / df) * df; f <= hi; f += df) F.push(f);
  const [b0, b1, b2, a1, a2] = bqCoefs('hp', hpf || 1, 0.707);
  const draw = j => {
    const r = rng(hash('ir', j ? base + ':' + j : base)), taps = [];
    for (let m = 0; m * Td < len; m++) {
      const p = Math.floor(m * Td + r() * (Td - 1)), sgn = r() < 0.5 ? -1 : 1;
      if (p >= predelay * SR && p < len) taps.push([p, sgn * Math.exp(-6.91 * p / SR / t60)]);
    }
    const H = F.map(f => { const w = 2 * Math.PI * f / SR; let re = 0, im = 0; for (const [p, v] of taps) { re += v * Math.cos(w * p); im -= v * Math.sin(w * p); } return [re, im]; });
    const k = db2a(wetDb) / Math.sqrt(H.reduce((s, [x, y]) => s + x * x + y * y, 0) / H.length);
    const d = F.map((f, i) => {   // 10 log10 |1 + k Hhp(f) H(f)|^2
      const w = 2 * Math.PI * f / SR, c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
      const nr = b0 + b1 * c1 + b2 * c2, ni = -b1 * s1 - b2 * s2, dr = 1 + a1 * c1 + a2 * c2, di = -a1 * s1 - a2 * s2, dd = dr * dr + di * di;
      const hr = hpf ? (nr * dr + ni * di) / dd : 1, hi2 = hpf ? (ni * dr - nr * di) / dd : 0, [xr, xi] = H[i];
      const yr = 1 + k * (hr * xr - hi2 * xi), yi = k * (hr * xi + hi2 * xr); return 10 * Math.log10(yr * yr + yi * yi);
    });
    const n = d.length, h = ((Math.floor(n / 6) | 1) - 1) / 2, D = (2 * h + 1) * (4 * h * h + 4 * h - 3), res = [];
    for (let i = h; i < n - h; i++) { let s = 0; for (let j2 = -h; j2 <= h; j2++) s += (3 * (3 * h * h + 3 * h - 1) - 15 * j2 * j2) / D * d[i + j2]; res.push(d[i] - s); }
    const mu = res.reduce((a, b) => a + b, 0) / res.length, rip = Math.sqrt(res.reduce((a, b) => a + (b - mu) ** 2, 0) / res.length);
    return { taps, k, rip, miss: ripple ? Math.max(0, ripple[0] - rip, rip - ripple[1]) : 0 };
  };
  let ir = draw(0), j = 0;
  while (ir.miss > 0 && ++j < tries) { const c = draw(j); if (c.miss < ir.miss) ir = c; }
  const { taps, k } = ir;
  const conv = x => { const y = new Float64Array(N); for (const [p, w0] of taps) { const w = w0 * k; for (let i = 0, j = p; j < N; i++, j++) y[j] += w * x[i]; } return hpf ? bq(Float32Array.from(y), 'hp', hpf, 0.707) : Float32Array.from(y); };
  let same = true; for (let i = 0; i < N; i++) if (L[i] !== Rr[i]) { same = false; break; }
  const wl = conv(L), wr = same ? wl : conv(Rr);
  for (let i = 0; i < N; i++) { L[i] += wl[i]; Rr[i] += wr[i]; }
  return { taps: taps.length, ripple: ir.rip, draw: j };
}

// ITU-R BS.1770-4 integrated loudness (K-weighting, 400-ms blocks, 75 % overlap, -70 LUFS and -10 LU gates)
export function loudness(a = L, b = Rr) {
  // K-weighting exactly as libebur128 / ffmpeg ebur128 derive it (their shelf is not the RBJ shelf, and their RLB
  // high-pass has b = [1, -2, 1]); the RBJ version read 0.08 LU lower than ffmpeg
  const bi = (x, b0, b1, b2, a1, a2) => { const o = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const xi = x[i], y = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = xi; y2 = y1; y1 = y; o[i] = y; } return o; };
  const K1 = Math.tan(Math.PI * 1681.974450955533 / SR), Q1 = 0.7071752369554196, Vh = Math.pow(10, 3.999843853973347 / 20), Vb = Math.pow(Vh, 0.4996667741545416), a0 = 1 + K1 / Q1 + K1 * K1;
  const K2 = Math.tan(Math.PI * 38.13547087602444 / SR), Q2 = 0.5003270373238773, a2d = 1 + K2 / Q2 + K2 * K2;
  const kw = x => bi(bi(x, (Vh + Vb * K1 / Q1 + K1 * K1) / a0, 2 * (K1 * K1 - Vh) / a0, (Vh - Vb * K1 / Q1 + K1 * K1) / a0, 2 * (K1 * K1 - 1) / a0, (1 - K1 / Q1 + K1 * K1) / a0),
    1, -2, 1, 2 * (K2 * K2 - 1) / a2d, (1 - K2 / Q2 + K2 * K2) / a2d);
  const ka = kw(a), kb = b ? kw(b) : null, cs = new Float64Array(a.length + 1);
  for (let i = 0; i < a.length; i++) cs[i + 1] = cs[i] + ka[i] * ka[i] + (kb ? kb[i] * kb[i] : 0);
  const blk = Math.round(0.4 * SR), hop = Math.round(0.1 * SR), pw = [];
  for (let s = 0; s + blk <= a.length; s += hop) pw.push((cs[s + blk] - cs[s]) / blk);
  const LK = p => -0.691 + 10 * Math.log10(p), mean = v => v.reduce((x, y) => x + y, 0) / v.length;
  const g1 = pw.filter(p => p > 0 && LK(p) > -70); if (!g1.length) return -Infinity;
  const rel = LK(mean(g1)) - 10, g2 = g1.filter(p => LK(p) > rel);
  return LK(mean(g2));
}
// 4x-oversampled true peak (windowed-sinc interpolation), dBTP: a report; the check is ffmpeg -af ebur128=peak=true
export function truePeak(a = L, b = Rr) {
  const H = 12, P = 4, taps = [];
  for (let ph = 0; ph < P; ph++) { const row = []; for (let k = -H; k < H; k++) { const x = k + ph / P, w = 0.5 + 0.5 * Math.cos(Math.PI * x / H); row.push(x === 0 ? 1 : w * Math.sin(Math.PI * x) / (Math.PI * x)); } taps.push(row); }
  let pk = 0;
  for (const x of [a, b]) for (let i = H; i < x.length - H; i++) { const m = Math.abs(x[i]); if (m > pk) pk = m; if (m < pk * 0.5) continue;
    for (let ph = 1; ph < P; ph++) { let s = 0; const row = taps[ph]; for (let k = -H; k < H; k++) s += row[k + H] * x[i - k]; const v = Math.abs(s); if (v > pk) pk = v; } }
  return 20 * Math.log10(pk + 1e-12);
}
// masterNature(o): the master for nature films (replaces the template's tanh(1.3x) + peak normalisation, which would
// lift a surf bed to -14.8 LUFS / -1.0 dBTP). Fitted recipe: linear-amplitude fade-in fadeIn0 -> 1 over fadeIn s;
// soft clip ceiling*tanh(x/ceiling) (recorded surf peaks 10.6 dB over its local RMS, Gaussian noise 12-13 dB);
// K-weighted gated loudness normalised to `lufs` (-18.5 as fitted; -20 suits a quiet ambience); a linear fade-out of
// fadeOut s ending at `end` (the last frame). o.peakGuard (design, for tracks with rare loud events such as thunder):
// cap the gain so the pre-clip peak stays under this value.
// o.dcHz (5): one-pole DC blocker after the clip (0 = off).
export function masterNature(o = {}) {
  const { lufs = -18.5, ceiling = 0.9, fadeIn = 1.69, fadeIn0 = 0.042, fadeOut = 1.35, end = T.end, peakGuard = 0, dcHz = 5 } = o;
  const E = Math.round(end * SR), e = Math.min(N, E), f0 = Math.round((end - fadeOut) * SR), fi = fadeIn * SR;
  for (let i = 0; i < N; i++) {
    let g = 1;
    if (fadeIn > 0 && i < fi) g = fadeIn0 + (1 - fadeIn0) * i / fi;
    if (fadeOut > 0 && i >= f0) g *= Math.max(0, (E - i) / (E - f0));   // reaches 0 at `end`
    if (i >= e) g = 0;
    L[i] *= g; Rr[i] *= g;
  }
  const x0 = L.slice(), x1 = Rr.slice(); let pk = 0; for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(x0[i]), Math.abs(x1[i]));
  let g = db2a(lufs - loudness(x0, x1)), capped = false;
  if (peakGuard && g * pk > peakGuard) { g = peakGuard / pk; capped = true; }
  let I = 0;
  // the soft clip squeezes the larger half of an asymmetric wave (gull harmonics, thunder N-waves, the surf's own
  // level-proportional asymmetry) more than the other: a one-pole DC blocker at dcHz follows it
  const dcb = x => { if (!dcHz) return x; const k = 1 - Math.exp(-2 * Math.PI * dcHz / SR); let m = 0; for (let i = 0; i < x.length; i++) { m += k * (x[i] - m); x[i] -= m; } return x; };
  for (let it = 0; it < 5; it++) {
    for (let i = 0; i < N; i++) { L[i] = ceiling * Math.tanh(g * x0[i] / ceiling); Rr[i] = ceiling * Math.tanh(g * x1[i] / ceiling); }
    dcb(L); dcb(Rr);
    I = loudness(); if (capped || Math.abs(I - lufs) < 0.003) break;
    g *= db2a(lufs - I);
    if (peakGuard && g * pk > peakGuard) { g = peakGuard / pk; capped = true; }
  }
  // flush float32 subnormals (|x| < 1e-30): the DC blocker's and the room's decays fill silences between calls with them
  // (93k samples in 12 s of birds); inaudible and zero in a 16-bit WAV, but slow on CPUs without flush-to-zero
  for (let i = 0; i < N; i++) { if (Math.abs(L[i]) < 1e-30) L[i] = 0; if (Math.abs(Rr[i]) < 1e-30) Rr[i] = 0; }
  return { lufs: I, gainDb: 20 * Math.log10(g), capped };
}

// followNoise(spec, fn, o): follow() for filtered noise. fn(c, t) -> {a} (or {db}) and {pan} from the curve values
// c = at(t); both smoothed by a one-pole of o.tau (20-30 ms) so the frame steps do not zipper. o.band calibrates the
// noise by band power first; o.from/o.to in seconds. This is how a layer breathes with a picture curve (foam, gust).
export function followNoise(spec, fn, o = {}) {
  const { tau = 0.03, from = 0, to = T.end, band = null, kr = 32 } = o, i0 = Math.max(0, Math.round(from * SR)), i1 = Math.min(N, Math.round(to * SR)), n = i1 - i0;
  if (n <= 0) return;
  const s = band ? noiseLayer(n, spec, band, hash('n', seedFor(o, 'followNoise'))) : chain(gauss(n + SR, hash('n', seedFor(o, 'followNoise'))), spec).slice(SR);
  const k = 1 - Math.exp(-1 / (tau * SR)); let a = 0, p = 0, ta = 0, tp = 0;
  for (let i = 0; i < n; i++) {
    if (i % kr === 0) { const t = (i0 + i) / SR, v = fn(C?.frames?.length ? at(t) : {}, t) || {}; ta = v.db !== undefined ? db2a(v.db) : (v.a ?? 0); tp = v.pan ?? 0; }
    a += (ta - a) * k; p += (tp - p) * k;
    const x = s[i] * a, ang = (p + 1) * Math.PI / 4; L[i0 + i] += x * Math.cos(ang); Rr[i0 + i] += x * Math.sin(ang);
  }
}

/* ====================================================================================================== */
/* 4. DESIGNED blocks: built from the published acoustics written above each one, tuned on spectrograms   */
/* ====================================================================================================== */

// wind(t0, dur, o): air moving.
// Facts: wind noise energy sits mostly at 10-500 Hz and reaches higher as the speed grows (upper edge ~0.5 / 2 / 4 /
// 6 kHz at ~2 / 4 / 6 / 8 m/s, JASA Express Lett. 1, 063602). Aerodynamic sound power grows steeply with speed (~U^6),
// so gusts are much louder than lulls. Aeolian tones (a whistle past a twig, needle or wire) have f = St*U/d with
// St ~ 0.2 (U 5-10 m/s past 1-3 mm -> ~0.3-2 kHz). Gusts rise in ~1 s and die away over 2-3 s.
// Design: gauss -> band-pass centre f*(1 + 0.4 g) (Q q) -> one-pole lp at lp*(0.5 + 1.5 g); amplitude 10^(level/20) * (0.35 + 0.65 g^1.5)
// / 0.35 (level = dBFS RMS of the body at gust 0); a slow turbulence wander (0.25 Hz, 2 dB); two decorrelated bodies
// for width. o.gust: number or fn(t) -> 0..1 (see gusts(), or at(t).gust from the page). o.whistle: {f: 1000, q: 50,
// db: -12, pan: 0.3} a narrow noise-excited resonance (an aeolian tone), pitch +-15 % with g, fading in above g 0.35.
// Tuned on a spectrogram: Q 12 at -18 dB and Q 30 were both lost in the body near 1 kHz; Q 50 at -12 dB stands ~10 dB
// over it.
export function wind(t0, dur, o = {}) {
  const P = { level: -40, f: 300, q: 0.6, lp: 1200, gust: 0.3, tau: 0.05, width: 0.6, pan: 0, turb: [0.25, 2.0], whistle: null, ...o };
  const n = Math.round(dur * SR), base = seedFor(o, 'wind'), gf = fnOf(P.gust), g = new Float32Array(n), kg = 1 - Math.exp(-1 / (Math.max(1e-3, P.tau) * SR));
  // the gust curve through a one-pole of tau s: a stepped curve (a user fn, a frame-rate toggle) would gate the noise
  for (let i = 0, z = clamp(gf(t0)); i < n; i++) { z += kg * (clamp(gf(t0 + i / SR)) - z); g[i] = z; }
  // the top of the spectrum climbs with the gust: lp at P.lp (0.5 + 1.5 g), 0.5x in a calm, 2x at full gust
  const lpg = (x, fOf) => { const o2 = new Float32Array(x.length); let y = 0; for (let i = 0; i < x.length; i++) { y += (1 - Math.exp(-2 * Math.PI * fOf(i) / SR)) * (x[i] - y); o2[i] = y; } return o2; };
  const body = seed => lpg(svfBP(gauss(n, seed), i => P.f * (1 + 0.4 * g[i]), P.q), i => P.lp * (0.5 + 1.5 * g[i]));
  const cal = rmsOf(lp(svfBP(gauss(2 * SR, hash('cal', base)), () => P.f, P.q), P.lp * 0.5), SR / 2);
  const turb = wander(n, P.turb[0], P.turb[1], hash('turb', base)), a = body(hash('a', base)), b = body(hash('b', base));
  const c = Math.cos(P.width * Math.PI / 4), s = Math.sin(P.width * Math.PI / 4), lv = db2a(P.level) / cal / 0.35;
  const l = new Float32Array(n), r = new Float32Array(n);
  for (let i = 0; i < n; i++) { const amp = lv * (0.35 + 0.65 * Math.pow(g[i], 1.5)) * turb[i]; l[i] = (c * a[i] + s * b[i]) * amp; r[i] = (c * a[i] - s * b[i]) * amp; }
  addDiffuse(t0, l, r);
  if (P.whistle) {
    const W = { f: 1000, q: 50, db: -12, pan: 0.3, ...P.whistle }, wob = wander(n, 0.5, 1.0, hash('wob', base));
    const x = svfBP(gauss(n, hash('wh', base)), i => W.f * (1 + 0.15 * (2 * g[i] - 1)) * Math.pow(wob[i], 0.1), W.q);
    const wc = rmsOf(svfBP(gauss(2 * SR, hash('whc', base)), () => W.f, W.q), SR / 2), wl = db2a(P.level + W.db) / wc / 0.35;
    for (let i = 0; i < n; i++) x[i] *= wl * (0.35 + 0.65 * Math.pow(g[i], 1.5)) * smooth((g[i] - 0.35) / 0.45) * turb[i];
    add(t0, x, W.pan);
  }
}

// rustle(t0, dur, o): grass and leaves as a grain cloud.
// Facts: rustle is made of many short broadband contacts (leaf on leaf, blade on blade), a few ms each, concentrated
// in the kHz range; broad leaves rustle louder than needles; the contact rate and loudness grow with wind speed, so
// rustle follows the gusts (JASA Express Lett. 1, 063602: the wind spectrum's upper edge climbs with speed).
// Design: Poisson grains at rate(t) (default 30 + 250 g(t)^2 per s); each grain gauss noise of 4-15 ms, attack 0.5 ms,
// exponential decay tau ~ decay, band-passed at a log-uniform centre in `band` (Q 1.2-3); grain energy log-normal
// (sigma 4 dB). level = dBFS RMS of the cloud at 100 grains/s (power grows linearly with the rate).
// o.pan: where the foliage sits on screen (a tree at x 0.9 -> +0.6), o.spread: +- around it.
export function rustle(t0, dur, o = {}) {
  const P = { rate: null, gust: 0.3, band: [2500, 7000], grain: [0.004, 0.015], decay: 0.006, level: -46, pan: 0.6, spread: 0.35, q: [1.2, 3], ...o };
  const n = Math.round(dur * SR), base = seedFor(o, 'rustle'), r = rng(hash('ev', base)), gf = fnOf(P.gust);
  const rate = P.rate ? fnOf(P.rate) : t => 30 + 250 * Math.pow(clamp(gf(t)), 2);
  let rmax = 1; for (let t = t0; t < t0 + dur; t += 0.01) rmax = Math.max(rmax, rate(t));
  const E = Math.pow(10, P.level / 10) * SR / 100;           // energy per grain -> mean square 10^(level/10) at 100/s
  for (let t = t0 - Math.log(1 - r()) / rmax; t < t0 + dur; t -= Math.log(1 - r()) / rmax) {
    if (r() * rmax > rate(t)) continue;
    const len = Math.round(U(r, P.grain[0], P.grain[1]) * SR), tail = Math.round(0.003 * SR), x = gauss(len + tail, (r() * 4294967296) >>> 0), tau = P.decay * U(r, 0.6, 1.6);
    for (let i = 0; i < x.length; i++) { let e = Math.exp(-i / SR / tau); if (i < 22) e *= i / 22; if (i >= len) e *= Math.max(0, 1 - (i - len) / tail); x[i] *= e; }
    const y = bq(x, 'bp', LU(r, P.band[0], P.band[1]), U(r, P.q[0], P.q[1])), en = y.reduce((s, v) => s + v * v, 0) + 1e-20;
    add(t, y, clamp(P.pan + P.spread * (2 * r() - 1), -1, 1), Math.sqrt(E / en) * db2a(4 * gaussOne(r)));
  }
}
function gaussOne(r) { return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()); }

// sine voice with a per-sample frequency and amplitude curve, plus a 2nd harmonic
function voice(n, fOf, aOf, h2 = 0) { const o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { ph += fOf(i) / SR; ph -= Math.floor(ph); const p = 2 * Math.PI * ph; o[i] = aOf(i) * (Math.sin(p) + h2 * Math.sin(2 * p)); } return o; }
const bell = (u, a = 0.15, d = 0.35) => u < 0 || u > 1 ? 0 : u < a ? Math.sin(0.5 * Math.PI * u / a) ** 2 : u > 1 - d ? Math.sin(0.5 * Math.PI * (1 - u) / d) ** 2 : 1;

// birds(t0, dur, o): songbird phrases.
// Facts: passerine song sits mostly at 2-8 kHz; a European robin song lasts ~2.3 s on average with its energy near
// 4 kHz, ~5 syllables/s and ~200 ms between syllable starts; songs are pure-ish tones (weak harmonics) with fast
// frequency modulation: sweeps, arches and trills (a trill repeats one short syllable 10-20 times/s, and fast trills
// are narrower: the trill-rate/bandwidth trade-off). Singers pause several seconds between songs; neighbours
// alternate. Distance removes the top end first.
// Design: a phrase every 3-8 s, 3-7 notes of 40-120 ms with 50-150 ms gaps, each a sine chirp gliding up or down by
// 20-90 % (or an arch or a dip; the whole sweep inside o.f), a longer near-flat whistle or a buzz, vibrato 20-40 Hz at
// +-3 %, 2nd harmonic -20 dB; each singer has a register and a repertoire of 5 syllables it repeats; 30 % of phrases
// end in a trill; o.voices singers alternate. level = dBFS RMS at a note's peak.
export function birds(t0, dur, o = {}) {
  const P = { phrase: [3, 8], notes: [3, 7], note: [0.04, 0.12], gap: [0.05, 0.15], f: [2500, 6000], glide: [0.2, 0.9], vib: [20, 40, 0.03], h2: -20, level: -40, lp: 7000, voices: 2, pan: [-0.7, 0.7], trill: 0.3, first: [0.3, 2.0], ...o };
  const n = Math.round(dur * SR), base = seedFor(o, 'birds'), r = rng(hash('ev', base)), h2 = db2a(P.h2), A = db2a(P.level) * Math.SQRT2 / Math.sqrt(1 + h2 * h2);
  // syllable kinds: sweeps (fast down-sweeps are the commonest song element), arches, dips, a near-flat whistle (2-2.5x
  // longer) and a buzz (fast FM at 80-150 Hz, +-5-10 %: a harsh, rattly element)
  const syl = (fc) => { const kind = ['down', 'down', 'up', 'arch', 'dip', 'whistle', 'buzz'][IR(r, 0, 6)], gl = U(r, P.glide[0], P.glide[1]), w = kind === 'whistle';
    const hi = kind === 'down' ? 1 : kind === 'whistle' ? 1 + 0.1 * gl : kind === 'buzz' ? Math.sqrt(1 + 0.5 * gl) : 1 + gl, lo = kind === 'down' ? 1 / (1 + gl) : kind === 'buzz' ? 1 / Math.sqrt(1 + 0.5 * gl) : 1;
    return { kind, f0: clamp(fc * LU(r, 0.8, 1.25), P.f[0] / lo, Math.max(P.f[0] / lo, P.f[1] / hi)), gl, dur: U(r, P.note[0], P.note[1]) * (w ? U(r, 2, 2.5) : 1),
      vr: kind === 'buzz' ? U(r, 80, 150) : U(r, P.vib[0], P.vib[1]), vd: kind === 'buzz' ? U(r, 0.05, 0.1) : P.vib[2] * U(r, 0.3, 1) * (w ? 0.3 : 1) }; };
  const V = []; for (let v = 0; v < P.voices; v++) { const fc = LU(r, P.f[0] * 1.15, P.f[1] / 1.25); V.push({ fc, pan: U(r, P.pan[0], P.pan[1]), g: db2a(-5 * r()), rep: [0, 1, 2, 3, 4].map(() => syl(fc)), bus: new Float32Array(n) }); }
  const fAt = (s, u) => s.kind === 'up' ? s.f0 * Math.pow(1 + s.gl, u) : s.kind === 'down' ? s.f0 * Math.pow(1 + s.gl, -u) : s.kind === 'arch' ? s.f0 * (1 + s.gl * Math.sin(Math.PI * u))
    : s.kind === 'dip' ? s.f0 * (1 + s.gl * (1 - Math.sin(Math.PI * u))) : s.kind === 'whistle' ? s.f0 * (1 + 0.1 * s.gl * u) : s.f0 * Math.pow(1 + 0.5 * s.gl, 0.5 - u);
  const note = (vo, s, ts, d) => { const m = Math.round(d * SR), s0 = Math.round((ts - t0) * SR); if (s0 < 0 || s0 + m >= n) return;
    const y = voice(m, i => fAt(s, i / m) * (1 + s.vd * Math.sin(2 * Math.PI * s.vr * i / SR)), i => A * vo.g * bell(i / m, 0.15, 0.35), h2);
    for (let i = 0; i < m; i++) vo.bus[s0 + i] += y[i]; };
  let t = t0 + U(r, P.first[0], P.first[1]), who = IR(r, 0, P.voices - 1);
  while (t < t0 + dur - 0.5) {
    const vo = V[who], k = IR(r, P.notes[0], P.notes[1]); let tc = t, prev = -1;
    for (let j = 0; j < k; j++) { const idx = prev >= 0 && r() < 0.35 ? prev : IR(r, 0, 4), s = vo.rep[idx]; prev = idx; note(vo, s, tc, s.dur); tc += s.dur + U(r, P.gap[0], P.gap[1]); }
    if (r() < P.trill) { const s = { kind: 'down', f0: vo.fc * LU(r, 0.9, 1.3), gl: U(r, 0.15, 0.3), vr: 30, vd: 0 }, rate = U(r, 12, 20), d = U(r, 0.025, 0.04), m = IR(r, 4, 9); for (let j = 0; j < m; j++) note(vo, s, tc + j / rate, d); }
    t += U(r, P.phrase[0], P.phrase[1]); if (P.voices > 1 && r() < 0.7) who = (who + 1 + IR(r, 0, P.voices - 2)) % P.voices;
  }
  for (const vo of V) add(t0, P.lp ? bq(vo.bus, 'lp', P.lp, 0.707) : vo.bus, vo.pan);
}

// gulls(t0, dur, o): "kee-ow" calls over an open sea.
// Facts: gull calls are harsh harmonic sounds; the fundamental carries little of the energy and the strongest
// partials are H2-H5 (herring gull; the high-pitched "kyow" has poorly defined formants, the low "kek" clear ones);
// a long call is a series of 8-14 elements, the slow terminal series about 2 notes/s; each "kee-ow" note rises
// fast and falls slowly.
// Design: 2-5 notes of 0.25-0.45 s, pitch contour 0.7 fp -> fp (at 25 %) -> 0.62 fp with fp 800-1400 Hz
// (e.g. 900 -> 1300 -> 800 Hz); a saw-like harmonic source (1/k) up to 7 kHz; two formant band-passes (1.8 kHz Q 3,
// 3.2 kHz Q 4) plus 30 % dry; rough AM at 60-90 Hz, depth 0.3, and a random flutter (o.rough) for harshness; a call
// every 6-15 s; lp 5 kHz for distance.
// level = dBFS RMS at a note's peak. Use at most one call per 6 s, and only where the picture shows open sea.
export function gulls(t0, dur, o = {}) {
  const P = { every: [6, 15], notes: [2, 5], note: [0.25, 0.45], gap: [0.12, 0.3], f0: [800, 1400], formants: [[1800, 3], [3200, 4]], am: [60, 90, 0.3], rough: 0.6, level: -38, lp: 5000, pan: [-0.8, 0.8], first: [0.5, 3], ...o };
  const n = Math.round(dur * SR), base = seedFor(o, 'gulls'), r = rng(hash('ev', base));
  for (let t = t0 + U(r, P.first[0], P.first[1]); t < t0 + dur - 1; t += U(r, P.every[0], P.every[1])) {
    const k = IR(r, P.notes[0], P.notes[1]), fp0 = U(r, P.f0[0], P.f0[1]), pan = U(r, P.pan[0], P.pan[1]); let tc = t;
    for (let j = 0; j < k && tc < t0 + dur - 0.5; j++) {
      const d = U(r, P.note[0], P.note[1]), m = Math.round(d * SR), fp = fp0 * U(r, 0.92, 1.08), amf = U(r, P.am[0], P.am[1]), jit = gauss(m, (r() * 4294967296) >>> 0);
      const fOf = u => u < 0.25 ? fp * (0.7 + 0.3 * smooth(u / 0.25)) : fp * (1 - 0.38 * smooth((u - 0.25) / 0.75));
      const src = new Float32Array(m + Math.round(0.03 * SR)), rough = gauss(m, (r() * 4294967296) >>> 0); let ph = 0, jj = 0, rn = 0;   // 30 ms of zeros: room for the filters' tails
      for (let i = 0; i < m; i++) {
        const u = i / m; jj += 0.02 * (jit[i] - jj); const f = fOf(u) * (1 + 0.01 * jj); ph += f / SR; ph -= Math.floor(ph);
        // partials up to 7 kHz, faded out over 7-8 kHz: a hard cut switched partials on and off as the pitch moved (clicks)
        let s = 0; for (let h = 1; h <= 12 && h * f < 8000; h++) s += Math.sin(2 * Math.PI * h * ph) / h * (h * f < 7000 ? 1 : smooth((8000 - h * f) / 1000));
        rn += 0.12 * (rough[i] - rn);   // harshness: random amplitude flutter (~1 kHz wide) spreads noise between the partials
        src[i] = s * bell(u, 0.08, 0.3) * (1 - P.am[2] * (0.5 + 0.5 * Math.sin(2 * Math.PI * amf * i / SR))) * (1 + P.rough * rn);
      }
      let y = new Float32Array(src.length); for (const [ff, q] of P.formants) { const b = bq(src, 'bp', ff, q); for (let i = 0; i < y.length; i++) y[i] += b[i]; }
      for (let i = 0; i < y.length; i++) y[i] += 0.3 * src[i];
      if (P.lp) y = bq(y, 'lp', P.lp, 0.707);
      y = bq(y, 'hp', 150, 0.707);                    // nothing below the fundamental (and no DC from the harmonic sum)
      let pk = 0; const w = Math.round(0.05 * SR); for (let i = 0; i + w < m; i += w) pk = Math.max(pk, rmsOf(y, i, i + w));
      add(tc, y, pan, db2a(P.level) / (pk + 1e-12));
      tc += d + U(r, P.gap[0], P.gap[1]);
    }
  }
}

// insects(t0, dur, o): o.kind 'crickets' (default) or 'cicadas'.
// Crickets. Facts: a field cricket's calling song is a near-pure tone at ~4.5 kHz (the harp resonance; Gryllus
// bimaculatus females respond best to 4.5 kHz), made of pulses (syllables) of ~15-20 ms at a pulse period of
// 34-42 ms, grouped into chirps of 3-5 pulses, 2-4 chirps/s; the rate follows temperature (Dolbear's law for the snowy
// tree cricket: chirps per minute = 7 (T_C - 10) + 40). Design: per individual a carrier 4.2-5.0 kHz falling ~3 % inside
// each pulse, 2nd harmonic -25 dB, 3-4 pulses of 15 ms at a 36-ms period, 2-3 chirps/s (o.tempC sets it by Dolbear),
// 3 individuals at different distances (0 / -4 / -8 dB) and pans. level = dBFS RMS inside a pulse.
// Cicadas. Facts: the tymbal buckles in pulses at 120-600 per second; peak frequencies range from ~1.3 kHz
// (Magicicada septendecim) to ~4-6.5 kHz (Cyclochila australasiae 3.2-4.4 kHz inward, 6.5 kHz outward pulses); a song
// swells and fades over seconds (calling songs of 15-20 s in Quesada gigas). Design: a 4-8 kHz noise band (4th-order
// edges, +8 dB resonance at 5.5 kHz, Q 2.5) under a pulse AM at 150-250 Hz shaped like a tymbal click (5 % onset, then
// an exponential ring of 20 % of the period; the symmetric (0.5 + 0.5 cos)^3 bump read as a hiss), swells of 2-6 s (rise 40 %,
// fall 60 %) with 0.5-3 s gaps, 2 individuals. level = dBFS band power at the top of a swell.
export function insects(t0, dur, o = {}) {
  const kind = o.kind || 'crickets', n = Math.round(dur * SR), base = seedFor(o, 'insects.' + kind), r = rng(hash('ev', base));
  if (kind === 'crickets') {
    const P = { count: 3, carrier: [4200, 5000], pulse: 0.015, period: 0.036, pulses: [3, 4], rate: [2, 3], tempC: null, level: -42, spread: [-0.8, 0.8], h2: -25, ...o };
    for (let c = 0; c < P.count; c++) {
      const fc = U(r, P.carrier[0], P.carrier[1]), rate = P.tempC != null ? (7 * (P.tempC - 10) + 40) / 60 * U(r, 0.93, 1.07) : U(r, P.rate[0], P.rate[1]);
      const np = IR(r, P.pulses[0], P.pulses[1]), A = db2a(P.level - 4 * c) * Math.SQRT2, h2 = db2a(P.h2), m = Math.round(P.pulse * SR), bufc = new Float32Array(n);
      for (let t = U(r, 0, 1 / rate); t < dur - 0.2; t += (1 / rate) * U(r, 0.94, 1.06)) {
        for (let p = 0; p < np; p++) { const s0 = Math.round((t + p * P.period * U(r, 0.97, 1.03)) * SR); if (s0 + m >= n) break;
          const y = voice(m, i => fc * (1 - 0.03 * i / m), i => A * bell(i / m, 0.15, 0.55) * (p === np - 1 ? 0.8 : 1), h2); for (let i = 0; i < m; i++) bufc[s0 + i] += y[i]; }
      }
      add(t0, bufc, U(r, P.spread[0], P.spread[1]));
    }
  } else {
    const P = { count: 2, band: [4000, 8000], peak: 5500, am: [150, 250], swell: [2, 6], gapS: [0.5, 3], level: -40, spread: [-0.7, 0.7], ...o };
    for (let c = 0; c < P.count; c++) {
      const x = noiseLayer(n, [['hp', P.band[0]], ['hp', P.band[0]], ['lp', P.band[1]], ['lp', P.band[1]], ['peak', P.peak, 2.5, 8]], P.band, hash('n' + c, base));
      const env = new Float32Array(n), amr = U(r, P.am[0], P.am[1]), drift = wander(n, 0.3, 1, hash('d' + c, base));
      for (let t = U(r, 0, 2); t < dur; ) { const d = U(r, P.swell[0], P.swell[1]), s0 = Math.round(t * SR), m = Math.round(d * SR), lv = db2a(-6 * r());
        for (let i = 0; i < m && s0 + i < n; i++) { const u = i / m; env[s0 + i] = Math.max(env[s0 + i], lv * (u < 0.4 ? smooth(u / 0.4) : 1 - smooth((u - 0.4) / 0.6))); }
        t += d + U(r, P.gapS[0], P.gapS[1]); }
      const amOf = ph => 0.1 + 0.9 * (ph < 0.05 ? ph / 0.05 : Math.exp(-(ph - 0.05) / 0.2));; let ms = 0; for (let k = 0; k < 1000; k++) ms += amOf(k / 1000) ** 2;   // a tymbal click: fast onset, ringing decay
      let ph = 0; const g = db2a(P.level - 3 * c) / Math.sqrt(ms / 1000);   // band power at the top of a swell = level
      for (let i = 0; i < n; i++) { ph += amr * Math.pow(drift[i], 0.3) / SR; ph -= Math.floor(ph); x[i] *= g * env[i] * amOf(ph); }
      add(t0, x, U(r, P.spread[0], P.spread[1]));
    }
  }
}

// one gas bubble in water (Minnaert; rising-pitch model after van den Doel 2005): radius a (m) -> f0 = 3.26 / a Hz
// (Minnaert at 1 atm: 3.26 kHz at 1 mm); damping d = 0.13/a + 0.0072 a^-1.5 per s; the pitch rises as the bubble nears
// the surface, f(t) = f0 (1 + xi d t); p(t) = amp sin(2 pi int f) e^(-d t); 0.3-ms onset
function bubble(a, xi, amp) {
  const f0 = 3.26 / a, d = 0.13 / a + 0.0072 * Math.pow(a, -1.5), m = Math.round(Math.min(5 / d, 0.35) * SR), o = new Float32Array(m), on = 0.0003 * SR; let ph = 0;
  for (let i = 0; i < m; i++) { const t = i / SR; ph += f0 * (1 + xi * d * t) / SR; ph -= Math.floor(ph); o[i] = amp * Math.sin(2 * Math.PI * ph) * Math.exp(-d * t) * (i < on ? Math.sin(0.5 * Math.PI * i / on) ** 2 : 1); }
  return o;
}

// rain(t0, dur, o): a bed of fine drops plus individual drop transients on leaves, ground and puddles.
// Facts: rain rate R: light < 2.5 mm/h, moderate 2.5-7.6, heavy > 7.6. Drop sizes follow Marshall-Palmer,
// N(D) = 8000 e^(-Lambda D) m^-3 mm^-1 with Lambda = 4.1 R^-0.21 mm^-1 (mean diameter ~0.34 mm at 5 mm/h, big drops rarer
// in light rain); terminal speed v = 9.65 - 10.3 e^(-0.6 D) m/s (Atlas 1973). An impact is a broadband click of a few
// ms (0-20 kHz for 2.5 mm drops, 0-30 kHz for 3.9 mm); on water small drops (0.8-1.1 mm) ring a ~15 kHz bubble
// and large drops (> 2.2 mm) a 2-10 kHz bubble, mostly < 2 ms. The many far drops merge into a crackling hiss.
// Design: o.intensity 0..1 maps to R = 0.5 * 50^intensity mm/h (0.25 -> 1.3 light, 0.85 -> 14 heavy; o.mmh overrides;
// both may be fn(t)). Bed: Poisson impulses at 100 + 7000 (R/25)^1.1 per s with exponential amplitudes -> hp 500,
// +3 dB at 3.5 kHz, lp 10 kHz; band power (500-10k) = level + 10 log10(R/5) (power ~ drop flux ~ R); two independent
// clouds for L/R (light rain ~370 impulses/s: a crackle; heavy ~3800/s: a hiss). Near drops: 3 + 250 R/25 per s (light
// ~16/s, heavy ~140/s), D from Marshall-Palmer (0.5-5 mm), peak amplitude ~ D^1.5 v
// (the square root of kinetic energy); surfaces: leaf 55 % (click + a 1.5-5 kHz band ring of 2-6 ms), ground 30 %
// (low thud, lp 1.2-2.5 kHz, 3-8 ms), water 15 % (click + Minnaert bubble 12-16 kHz for D < 1.1 mm, 2-10 kHz above).
export function rain(t0, dur, o = {}) {
  const P = { intensity: 0.5, mmh: null, level: -44, dropsDb: 0, leaf: 0.55, ground: 0.3, water: 0.15, spread: 0.9, ...o };
  const n = Math.round(dur * SR), base = seedFor(o, 'rain'), r = rng(hash('ev', base));
  const Rf = P.mmh != null ? fnOf(P.mmh) : (it => t => 0.5 * Math.pow(50, clamp(it(t))))(fnOf(P.intensity));
  const vT = D => 9.65 - 10.3 * Math.exp(-0.6 * D), v2 = vT(2);
  // bed: two impulse clouds
  const cloud = seed => { const q = rng(seed), x = new Float32Array(n); let rmax = 0; for (let t = 0; t < dur; t += 0.05) rmax = Math.max(rmax, 100 + 7000 * Math.pow(Rf(t0 + t) / 25, 1.1));
    for (let t = -Math.log(1 - q()) / rmax; t < dur; t -= Math.log(1 - q()) / rmax) { const R = Rf(t0 + t); if (q() * rmax > 100 + 7000 * Math.pow(R / 25, 1.1)) continue; const i = Math.floor(t * SR); x[i] += (q() < 0.5 ? -1 : 1) * -Math.log(1 - q()); }
    return x; };
  const bedOf = seed => { const y = chain(cloud(seed), [['hp', 500, 0.707], ['peak', 3500, 0.8, 3], ['lp', 10000, 0.707]]); bandNorm(y, 500, 10000); return y; };
  const bl = bedOf(hash('bedL', base)), br = bedOf(hash('bedR', base)), gb = new Float32Array(n);
  let sm = Rf(t0); const ks = 1 - Math.exp(-1 / (0.2 * SR));   // bed level follows R through a 0.2-s smoother
  for (let i = 0; i < n; i++) { sm += ks * (Rf(t0 + i / SR) - sm); gb[i] = db2a(P.level + 10 * Math.log10(Math.max(1e-3, sm) / 5)); }
  for (let i = 0; i < n; i++) { bl[i] *= gb[i]; br[i] *= gb[i]; }
  addDiffuse(t0, bl, br);
  // near drops
  const A0 = db2a(P.level + P.dropsDb + 12); let rmax = 1; for (let t = 0; t < dur; t += 0.05) rmax = Math.max(rmax, 3 + 250 * Rf(t0 + t) / 25);
  for (let t = -Math.log(1 - r()) / rmax; t < dur; t -= Math.log(1 - r()) / rmax) {
    const R = Rf(t0 + t); if (r() * rmax > 3 + 250 * R / 25) continue;
    const Lam = 4.1 * Math.pow(R, -0.21); let D = 0; for (let k = 0; k < 20 && (D < 0.5 || D > 5); k++) D = -Math.log(1 - r()) / Lam; D = clamp(D, 0.5, 5);
    const amp = A0 * Math.pow(D / 2, 1.5) * vT(D) / v2, pan = P.spread * (2 * r() - 1), u = r(), sd = (r() * 4294967296) >>> 0;
    let y;
    if (u < P.leaf) { const m = Math.round(U(r, 0.002, 0.006) * SR), x = gauss(m + 64, sd); for (let i = 0; i < x.length; i++) x[i] *= Math.exp(-i / (m / 3)) * (i < 8 ? i / 8 : 1); y = bq(bq(x, 'bp', LU(r, 1500, 5000), U(r, 1.2, 3)), 'hp', 300); y = y.map((v, i) => v + 0.25 * x[i] * (i < 30 ? 1 : 0)); }
    else if (u < P.leaf + P.ground) { const m = Math.round(U(r, 0.003, 0.008) * SR), x = gauss(m + 64, sd); for (let i = 0; i < x.length; i++) x[i] *= Math.exp(-i / (m / 3)) * (i < 10 ? i / 10 : 1); y = bq(bq(x, 'lp', LU(r, 1200, 2500), 0.8), 'hp', 80); }
    else { const x = gauss(40, sd); for (let i = 0; i < 40; i++) x[i] *= Math.exp(-i / 8); const bf = D < 1.1 ? U(r, 12000, 16000) : D > 2.2 ? clamp(10000 * 2.2 / D, 2000, 10000) : U(r, 6000, 12000), b = bubble(3.26 / bf, U(r, 0.1, 0.3), 1.5);
      y = new Float32Array(b.length + 40); for (let i = 0; i < 40; i++) y[i] += x[i] * 0.6; for (let i = 0; i < b.length; i++) y[i + 20] += b[i]; y = bq(y, 'hp', 300); }
    let pk = 0; for (const v of y) pk = Math.max(pk, Math.abs(v)); add(t0 + t, y, pan, amp / (pk + 1e-12));
  }
}

// brook(t0, dur, o): a bubbling stream: many short resonant bubble chirps rising in pitch over a noise bed.
// Facts: the sound of running water is mostly the ringing of newly formed air bubbles (Minnaert 1933; van den Doel
// 2005): a bubble of radius a rings at f0 ~ 3.26/a Hz (a 1 mm -> 3.3 kHz, 5 mm -> 650 Hz) as a damped sinusoid whose
// pitch rises while it rises toward the surface; smaller bubbles ring higher and die faster; bubble sizes follow a
// power law p(a) ~ a^-beta (beta ~ 10/3 above the Hinze scale), many small, few large; the pitch rise xi is ~0.1.
// Design: bubbles at `rate`/s (default 120) modulated by a slow burst process (0.3-1.7x, 1.5 Hz) and o.flow (number or
// fn(t)); radii 1-9 mm with beta 10/3 (f0 360 Hz-3.3 kHz); xi 0.07-0.15; amplitude ~ (a / 9 mm)^alpha, alpha 0.5
// (design: bigger bubbles louder, but not owning the band); pans spread by `width`. Bed: turbulence noise, hp 120 -> lp 2500 ->
// +3 dB at 600 Hz, band power (150-3000) = bedLevel, wander 0.7 Hz / 2 dB, diffuse. level = dBFS RMS of the bubble layer
// at 100 bubbles/s (it scales with the rate).
export function brook(t0, dur, o = {}) {
  const P = { rate: 120, flow: 1, radius: [0.001, 0.009], beta: 10 / 3, alpha: 0.5, xi: [0.07, 0.15], level: -42, bedLevel: -50, pan: 0, width: 0.7, ...o };
  const n = Math.round(dur * SR), base = seedFor(o, 'brook'), r = rng(hash('ev', base)), fl = fnOf(P.flow), burst = wander(n, 1.5, 4, hash('burst', base));
  const rateAt = t => P.rate * clamp(fl(t0 + t), 0, 4) * clamp(0.3 + 0.7 * Math.pow(burst[Math.min(n - 1, Math.floor(t * SR))], 1.2), 0.3, 1.7);
  let rmax = 1; for (let t = 0; t < dur; t += 0.01) rmax = Math.max(rmax, rateAt(t));
  const b = bus(n), [a0, a1] = P.radius, e1 = 1 - P.beta; let count = 0;
  for (let t = -Math.log(1 - r()) / rmax; t < dur - 0.05; t -= Math.log(1 - r()) / rmax) {
    if (r() * rmax > rateAt(t)) continue;
    const a = Math.pow(Math.pow(a0, e1) + r() * (Math.pow(a1, e1) - Math.pow(a0, e1)), 1 / e1);
    b.add(Math.round(t * SR), bubble(a, U(r, P.xi[0], P.xi[1]), Math.pow(a / a1, P.alpha) * db2a(3 * gaussOne(r))), clamp(P.pan + P.width * (2 * r() - 1), -1, 1)); count++;
  }
  b.l.set(bq(b.l, 'hp', 150, 0.707)); b.r.set(bq(b.r, 'hp', 150, 0.707));   // a damped sine from phase 0 has a DC mean: 1000s add up
  const meanRate = count / dur; b.mix(t0, db2a(P.level) / Math.sqrt(b.power() + 1e-20) * Math.sqrt(meanRate / 100));
  const bedOf = s => { const x = noiseLayer(n, [['hp', 120, 0.707], ['lp', 2500, 0.707], ['peak', 600, 0.7, 3]], [150, 3000], s), w = wander(n, 0.7, 2, s ^ 0x5bd1e995); for (let i = 0; i < n; i++) x[i] *= db2a(P.bedLevel) * w[i]; return x; };
  addDiffuse(t0, bedOf(hash('bedL', base)), bedOf(hash('bedR', base)));
}

// thunder(t0, o): a distant roll with an optional crack.
// Facts: the sound arrives 2.9 s/km after the flash (c ~ 343 m/s). Each short, tortuous segment of the channel sends
// an N-wave; their spread in distance makes the roll (rumble up to 30+ s). Peals are ~40-100 Hz, rumbles ~25-80 Hz
// (Few's relaxation-radius model); the air absorbs high frequencies with distance, so a near strike starts with a
// sharp broadband clap and a distant one is a low rumble with no clap. Design: a random-walk channel from a cloud base
// 3-5 km high down to the ground at `distance` km (M = 400 segments); arrival times from the listener distances;
// N-waves of 12-25 ms (lengthening with distance), amplitude ~ 1/r times a random segment orientation factor |sin|;
// low-pass by each segment's own path length (fc = 1.5 kHz * (1 km/r)^1.1, two poles, in 6 distance bins); a low
// rumble tail (noise, lp 120 Hz, following the smoothed arrival density) and 4 terrain echoes (0.3-1.8 s, -8..-16 dB).
// crack (default distance < 1.5 km): the first arrival as a sharp N-wave plus 0.25 s of dense broadband crackle.
// level = dBFS RMS of the loudest 0.5 s. Returns {start, end} of the roll.
export function thunder(t0, o = {}) {
  const P = { distance: 4, level: -26, pan: 0, crack: null, M: 400, ...o };
  const base = seedFor(o, 'thunder'), r = rng(hash('ev', base)), c = 343, d = P.distance * 1000, h = U(r, 3000, 5000), crack = P.crack ?? P.distance < 1.5;
  // channel: random walk from (x0, y0, h) to (d, 0, 0)
  const pts = [], px = d + U(r, -800, 800), py = U(r, -800, 800);
  for (let i = 0; i <= P.M; i++) { const u = i / P.M; pts.push([lerp(px, d, u) + 150 * gaussOne(r), lerp(py, 0, u) + 150 * gaussOne(r), Math.max(0, lerp(h, 0, u) + 100 * gaussOne(r) * (1 - u))]); }
  const seg = []; let rmin = Infinity, rmaxd = 0;
  for (let i = 0; i < P.M; i++) { const [ax, ay, az] = pts[i], [bx, by, bz] = pts[i + 1], mx = (ax + bx) / 2, my = (ay + by) / 2, mz = (az + bz) / 2, rr = Math.hypot(mx, my, mz), sx = bx - ax, sy = by - ay, sz = bz - az, sl = Math.hypot(sx, sy, sz) + 1e-9;
    const sinth = Math.sqrt(Math.max(0, 1 - ((sx * mx + sy * my + sz * mz) / (sl * rr)) ** 2)); seg.push({ rr, w: (0.2 + sinth) * db2a(4 * gaussOne(r)) / rr }); rmin = Math.min(rmin, rr); rmaxd = Math.max(rmaxd, rr); }
  // the N-waves go into K bins by path length, each low-passed for its own distance (fc = 1.5 kHz * (1 km/r)^1.1, two
  // poles): one fc for the whole channel kept the far segments as bright as the near ones, so the late roll was a rain
  // of broadband clicks up to 10 kHz; air absorbs more over the longer paths, so the roll darkens as it goes on
  const roll = (rmaxd - rmin) / c, len = roll + 6, n = Math.round(len * SR), K = 6, xs = Array.from({ length: K }, () => new Float32Array(n)), dens = new Float32Array(n);
  for (const s of seg) { const at0 = (s.rr - rmin) / c + 0.05, Tn = 0.012 * Math.pow(s.rr / 1000, 0.25) * U(r, 0.9, 1.6), m = Math.round(Tn * SR), i0 = Math.round(at0 * SR), x0 = xs[Math.min(K - 1, Math.floor(K * (s.rr - rmin) / (rmaxd - rmin + 1e-9)))];
    for (let i = 0; i < m && i0 + i < n; i++) x0[i0 + i] += s.w * (1 - 2 * i / m); if (i0 < n) dens[i0] += s.w; }
  const y = new Float32Array(n);
  for (let k = 0; k < K; k++) { const fc = 1500 * Math.pow(1000 / Math.max(300, rmin + (k + 0.5) / K * (rmaxd - rmin)), 1.1), z = lp(lp(xs[k], fc), fc); for (let i = 0; i < n; i++) y[i] += z[i]; }
  // rumble tail following the smoothed arrival density, and terrain echoes
  const dz = lp(lp(dens, 1.2), 1.2), dzm = dz.reduce((m, v) => Math.max(m, v), 0) + 1e-20, yr = rmsOf(y) + 1e-20;
  // per channel: its own rumble tail (noise, lp 120 Hz, following the arrival density) and its own terrain echoes
  const side = ch => { const tail = lp(lp(gauss(n, hash('tail' + ch, base)), 120), 120), tr = rmsOf(tail) + 1e-20, o = y.slice();
    for (let i = 0; i < n; i++) o[i] += 0.8 * yr / tr * tail[i] * Math.sqrt(dz[i] / dzm);
    const ye = o.slice(); for (let k = 0; k < 4; k++) { const dl = Math.round(U(r, 0.3, 1.8) * SR), g = db2a(-U(r, 8, 16)); for (let i = 0; i + dl < n; i++) ye[i + dl] += g * o[i]; }
    return ye; };
  const yl = side('L'), yR = side('R');
  if (crack) { const m = Math.round(0.004 * SR), i0 = Math.round(0.05 * SR), cr = gauss(Math.round(0.3 * SR), hash('crack', base)), A = 6 * yr, crh = bq(cr, 'hp', 400, 0.707);
    for (const o of [yl, yR]) for (let i = 0; i < m; i++) o[i0 + i] += A * (1 - 2 * i / m);
    for (let i = 0; i < crh.length; i++) { const e = Math.exp(-i / SR / 0.07) * (r() < 0.25 ? 1 : 0.15); yl[i0 + i] += 1.5 * yr * crh[i] * e; yR[i0 + i] += 1.5 * yr * crh[(i + 331) % crh.length] * e; } }
  const L2 = bq(bq(yl, 'hp', 18, 0.54), 'hp', 18, 1.31), R2 = bq(bq(yR, 'hp', 18, 0.54), 'hp', 18, 1.31);   // 4th-order Butterworth
  // calibrate: loudest 0.5-s RMS (mid of the two channels) -> level
  let pk = 0; const w = Math.round(0.5 * SR), mid = L2.map((v, i) => 0.5 * (v + R2[i]));
  for (let i = 0; i + w < n; i += Math.round(0.1 * SR)) pk = Math.max(pk, rmsOf(mid, i, i + w));
  const g = db2a(P.level) / (pk + 1e-20);
  addDiffuse(t0, L2.map(v => v * g), R2.map(v => v * g));
  return { start: t0 + 0.05, end: t0 + roll + 3 };
}

// paperTouch(t, o): a soft paper swell for a new bloom of paint (style 15, Pencil and wash; styles 13 and 14 keep the
// drawing silent). Facts: friction of a brush or pencil on paper is broadband noise whose band follows the tooth of the paper
// (mostly ~1-5 kHz for soft strokes) with a rough, grainy amplitude. Design: noise band-passed 1.3-5 kHz (4th-order
// edges), roughened by a 40-Hz random grain (+-40 %), a sin^2 swell 40 % up, 60 % down. level = band power at the top
// of the swell; keep it at least 12 dB under the bed.
export function paperTouch(t, o = {}) {
  const P = { band: [1300, 5000], dur: 0.25, level: -48, pan: 0, ...o }, base = seedFor(o, 'paperTouch'), m = Math.round(P.dur * SR);
  const x = noiseLayer(m, [['hp', P.band[0]], ['hp', P.band[0]], ['lp', P.band[1]], ['lp', P.band[1]]], P.band, hash('n', base)), gr = lp(lp(gauss(m, hash('g', base)), 40), 40), gs = rmsOf(gr) + 1e-12;
  for (let i = 0; i < m; i++) { const u = i / m, e = u < 0.4 ? Math.sin(0.5 * Math.PI * u / 0.4) ** 2 : Math.sin(0.5 * Math.PI * (1 - u) / 0.6) ** 2; x[i] *= db2a(P.level) * e * clamp(1 + 0.4 * gr[i] / gs, 0.2, 2); }
  add(t, x, P.pan);
}

// lapping(t0, dur, o): small waves on still water slapping against a jetty post, a moored hull or a stony bank.
// Facts: lapping is a train of short, soft impacts as wavelets of a few cm hit a hard edge: a low-mid "slap"
// (air pocket collapsing, energy mostly 150-1500 Hz, 20-60 ms attack-to-peak, 100-300 ms decay), often followed by a
// gurgle of a few medium bubbles (radius 3-8 mm -> Minnaert 400-1100 Hz, rising) and a faint bright trickle (1.5-6
// kHz, < 100 ms) as the water runs back; wind-driven chop on a small lake arrives at ~0.5-1.5 s per wavelet, bunched
// in sets, so the events are irregular (1-2.5 per s) with calmer gaps. Design: events at `rate` per s (number or
// fn(t)) modulated by a 0.25-Hz set process; each event a slap (gauss noise, bp at a log-uniform 250-900 Hz, Q 0.9,
// attack 10-35 ms, exponential decay 70-220 ms), 0-3 bubbles 20-120 ms after it (bubble(), radius 3-8 mm), and a
// trickle (hp 1500 lp 6000 noise, 40-90 ms, -14 dB); pans around o.pan by +- o.spread. level = dBFS RMS of the
// layer at 1.5 events/s.
export function lapping(t0, dur, o = {}) {
  const P = { rate: 1.5, level: -38, pan: 0.3, spread: 0.3, slap: [250, 900], ...o };
  const n = Math.round(dur * SR), base = seedFor(o, 'lapping'), r = rng(hash('ev', base)), rf = fnOf(P.rate), sets = wander(n, 0.25, 4, hash('sets', base));
  const rateAt = t => Math.max(0, rf(t0 + t)) * clamp(Math.pow(sets[Math.min(n - 1, Math.floor(t * SR))], 1.5), 0.25, 2.2);
  let rmax = 0.1; for (let t = 0; t < dur; t += 0.02) rmax = Math.max(rmax, rateAt(t));
  const b = bus(n); let count = 0;
  for (let t = -Math.log(1 - r()) / rmax; t < dur - 0.4; t -= Math.log(1 - r()) / rmax) {
    if (r() * rmax > rateAt(t)) continue; count++;
    const pan = clamp(P.pan + P.spread * (2 * r() - 1), -1, 1), s0 = Math.round(t * SR), g = db2a(4 * gaussOne(r));
    const att = U(r, 0.010, 0.035), dec = U(r, 0.07, 0.22), m = Math.round((att + 5 * dec) * SR), x = gauss(m, (r() * 4294967296) >>> 0);
    for (let i = 0; i < m; i++) { const tt = i / SR; x[i] *= tt < att ? Math.sin(0.5 * Math.PI * tt / att) ** 2 : Math.exp(-(tt - att) / dec); }
    const slap = bq(bq(x, 'bp', LU(r, P.slap[0], P.slap[1]), 0.9), 'lp', 2200, 0.707);
    b.add(s0, slap, pan, g);
    for (let k = 0, nb = IR(r, 0, 3); k < nb; k++) b.add(s0 + Math.round(U(r, 0.02, 0.12) * SR), bubble(U(r, 0.003, 0.008), U(r, 0.1, 0.3), 0.35), pan, g * U(r, 0.3, 0.8));
    const tm = Math.round(U(r, 0.04, 0.09) * SR), tr = gauss(tm, (r() * 4294967296) >>> 0); for (let i = 0; i < tm; i++) tr[i] *= Math.sin(Math.PI * i / tm) ** 2;
    b.add(s0 + Math.round(att * SR), chain(tr, [['hp', 1500, 0.707], ['lp', 6000, 0.707]]), pan, g * db2a(-14));
  }
  b.l.set(bq(b.l, 'hp', 60, 0.707)); b.r.set(bq(b.r, 'hp', 60, 0.707));
  const meanRate = Math.max(0.1, count / dur); b.mix(t0, db2a(P.level) / Math.sqrt(b.power() + 1e-20) * Math.sqrt(meanRate / 1.5));
}
