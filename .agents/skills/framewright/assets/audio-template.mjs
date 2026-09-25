#!/usr/bin/env node
// Procedural soundtrack template. Everything is synthesized in place: no samples, no libraries.
//   node scripts/export-curves.mjs curves.json   (plate starts, and in world films per-frame curves, from index.html)
//   node audio.mjs track.wav
// How to use:
//   1. Plate starts come from curves.json (scripts/make.sh and `npm run audio` refresh it first). Without it, copy
//      the starts from `node scripts/look.mjs info` into the fallback table T below.
//   2. Write one block of events per plate (see the demo block and references/audio.md). In a world film let the
//      line or the character have a voice that follows the picture: follow() below, references/audio.md section 7.
//   3. Render, look at the waveform:  ffmpeg -i track.wav -filter_complex "showwavespic=s=1800x300:split_channels=1" -frames:v 1 shots/wave.png
// Nature ambience (sea, wind, leaves, birds, rain) for painting and landscape films starts from assets/audio-nature.mjs
// instead, a template built on the block module assets/nature.mjs (references/audio.md section 8).
import fs from 'node:fs';

const SR = 44100, OUT = process.argv[2] || 'track.wav';
// the film's curves: {fps, bpm, total, start: {plate: frame}, frames: [{f, sp, pan, z}, ...], cues: [{name, f}, ...]}
// (frames in world and painting films; cues are the moments the page marks: CUES in the plate and painting skeletons,
// W.cues in a world film)
const C = fs.existsSync('curves.json') ? JSON.parse(fs.readFileSync('curves.json', 'utf8')) : null;
if (C && fs.existsSync('index.html') && fs.statSync('curves.json').mtimeMs < fs.statSync('index.html').mtimeMs)
  console.warn('curves.json is older than index.html: run node scripts/export-curves.mjs curves.json');
const BPM = C?.bpm ?? 120, BEAT = 60 / BPM, BAR = BEAT * 4;
// plate starts in seconds, plus end. From curves.json when it exists; otherwise mirror look.mjs info by hand.
const T = C ? { ...Object.fromEntries(Object.entries(C.start).map(([k, f]) => [k, f / C.fps])), end: C.total / C.fps }
            : { title: 0, end: 4 };
// a moment the picture marks, in seconds, on the frame the picture shows it. A hit that belongs to the groove
// takes T.plate + beats * BEAT instead: on an eighth at 120 BPM (7.5 frames) the two differ by 17 ms.
const cue = name => { const c = C?.cues?.find(c => c.name === name);
  if (!c) throw new Error(C?.cues ? `no cue ${name} in curves.json (cues: ${C.cues.map(c => c.name).join(', ') || 'none'})` : `no cue ${name}: export the curves`);
  return c.f / C.fps; };

const N = Math.round(T.end * SR), L = new Float32Array(N), Rr = new Float32Array(N);
let seed = 20260101; const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; const g2 = () => rnd() * 2 - 1;
const midi = m => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, span = (x, a, b) => clamp((x - a) / (b - a));

