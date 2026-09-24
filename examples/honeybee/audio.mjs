#!/usr/bin/env node
// Звук фильма «Одна линия». Всё синтезируется здесь: ни сэмплов, ни библиотек.
//   node export-curves.mjs curves.json   (покадровые кривые из index.html)
//   node audio.mjs track.wav
// Ре мажор, 90 BPM. Жужжание пчелы и тон линии следуют кривым скорости и панорамы из фильма.
import fs from 'node:fs';

const SR = 44100, OUT = process.argv[2] || 'track.wav';
const C = JSON.parse(fs.readFileSync('curves.json', 'utf8'));
const FPS = C.fps, BEAT = 60 / C.bpm, BAR = BEAT * 4, END = C.total / FPS;
const S = {}; for (const k in C.start) S[k] = C.start[k] / FPS;          // начала сцен в секундах
const fr = f => f / FPS, bar = n => n * BAR;
const N = Math.round(END * SR), L = new Float32Array(N), Rr = new Float32Array(N);
let seed = 20260924; const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; const g2 = () => rnd() * 2 - 1;
const midi = m => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, span = (x, a, b) => clamp((x - a) / (b - a));

/* ---------- кирпичики ---------- */
function add(t0, arr, pan = 0, gain = 1) { const s0 = Math.round(t0 * SR), gl = Math.cos((pan + 1) * Math.PI / 4) * gain, gr = Math.sin((pan + 1) * Math.PI / 4) * gain;
  for (let i = 0; i < arr.length; i++) { const k = s0 + i; if (k < 0 || k >= N) continue; L[k] += arr[i] * gl; Rr[k] += arr[i] * gr; } }
function lp(arr, fc) { const a = 1 - Math.exp(-2 * Math.PI * fc / SR); let y = 0; const o = new Float32Array(arr.length); for (let i = 0; i < arr.length; i++) { y += a * (arr[i] - y); o[i] = y; } return o; }
function hp(arr, fc) { const l = lp(arr, fc); const o = new Float32Array(arr.length); for (let i = 0; i < arr.length; i++) o[i] = arr[i] - l[i]; return o; }
function shape(arr, { att = 0.005, rel = 0.02, decay = 0, hold = 1 } = {}) { const n = arr.length, o = new Float32Array(n), A = att * SR, Rl = rel * SR;
  for (let i = 0; i < n; i++) { let e = hold; if (i < A) e *= i / A; if (i > n - Rl) e *= (n - i) / Rl; if (decay > 0) e *= Math.exp(-i / SR / decay); o[i] = arr[i] * e; } return o; }
function osc(dur, f0, { f1 = f0, wave = 'sine', amp = 0.2, vib = 0, vibHz = 5, curve = 1 } = {}) { const n = Math.round(dur * SR), o = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / n, f = f0 * Math.pow(f1 / f0, Math.pow(t, curve)) * (1 + vib * Math.sin(2 * Math.PI * vibHz * i / SR)); ph += f / SR; const x = ph % 1;
    o[i] = (wave === 'sine' ? Math.sin(2 * Math.PI * x) : wave === 'saw' ? 2 * x - 1 : wave === 'square' ? (x < 0.5 ? 1 : -1) : 1 - 4 * Math.abs(x - 0.5)) * amp; } return o; }
function noise(dur, { amp = 0.2, lpf = 0, hpf = 0 } = {}) { const n = Math.round(dur * SR); let o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = g2() * amp; if (lpf) o = lp(o, lpf); if (hpf) o = hp(o, hpf); return o; }
function mul(arr, fn) { const o = new Float32Array(arr.length); for (let i = 0; i < arr.length; i++) o[i] = arr[i] * fn(i / SR); return o; }

