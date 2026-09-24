#!/usr/bin/env node
// Pre-render check of a framewright page: deterministic, self-contained, on the grid. make.sh runs it before a render.
//   node check.mjs [seed=7] [width=480]
// FAIL (exit 1): a frame throws or the page logs an error; a frame's pixels depend on what was rendered before it
//   (every probe is compared fresh in a new page, in forward, backward and shuffled order, right after the previous
//   frame, after a render at another width, and after a sweep over the film the way a render tab walks it); the
//   source calls Math.random, Date or performance.now; the page requests anything but itself; the HTML embeds base64 media.
// WARN: console warnings, plate lengths off the beat, a BPM that does not divide into frames, a flat frame inside a
//   plate, a plate whose inner frames are identical, a stale curves.json, an HTML over 200 KB.
// Probes: the first, quarter, middle, three-quarter and last frame of every plate.
// Env: HTML=path/to/index.html (default ./index.html), AR=9:16 (aspect override)
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [,, seedS = '7', widthS = '480'] = process.argv;
const seed = +seedS, width = +widthS, AR = process.env.AR || '';
const html = path.resolve(process.env.HTML || 'index.html');
if (!fs.existsSync(html)) { console.error(`no such file: ${html} (set HTML=path)`); process.exit(1); }
const out = [];                                   // [level, area, text]
const add = (level, area, text) => { if (!out.some(o => o[0] === level && o[2] === text)) out.push([level, area, text]); };
const fail = (area, t) => add('FAIL', area, t), warn = (area, t) => add('warn', area, t), info = (area, t) => add('info', area, t);
const failed = area => out.some(o => o[0] === 'FAIL' && o[1] === area);