/* ---------- building blocks ---------- */
// mix a buffer into the master at time t0 with constant-power pan (-1..1)
function add(t0, arr, pan = 0, gain = 1) {
  const s0 = Math.round(t0 * SR), gl = Math.cos((pan + 1) * Math.PI / 4) * gain, gr = Math.sin((pan + 1) * Math.PI / 4) * gain;
  for (let i = 0; i < arr.length; i++) { const k = s0 + i; if (k < 0 || k >= N) continue; L[k] += arr[i] * gl; Rr[k] += arr[i] * gr; }
}
function lp(arr, fc) { const a = 1 - Math.exp(-2 * Math.PI * fc / SR); let y = 0; const o = new Float32Array(arr.length); for (let i = 0; i < arr.length; i++) { y += a * (arr[i] - y); o[i] = y; } return o; }
function hp(arr, fc) { const l = lp(arr, fc); const o = new Float32Array(arr.length); for (let i = 0; i < arr.length; i++) o[i] = arr[i] - l[i]; return o; }
// envelope: linear attack, hold, linear release; optional exponential decay
function shape(arr, { att = 0.005, rel = 0.02, decay = 0, hold = 1 } = {}) {
  const n = arr.length, o = new Float32Array(n), A = att * SR, Rl = rel * SR;
  for (let i = 0; i < n; i++) { let e = hold; if (i < A) e *= i / A; if (i > n - Rl) e *= (n - i) / Rl; if (decay > 0) e *= Math.exp(-i / SR / decay); o[i] = arr[i] * e; }
  return o;
}
// oscillator with exponential glide f0 -> f1, optional vibrato and noise
function osc(dur, f0, { f1 = f0, wave = 'sine', amp = 0.2, vib = 0, vibHz = 5, noiseAmt = 0 } = {}) {
  const n = Math.round(dur * SR), o = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n, f = f0 * Math.pow(f1 / f0, t) * (1 + vib * Math.sin(2 * Math.PI * vibHz * i / SR)); ph += f / SR; const x = ph % 1;
    const v = wave === 'sine' ? Math.sin(2 * Math.PI * x) : wave === 'saw' ? 2 * x - 1 : wave === 'square' ? (x < 0.5 ? 1 : -1) : 1 - 4 * Math.abs(x - 0.5);
    o[i] = v * amp + (noiseAmt ? g2() * noiseAmt : 0);
  }
  return o;
}
function noise(dur, { amp = 0.2, lpf = 0, hpf = 0 } = {}) { const n = Math.round(dur * SR); let o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = g2() * amp; if (lpf) o = lp(o, lpf); if (hpf) o = hp(o, hpf); return o; }
function mul(arr, fn) { const o = new Float32Array(arr.length); for (let i = 0; i < arr.length; i++) o[i] = arr[i] * fn(i / SR); return o; }

/* ---------- sound that follows the picture (needs per-frame curves from a world film) ---------- */
// the curve values at time t (seconds), linear between frames: {f, sp, pan, z, ...}
function at(t) {
  const F = C.frames, x = clamp(t * C.fps, 0, F.length - 1), i = Math.max(0, Math.min(F.length - 2, Math.floor(x))), q = x - i, a = F[i], b = F[i + 1] ?? a, o = {};
  for (const key in a) o[key] = a[key] + (b[key] - a[key]) * q;
  return o;
}
// a voice driven sample by sample: fn(c, t) -> {f, a, pan} from the curve values c at time t.
// Amplitude and pan are smoothed (tau seconds) so the 33 ms frame steps do not zipper.
// wave 'tone': sine plus 0.28 of the second harmonic (a line being drawn);
// wave 'buzz': two saws a hair apart (1 : 2.003) through two one-pole low-passes at `cut` Hz (a wing, a motor).
function follow(fn, { wave = 'tone', tau = 0.025, cut = 1100, from = 0, to = T.end } = {}) {
  const k = 1 - Math.exp(-1 / (tau * SR)), kc = 1 - Math.exp(-2 * Math.PI * cut / SR);
  let ph = 0, ph2 = 0, a = 0, p = 0, y1 = 0, y2 = 0;
  for (let i = Math.round(from * SR); i < Math.min(N, Math.round(to * SR)); i++) {
    const t = i / SR, v = fn(at(t), t) || {};
    a += ((v.a ?? 0) - a) * k; p += ((v.pan ?? 0) - p) * k;
    const f = v.f ?? 220; ph = (ph + f / SR) % 1; ph2 = (ph2 + f * 2.003 / SR) % 1;
    let s;
    if (wave === 'buzz') { const x = (2 * ph - 1) + 0.35 * (2 * ph2 - 1); y1 += (x - y1) * kc; y2 += (y1 - y2) * kc; s = y2; }
    else s = Math.sin(2 * Math.PI * ph) + 0.28 * Math.sin(4 * Math.PI * ph);
    L[i] += s * a * Math.cos((p + 1) * Math.PI / 4); Rr[i] += s * a * Math.sin((p + 1) * Math.PI / 4);
  }
}