/* ---------- инструменты ---------- */
function pluck(t, note, amp = 0.2, pan = 0, dur = 1.8, bright = 0.45, dec = 0.9965) { // Карплус-Стронг: тёплая струна
  const f = midi(note), P = Math.max(2, Math.round(SR / f)), buf = new Float32Array(P); let pv = 0;
  for (let i = 0; i < P; i++) { pv += (g2() - pv) * bright; buf[i] = pv; }
  const n = Math.round(dur * SR), o = new Float32Array(n); let idx = 0;
  for (let i = 0; i < n; i++) { const a = buf[idx], b = buf[(idx + 1) % P]; o[i] = a; buf[idx] = 0.5 * (a + b) * dec; idx = (idx + 1) % P; }
  add(t, shape(o, { att: 0.002, rel: 0.08 }), pan, amp); }
function bell(t, note, amp = 0.1, pan = 0, dur = 3.2) {
  const f0 = midi(note);
  for (const [r, a, d] of [[1, 1, 1], [2, 0.45, 0.7], [2.76, 0.32, 0.5], [5.4, 0.13, 0.3], [8.93, 0.05, 0.18]])
    add(t, shape(osc(dur, f0 * r, { amp: amp * a }), { att: 0.003, decay: dur * 0.34 * d, rel: 0.12 }), pan); }
function padChord(t0, t1, notes, amp, cut) {
  for (const m of notes) { for (const d of [-0.0035, 0.0035]) add(t0, shape(lp(lp(osc(t1 - t0 + 1.4, midi(m) * (1 + d), { amp, wave: 'saw' }), cut), cut * 1.3), { att: 0.8, rel: 1.3 }), d > 0 ? 0.32 : -0.32);
    add(t0, shape(osc(t1 - t0 + 1.4, midi(m), { amp: amp * 0.7 }), { att: 0.8, rel: 1.3 })); } }
const kick = (t, amp = 0.26) => add(t, shape(osc(0.28, 70, { f1: 42, amp }), { att: 0.002, decay: 0.09, rel: 0.02 }));
const shaker = (t, amp = 0.03, pan = 0.2) => add(t, shape(noise(0.07, { amp, hpf: 6000 }), { att: 0.004, decay: 0.022 }), pan);
const plip = (t, amp = 0.16, pan = 0) => add(t, shape(osc(0.09, 380, { f1: 1150, amp, curve: 0.5 }), { att: 0.001, decay: 0.03, rel: 0.01 }), pan);
const tock = (t, amp = 0.14, pan = 0) => { add(t, shape(osc(0.12, 540, { f1: 500, amp }), { att: 0.001, decay: 0.03 }), pan); add(t, shape(noise(0.02, { amp: amp * 0.7, lpf: 5000 }), { att: 0.0005, decay: 0.005 }), pan); };
const brush = (t, pan, amp = 0.05) => add(t, shape(noise(0.22, { amp, hpf: 1800, lpf: 5200 }), { att: 0.04, rel: 0.1 }), pan);
const thump = (t, amp = 0.2) => add(t, shape(osc(0.4, 62, { f1: 48, amp }), { att: 0.01, decay: 0.14, rel: 0.05 }));
function chirp(t, pan, amp = 0.028) { let tt = t; const n = 2 + Math.floor(rnd() * 4), base = 2600 + rnd() * 1400;
  for (let i = 0; i < n; i++) { const d = 0.05 + rnd() * 0.05; add(tt, shape(osc(d, base * (0.9 + rnd() * 0.3), { f1: base * (1.25 + rnd() * 0.4), amp, curve: 0.6 }), { att: 0.005, rel: 0.02 }), pan); tt += d + 0.03 + rnd() * 0.05; } }

/* ---------- 1. пэд: аккорд на такт ---------- */
const CH = { D: [50, 57, 62, 66], Dadd9: [50, 57, 64, 66], Bm7: [47, 54, 57, 62], G: [43, 55, 59, 62], Asus: [45, 57, 62, 64], A: [45, 57, 61, 64],
  GB: [47, 55, 59, 62], Bm: [47, 54, 59, 62], AC: [49, 57, 61, 64], Dmaj7: [50, 57, 61, 66] };
