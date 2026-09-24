#!/usr/bin/env node
// Frame viewer for a framewright project.
//   node look.mjs shot <frame[,frame...]> [width=1200] [seed=7] [out]      one or more frames as PNG
//   node look.mjs sheet [n=24] [cellWidth=480] [seed=7] [out]              contact sheet of n evenly spaced frames
//   node look.mjs info                                                    total frames, plates with starts, world size, as JSON
// Env: HTML=path/to/index.html (default ./index.html), AR=9:16 (aspect override), OUT_DIR=shots,
//      FROM=480 TO=720 (sheet of that frame range only: one section of a long or continuous film)
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const [,, mode = 'shot', ...rest] = process.argv;
const html = path.resolve(process.env.HTML || 'index.html');
const outDir = process.env.OUT_DIR || 'shots';
if (!fs.existsSync(html)) { console.error(`no such file: ${html} (set HTML=path)`); process.exit(1); }

const b = await puppeteer.launch({ headless: true, protocolTimeout: 600000, args: ['--allow-file-access-from-files', '--disable-accelerated-2d-canvas'] });
const p = await b.newPage();
p.on('pageerror', e => console.error('PAGE ERROR', e.message));
p.on('console', m => { if (['error', 'warn', 'warning'].includes(m.type()) && !/^Canvas2D: Multiple readback/.test(m.text())) console.error('CONSOLE', m.text()); });   // puppeteer >= 22 reports console.warn as 'warn'

async function open(seed) {
  const url = 'file://' + html + `?f=0&w=320&s=${seed}` + (process.env.AR ? `&ar=${process.env.AR}` : '');
  await p.goto(url, { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction('window.__ready===true', { timeout: 120000 });
}
function save(dataUrl, out) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('saved', out);
}

try {
  if (mode === 'shot') {
    const frames = String(rest[0] ?? '0').split(',').map(Number);
    const width = +(rest[1] ?? 1200), seed = +(rest[2] ?? 7), out = rest[3];
    await open(seed);
    for (const f of frames) {
      const t0 = Date.now();
      const u = await p.evaluate((f, w, s) => window.RISO.frame(f, w, s), f, width, seed);
      save(u, out ?? path.join(outDir, `f${String(f).padStart(4, '0')}.png`));
      console.log('  ms', Date.now() - t0);
    }
  } else if (mode === 'sheet') {
    const n = +(rest[0] ?? 24), cw = +(rest[1] ?? 480), seed = +(rest[2] ?? 7);
    const out = rest[3] ?? path.join(outDir, 'sheet.png');
    const f0 = process.env.FROM != null ? +process.env.FROM : undefined, f1 = process.env.TO != null ? +process.env.TO : undefined;
    await open(seed);
    if ((f0 != null || f1 != null) && await p.evaluate(() => window.RISO.contact.length < 4))
      console.error('this page has contact(n, cellW) without a frame range: FROM/TO ignored (the skeletons take contact(n, cellW, f0, f1))');
    const t0 = Date.now();
    const u = await p.evaluate((n, cw, f0, f1) => window.RISO.contact(n, cw, f0, f1), n, cw, f0, f1);
    save(u, out);
    console.log('  ms', Date.now() - t0);
  } else if (mode === 'info') {
    await open(7);
    const info = await p.evaluate(() => ({ total: window.RISO.total, fps: window.RISO.fps ?? 30, plates: window.RISO.plates,
      world: typeof window.RISO.stats === 'function' ? window.RISO.stats() : undefined }));
    let acc = 0; for (const pl of info.plates) { pl.start = acc; pl.sec = +(acc / info.fps).toFixed(2); acc += pl.len; }
    info.seconds = +(info.total / info.fps).toFixed(2);
    console.log(JSON.stringify(info, null, 2));
  } else {
    console.error('usage: look.mjs shot|sheet|info ...');
  }
} finally {
  await b.close();
}