/* ---- source: comments blanked out first (line numbers kept), so a rule quoted in a comment does not trip it ---- */
const src = fs.readFileSync(html, 'utf8');
const code = src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
                .replace(/(^|[^:\\'"])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
const banned = [[/\bMath\.random\s*\(/, 'Math.random'], [/\bDate\.now\s*\(|\bnew\s+Date\s*\(/, 'Date'],
                [/\bperformance\.now\s*\(/, 'performance.now'], [/\bgetRandomValues\s*\(/, 'crypto.getRandomValues']];
code.split('\n').forEach((l, i) => { for (const [re, name] of banned) if (re.test(l)) fail('source', `line ${i + 1} calls ${name}: a frame may depend only on (frame, seed, width)`); });
if (/data:(image|font|video|audio)\/[\w.+-]+;base64,/i.test(src)) fail('source', 'the HTML embeds base64 media: draw it in code, or trace a photo into polygons');
const kb = Buffer.byteLength(src) / 1024;
if (kb > 200) warn('source', `the HTML is ${kb.toFixed(0)} KB (keep it under 200): fewer polygon levels or --tol 1.2`);
const curves = path.join(path.dirname(html), 'curves.json');
if (fs.existsSync(curves) && fs.statSync(curves).mtimeMs < fs.statSync(html).mtimeMs) warn('source', 'curves.json is older than index.html: export the curves again before the sound');

/* ---- pages: every console line, error and network request is recorded ---- */
const b = await puppeteer.launch({ headless: true, protocolTimeout: 600000, args: ['--allow-file-access-from-files', '--disable-accelerated-2d-canvas'] });
const url = (f, w) => 'file://' + html + `?f=${f}&w=${w}&s=${seed}` + (AR ? `&ar=${AR}` : '');
async function open(f = 0, w = width, wait = 120000) {
  const p = await b.newPage();
  let broke; const broken = new Promise((_, no) => { broke = no; }); broken.catch(() => {});
  p.on('pageerror', e => { fail('frames', `page error: ${e.message.split('\n')[0]}`); broke(new Error(`the page stops on an error while it loads: ${e.message.split('\n')[0]}`)); });
  p.on('console', m => { const t = m.type();
    if (t === 'error') fail('frames', `console error: ${m.text()}`);
    else if ((t === 'warn' || t === 'warning') && !/^Canvas2D: Multiple readback/.test(m.text())) warn('frames', `console: ${m.text()}`); });
  p.on('request', r => { let own = false;
    try { const x = new URL(r.url()); own = x.protocol === 'file:' && decodeURIComponent(x.pathname) === html; } catch {}
    if (!own) fail('requests', `the page requests ${r.url().slice(0, 100)}: a film loads nothing but itself`); });
  await Promise.race([p.goto(url(f, w), { waitUntil: 'load', timeout: wait }), broken]);
  await Promise.race([p.waitForFunction('window.__ready===true', { timeout: wait }), broken]);
  return p;
}
// render one frame, return its PNG and the spread of its luminance (0 = one flat colour)
const shoot = (p, f, w = width) => p.evaluate((f, w, s) => {
  const u = window.RISO.frame(f, w, s), c = document.querySelector('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0, m = 0, q = 0;
  for (let i = 0; i < d.length; i += 28) { const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++; m += y; q += y * y; }
  m /= n; return { u, sd: Math.sqrt(Math.max(0, q / n - m * m)) };
}, f, w, seed);
const hash = u => crypto.createHash('sha1').update(u).digest('hex').slice(0, 12);

try {
  const p0 = await open();
  const film = await p0.evaluate(() => ({ total: window.RISO.total, fps: window.RISO.fps ?? 30, plates: window.RISO.plates,
    beat: typeof BEAT !== 'undefined' ? BEAT : null, bpm: typeof BPM !== 'undefined' ? BPM : null, ar: typeof AR !== 'undefined' ? AR : null }));

  /* ---- timeline ---- */
  let acc = 0; const starts = film.plates.map(pl => { const s = acc; acc += pl.len; return s; });
  info('timeline', `${film.plates.length} plates, ${film.total} frames, ${(film.total / film.fps).toFixed(1)} s`);
  if (film.beat) for (const pl of film.plates) if (pl.len % film.beat) warn('timeline', `plate ${pl.name}: ${pl.len} frames is not a whole number of beats (${film.beat})`);
  if (film.bpm) {
    const exact = film.fps * 60 / film.bpm, eighth = exact / 2;
    if (Math.abs(exact - Math.round(exact)) > 1e-6) {
      const fit = []; for (let t = 60; t <= 200; t++) if ((film.fps * 60) % t === 0) fit.push(t);
      warn('timeline', `${film.bpm} BPM is ${exact.toFixed(2)} frames per beat: the picture rounds the beat, the sound does not, and they drift; at ${film.fps} fps these fit: ${fit.join(', ')}`);
    }
    info('timeline', `beat ${+exact.toFixed(2)} frames, eighth ${+eighth.toFixed(2)}${Number.isInteger(eighth) ? '' : ' (not a whole frame: keep cuts and hits on beats)'}`);
  }

  /* ---- probes ---- */
  const probes = [], seen = new Set();
  film.plates.forEach((pl, i) => { const s = starts[i], L = pl.len;
    for (const [kind, f] of [['first', s], ['quarter', s + Math.floor(L / 4)], ['middle', s + Math.floor(L / 2)], ['three-quarter', s + Math.floor(3 * L / 4)], ['last', s + L - 1]])
      if (!seen.has(f)) { seen.add(f); probes.push({ f, plate: pl.name, kind }); } });
  const F = probes.map(x => x.f), H = {}, SD = {};
  const note = (f, order, u) => { (H[f] ??= {})[order] = hash(u); };
  async function pass(order, list, before) {
    for (const f of list) {
      try { if (before) await before(f); const r = await shoot(p0, f); note(f, order, r.u); if (order === 'forward') SD[f] = r.sd; }
      catch (e) { fail('frames', `frame ${f} throws: ${String(e.message).split('\n')[0]}`); }
    }
  }
  await pass('forward', F);
  await pass('backward', [...F].reverse());
  let z = seed * 2654435761 >>> 0; const rnd = () => (z = (Math.imul(z, 1664525) + 1013904223) >>> 0) / 4294967296;
  const mixed = [...F]; for (let i = mixed.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [mixed[i], mixed[j]] = [mixed[j], mixed[i]]; }
  await pass('shuffled', mixed);
  await pass('after the previous frame', F, f => f > 0 ? shoot(p0, f - 1) : null);
  await pass('after another width', F, f => shoot(p0, f, width * 2));
  // a render tab walks the film every 5th frame (5 tabs): state one frame leaves behind reaches every later frame of the tab
  const stride = Math.max(5, Math.ceil(film.total / 400));
  try { for (let f = 0; f < film.total; f += stride) await shoot(p0, f); } catch (e) { fail('frames', `a frame of the sweep throws: ${String(e.message).split('\n')[0]}`); }
  await pass('after a sweep', F);
  // fresh: the first frame a new tab draws, straight from the canvas the page painted on load (as each render tab starts)
  const cold = F.filter(f => H[f]?.forward);                // frames that already threw are reported above
  for (let i = 0; i < cold.length; i += 4) {
    await Promise.all(cold.slice(i, i + 4).map(async f => {
      let p;
      try { p = await open(f, width, 30000); note(f, 'fresh', await p.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))); }
      catch (e) { fail('frames', `frame ${f} does not render as the first frame of a new page: ${String(e.message).split('\n')[0]}`); }
      finally { if (p) await p.close(); }
    }));
  }
  const orders = new Set(Object.values(H).flatMap(h => Object.keys(h)));
  let bad = 0;
  for (const x of probes) {
    const h = H[x.f]; if (!h || new Set(Object.values(h)).size < 2) continue;
    if (++bad > 8) continue;
    const groups = {}; for (const [o, v] of Object.entries(h)) (groups[v] ??= []).push(o);
    fail('order', `frame ${x.f} (${x.plate}, ${x.kind}) changes with render order: ${Object.values(groups).map(g => g.join(' = ')).join('  vs  ')}`);
  }
  if (bad > 8) fail('order', `…and ${bad - 8} more frames. Look for state that survives a frame: a pooled canvas drawn without clearing, a global a plate changes, a cache keyed without all its inputs`);

  /* ---- content: flat frames inside plates, plates that do not move ---- */
  for (const x of probes) if (['quarter', 'middle', 'three-quarter'].includes(x.kind) && SD[x.f] != null && SD[x.f] < 1)
    warn('frames', `frame ${x.f} (${x.plate}, ${x.kind}) is one flat colour: a plate that draws nothing, or a fade that lasts too long`);
  film.plates.forEach(pl => {
    const inner = probes.filter(x => x.plate === pl.name && ['quarter', 'middle', 'three-quarter'].includes(x.kind)).map(x => H[x.f]?.forward);
    if (inner.length === 3 && inner[0] && inner.every(v => v === inner[0])) warn('frames', `plate ${pl.name} does not move: its quarter, middle and three-quarter frames are identical`);
  });

  /* ---- time per frame at full width ---- */
  const m = /^(\d+(?:\.\d+)?)[:x\/](\d+(?:\.\d+)?)$/.exec(AR), vertical = m ? +m[1] < +m[2] : film.ar != null && film.ar < 1;   // env AR, else the page's own aspect
  const FW = vertical ? 1080 : 1920, tms = [];
  for (const f of [F[0], F[Math.floor(F.length / 2)], F[F.length - 1]]) { const t0 = Date.now(); await p0.evaluate((f, w, s) => window.RISO.frame(f, w, s), f, FW, seed); tms.push(Date.now() - t0); }
  const ms = tms.reduce((a, c) => a + c, 0) / tms.length;
  info('time', `one ${FW} px frame takes ~${Math.round(ms)} ms: the full render is about ${Math.max(0.1, Math.round(ms * film.total / 5 / 6000) / 10)} min with 5 tabs`);
  if (ms > 1500) warn('time', `a ${FW} px frame takes ${Math.round(ms)} ms: cache what depends only on the resolution, blur at W/220 or less`);

  /* ---- report ---- */
  const okText = { source: 'source: no Math.random, Date or performance.now, no embedded media',
    requests: 'requests: the page loads nothing but itself',
    frames: `frames: ${probes.length} probes render without errors`,
    order: `order: every probe is identical in ${orders.size} render orders (${[...orders].join(', ')})` };
  const rel = path.relative(process.cwd(), html);
  console.log(`check ${rel && !rel.startsWith('..') ? rel : html}   seed ${seed}, ${width} px`);
  for (const a of Object.keys(okText)) if (!failed(a)) console.log(`  ok    ${okText[a]}`);
  for (const lv of ['info', 'warn', 'FAIL']) for (const o of out) if (o[0] === lv) console.log(`  ${lv.padEnd(5)} ${o[2]}`);
} catch (e) {
  fail('frames', `the check could not run: ${String(e.message).split('\n')[0]}`);
  for (const o of out) if (o[0] === 'FAIL') console.log(`  FAIL  ${o[2]}`);
} finally {
  await b.close();
}
const nf = out.filter(o => o[0] === 'FAIL').length, nw = out.filter(o => o[0] === 'warn').length;
console.log(nf ? `FAILED: ${nf} problem${nf > 1 ? 's' : ''}` : `OK${nw ? `, ${nw} warning${nw > 1 ? 's' : ''}` : ''}`);
process.exit(nf ? 1 : 0);