const prog = ['D', 'Dadd9', 'D', 'Bm7', 'G', 'Asus', 'D', 'GB', 'A', 'Bm', 'G', 'D', 'AC', 'Bm', 'G', 'A', 'Bm', 'G', null, 'Dmaj7', 'Dmaj7'];
prog.forEach((c, i) => { if (!c) return;
  const t0 = bar(i), inside = t0 < S.out || (t0 >= S.dance && t0 < S.last) || t0 >= S.drop;
  let cut = inside ? 700 : 1700; if (t0 >= S.last && t0 < S.drop) cut = 950;
  let amp = 0.016; if (i === 0) amp = 0.009; if (t0 >= S.last && t0 < S.drop) amp = 0.014; if (t0 >= S.drop) amp = 0.013;
  const t1 = (i === 17) ? S.drop - 0.4 : t0 + BAR;                      // пэд стихает ровно к остановке линии
  padChord(i === 0 ? 0.3 : t0, t1, c === 'Asus' && false ? CH.A : CH[c], amp, cut); });
padChord(bar(5) + BAR / 2, bar(6), CH.A, 0.012, 800);                  // разрешение sus4 в момент рождения

/* ---------- 2. линия и пчела по кривым фильма ---------- */
const F = C.frames, last = F[F.length - 1];
const birth = F.findIndex(x => x.bee === 1), death = fr(C.start.drop);
let ph1 = 0, ph2 = 0, ph3 = 0, aB = 0, aS = 0, aS2 = 0, pS = 0, y1 = 0, y2 = 0, jit = 0;
const waggle = [1150, 1178, 1206, 1234].map(f => [fr(f), fr(f + 14)]);
for (let i = 0; i < N; i++) {
  const t = i / SR, tf = t * FPS, f0 = Math.min(F.length - 1, Math.floor(tf)), q = tf - f0, c0 = F[f0], c1 = F[Math.min(F.length - 1, f0 + 1)] || last;
  const sp = lerp(c0.sp, c1.sp, q), sp2 = lerp(c0.sp2, c1.sp2, q), bee = lerp(c0.bee, c1.bee, q), pan = lerp(c0.pan, c1.pan, q);
  // тон линии до рождения и новая линия в финале
  const tS = (1 - bee) * (tf < birth ? 1 : 0) * Math.pow(clamp(sp / 22), 0.8) * 0.05;
  aS += (tS - aS) * 0.0012; aS2 += (Math.pow(clamp(sp2 / 22), 0.8) * 0.045 - aS2) * 0.0012;
  ph3 += 293.66 * (1 + 0.004 * Math.sin(2 * Math.PI * 4.6 * t)) / SR; ph3 -= Math.floor(ph3);
  const spark = (aS + aS2) * (Math.sin(2 * Math.PI * ph3) + 0.28 * Math.sin(4 * Math.PI * ph3));
  // жужжание: ~230 Гц, громче в полёте, панорама за пчелой, дрожит и стихает в последнем полёте
  const lastU = span(t, fr(1330), death);
  let tB = bee * (0.009 + 0.064 * Math.pow(clamp(sp / 34), 0.7)) * (1 - span(t, fr(1405), fr(1440)));
  let am = 1; for (const [w0, w1] of waggle) if (t >= w0 && t < w1) { tB *= 1.5; am = 0.55 + 0.45 * Math.sin(2 * Math.PI * 17 * t); }
  aB += (tB - aB) * 0.0009;
  jit += (g2() * 0.9 - jit) * 0.002;
  const fB = 226 * (1 + 0.012 * Math.sin(2 * Math.PI * 6.2 * t) + lastU * 0.05 * jit) * (1 - 0.13 * lastU) + clamp(sp / 34) * 14;
  ph1 += fB / SR; ph1 -= Math.floor(ph1); ph2 += fB * 2.003 / SR; ph2 -= Math.floor(ph2);
  let bz = (2 * ph1 - 1) + 0.35 * (2 * ph2 - 1); y1 += (bz - y1) * 0.16; y2 += (y1 - y2) * 0.16;   // два полюса ~1.3 кГц
  const buzz = y2 * aB * am;
  pS += (pan - pS) * 0.0008;
  const gl = Math.cos((pS * 0.8 + 1) * Math.PI / 4), gr = Math.sin((pS * 0.8 + 1) * Math.PI / 4);
  L[i] += buzz * gl + spark * 0.7071; Rr[i] += buzz * gr + spark * 0.7071;
}