/* ---------- instruments ---------- */
const kick = (t, amp = 0.55) => { add(t, shape(osc(0.32, 150, { f1: 42, amp }), { att: 0.001, decay: 0.11, rel: 0.01 })); add(t, shape(noise(0.02, { amp: 0.25, lpf: 4000 }), { att: 0.0005, decay: 0.006 })); };
const hat = (t, amp = 0.10, open = false) => add(t, shape(noise(open ? 0.25 : 0.06, { amp, hpf: 7000 }), { att: 0.001, decay: open ? 0.09 : 0.02 }), 0.25);
const rim = (t, amp = 0.22) => { add(t, shape(noise(0.08, { amp: amp * 0.8, hpf: 1500, lpf: 6000 }), { att: 0.001, decay: 0.03 }), -0.2); add(t, shape(osc(0.06, 420, { f1: 380, amp: amp * 0.5 }), { att: 0.001, decay: 0.02 }), -0.2); };
const click = (t, amp = 0.3) => add(t, shape(noise(0.006, { amp }), { att: 0.0003, decay: 0.002 }));
const beep = (t, f, dur, amp = 0.22, wave = 'sine') => add(t, shape(osc(dur, f, { amp, wave }), { att: 0.004, rel: 0.03 }));
// detuned saw pad through a low-pass; notes are MIDI numbers
const chord = (t, notes, dur, amp = 0.08, wave = 'saw', cut = 1800, det = 0.004) => { for (const m of notes) for (const d of [-det, det]) add(t, shape(lp(osc(dur, midi(m) * (1 + d), { amp, wave }), cut), { att: Math.min(0.6, dur * 0.3), rel: Math.min(0.8, dur * 0.4) }), d > 0 ? 0.35 : -0.35); };
// "data" chirp: a burst of short square tones, good for text appearing
const chirp = (t, amp = 0.10) => { let tt = t; for (let i = 0; i < 12; i++) { add(tt, shape(osc(0.022, 1200 + rnd() * 1400, { amp, wave: 'square' }), { att: 0.002, rel: 0.004 })); tt += 0.026; } };
// riser: filtered noise swelling into the next cut
const riser = (t, dur = 1.0, amp = 0.14) => add(t, mul(shape(noise(dur, { amp, hpf: 600 }), { att: dur * 0.3, rel: 0.02 }), x => (x / dur) * (x / dur)));

/* ---------- events, one block per plate ---------- */
// demo for either skeleton: a click, a soft pad, a tick on every beat, a short riser into the end
click(0, 0.5);
chord(0.1, [57, 64, 69, 76], T.end - 0.4, 0.05, 'saw', 1400);
for (let t = 0; t < T.end - 0.5; t += BEAT) beep(t, 1760, 0.03, 0.08);
riser(T.end - 1.0, 1.0, 0.10);
// world films: the line has a voice. It swells with the head's speed on screen, rises a little in pitch and follows the head left and right.
if (C?.frames?.length) follow(c => ({ f: midi(69) * (1 + 0.04 * clamp(c.sp / 25)), a: 0.05 * Math.pow(clamp(c.sp / 25), 0.8), pan: c.pan * 0.8 }));
// every touch-down of the pen after a lift (pen.lift: tallies, crosses, checks) gets a tap, exactly on its frame
for (const f of C?.strokes ?? []) click(f / C.fps, 0.14);
// placeholder: a bell on every cue the page marks. Once the cues have their own sounds, rim(cue('splash')), delete this loop
for (const c of C?.cues ?? []) beep(c.f / C.fps, 1320, 0.25, 0.12);

/* ---------- master: soft limiter, normalize to -1 dBFS, 16-bit stereo WAV ---------- */
let peak = 0; for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * 1.3); Rr[i] = Math.tanh(Rr[i] * 1.3); peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rr[i])); }
const norm = peak > 0 ? 0.89 / peak : 1, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * norm * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Rr[i] * norm * 32767), 46 + i * 4); }
fs.writeFileSync(OUT, buf);
console.log(`${OUT}: ${T.end} s${C ? ' (timeline from curves.json)' : ''}, peak before normalization ${peak.toFixed(2)}`);