/* ---------- 3. события по сценам ---------- */
// яйцо: два тихих удара сердца на дыхание точки, колокольчик, когда ячейка замыкается
thump(0.05, 0.12); thump(BEAT, 0.1); thump(2 * BEAT, 0.08);
bell(fr(120), 81, 0.06, -0.1, 4); bell(fr(122), 86, 0.03, 0.1, 3.5);
// личинка: четыре капли корма
[170, 210, 250, 290].forEach((f, i) => { plip(fr(f) - 0.05, 0.1, -0.3 + i * 0.2); pluck(fr(f), [74, 78, 81, 83][i], 0.1, -0.2 + i * 0.13, 2.2); });
// крышечка: девять проходов воска справа налево и обратно, рост куколки, трещина, рождение
for (let i = 0; i < 9; i++) brush(fr(328) + i * (fr(400) - fr(328)) / 9, i % 2 ? 0.45 : -0.45, 0.045);
add(fr(392), mul(shape(osc(1.6, 73.4, { amp: 0.06 }), { att: 1.0, rel: 0.3 }), t => 1), 0, 1);
for (let i = 0; i < 3; i++) add(fr(440) + i * 0.035, shape(noise(0.03, { amp: 0.18, hpf: 3000 }), { att: 0.0005, decay: 0.008 }), (i - 1) * 0.3);
bell(fr(441), 86, 0.07, -0.2, 4); bell(fr(443), 90, 0.05, 0.1, 4); bell(fr(445), 93, 0.04, 0.25, 4);
// соты: пульс, кормление, стройка, стража
for (let b = 6; b < 16; b++) { const t0 = bar(b), meadow = t0 >= S.meadow && t0 < S.dance;
  kick(t0, 0.22); kick(t0 + 2 * BEAT, 0.16);
  for (let k = 0; k < 4; k++) { if (b < 9 && k % 2 === 0) continue; shaker(t0 + k * BEAT + BEAT / 2, meadow ? 0.03 : 0.022, k % 2 ? 0.25 : -0.15); }
  if (meadow) for (let k = 0; k < 4; k++) shaker(t0 + k * BEAT, 0.012, 0.35); }
[499, 519, 539, 556].forEach((f, i) => pluck(fr(f), [69, 74, 78, 81][i], 0.12, 0.1 - i * 0.12, 2));
[589, 604, 619, 634].forEach((f, i) => { tock(fr(f), 0.1, -0.25 + i * 0.16); add(fr(f) + 0.05, shape(osc(0.7, 300, { f1: 620, amp: 0.02 }), { att: 0.15, rel: 0.3 }), 0); });
add(fr(646), shape(osc(fr(720) - fr(646), 73.4, { amp: 0.035, vib: 0.01, vibHz: 0.4 }), { att: 0.6, rel: 0.5 }));
// вылет: вдох воздуха, рассветные птицы
add(fr(716), mul(shape(noise(1.6, { amp: 0.09, lpf: 2400, hpf: 300 }), { att: 0.5, rel: 0.8 }), t => Math.sin(Math.PI * Math.min(1, t / 1.6))), 0.4);
for (const tt of [25.0, 25.8, 27.1, 28.4, 30.2, 31.9, 33.3, 35.0, 36.6]) chirp(tt + rnd() * 0.3, rnd() * 1.4 - 0.7, 0.022 + rnd() * 0.012);
// луг: каждый цветок распускается арпеджио, счётчик дней тикает
[922, 962, 1006, 1048, 1088].forEach((f, i) => { const base = [74, 76, 78, 81, 83][i];
  [0, 4, 7].forEach((st, j) => pluck(fr(f) - 0.1 + j * 0.09, base + [0, 3, 7][j], 0.09, -0.3 + j * 0.3, 2.4)); bell(fr(f), base + 12, 0.025, 0.2, 3); });
[894, 936, 978, 1020, 1060, 1084].forEach(f => tock(fr(f), 0.05, -0.6));
// последний полёт: ветер, высокая протяжная нота, всё стихает к остановке линии
add(fr(1300), mul(shape(noise(fr(1440) - fr(1300), { amp: 0.05, lpf: 600, hpf: 80 }), { att: 1.5, rel: 1.2 }), t => 0.6 + 0.4 * Math.sin(t * 1.3)), -0.2);
add(fr(1306), shape(osc(fr(1440) - fr(1306) - 0.3, midi(81), { f1: midi(79), amp: 0.022, vib: 0.006, vibHz: 5, curve: 2.5 }), { att: 1.2, rel: 1.4 }), 0.15);
// капля: падение, всплеск, колокол, снова дыхание и тон новой линии
const f0 = fr(1462), f1 = fr(1522);
add(f0, shape(osc(f1 - f0, 1500, { f1: 640, amp: 0.018, curve: 2.2 }), { att: 0.3, rel: 0.05 }), 0);
for (let i = 0; i < 7; i++) bell(f0 + (f1 - f0) * (1 - Math.pow(1 - i / 7, 0.5)), 93 - i * 2, 0.012, (i % 2 ? 0.3 : -0.3), 1.2);
plip(f1, 0.2, 0); thump(f1, 0.18);
bell(f1 + 0.02, 74, 0.07, -0.2, 5); bell(f1 + 0.04, 78, 0.05, 0.1, 5); bell(f1 + 0.06, 81, 0.045, 0.3, 5); bell(f1 + 0.5, 85, 0.035, 0, 5);
thump(fr(1580), 0.07); thump(fr(1600), 0.06);

/* ---------- 4. реверберация: гребенчатые фильтры + всепропускающие ---------- */
function reverb(inp, off) { const combs = [1116, 1188, 1277, 1356].map(d => ({ d: d + off, b: new Float32Array(d + off), i: 0, s: 0 })), aps = [556, 441].map(d => ({ d: d + off, b: new Float32Array(d + off), i: 0 }));
  const out = new Float32Array(inp.length), fb = 0.84, damp = 0.25;
  for (let n = 0; n < inp.length; n++) { let acc = 0; const x = inp[n] * 0.12;
    for (const c of combs) { const y = c.b[c.i]; c.s = y * (1 - damp) + c.s * damp; c.b[c.i] = x + c.s * fb; c.i = (c.i + 1) % c.d; acc += y; }
    for (const a of aps) { const y = a.b[a.i]; const v = acc + y * 0.5; a.b[a.i] = v; acc = y - v * 0.5; a.i = (a.i + 1) % a.d; }
    out[n] = acc; } return out; }
const wetL = reverb(L, 0), wetR = reverb(Rr, 23);
for (let i = 0; i < N; i++) { L[i] += wetL[i] * 0.9; Rr[i] += wetR[i] * 0.9; }

/* ---------- мастер: срез инфранизов, мягкий лимитер, -1 dBFS, затухание в конце ---------- */
const hL = hp(L, 28), hR = hp(Rr, 28); let peak = 0;
for (let i = 0; i < N; i++) { const t = i / SR, fade = 1 - span(t, END - 0.9, END - 0.02); L[i] = Math.tanh(hL[i] * 1.4) * fade; Rr[i] = Math.tanh(hR[i] * 1.4) * fade; peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rr[i])); }
const norm = peak > 0 ? 0.89 / peak : 1, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * norm * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Rr[i] * norm * 32767), 46 + i * 4); }
fs.writeFileSync(OUT, buf);
console.log(`${OUT}: ${END.toFixed(2)} с, пик до нормализации ${peak.toFixed(2)}, рождение ${fr(birth).toFixed(2)} с, остановка ${death.toFixed(2)} с`);
