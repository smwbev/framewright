#!/usr/bin/env node
// Render every frame to PNG using parallel browser tabs.
//   node render.mjs [dir=frames] [seed=7] [width: 1920 for a landscape page, 1080 for a portrait one] [tabs=5]
// Env: HTML=path/to/index.html, AR=9:16, START=0 END=120 (frame range), RESUME=1 (skip existing files)
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const [,, dir = 'frames', seedS = '7', widthS = '', tabsS = '5'] = process.argv;
const seed = +seedS, tabs = Math.max(1, +tabsS); let width = +widthS;
const html = path.resolve(process.env.HTML || 'index.html');
if (!fs.existsSync(html)) { console.error(`no such file: ${html} (set HTML=path)`); process.exit(1); }
fs.mkdirSync(dir, { recursive: true });
const url = 'file://' + html + `?f=0&w=320&s=${seed}` + (process.env.AR ? `&ar=${process.env.AR}` : '');

const b = await puppeteer.launch({ headless: true, protocolTimeout: 600000, args: ['--allow-file-access-from-files', '--disable-accelerated-2d-canvas'] });
const p0 = await b.newPage();
await p0.goto(url, { waitUntil: 'load', timeout: 120000 });
await p0.waitForFunction('window.__ready===true', { timeout: 120000 });
const total = await p0.evaluate(() => window.RISO.total);
if (!width) width = await p0.evaluate(() => typeof AR !== 'undefined' && AR < 1 ? 1080 : 1920);   // the page's own aspect decides
const plates = await p0.evaluate(() => window.RISO.plates);
await p0.close();
const START = +(process.env.START || 0), END = Math.min(total, +(process.env.END || total));
const count = END - START;
console.log(`frames ${total} (${(total / 30).toFixed(1)} s), rendering ${START}..${END - 1}, tabs ${tabs}, width ${width}, seed ${seed}`);
console.log(plates.map(p => `${p.name}:${p.len}`).join('  '));

let next = START, done = 0, failed = 0; const t0 = Date.now();
async function worker() {
  const p = await b.newPage();
  p.on('pageerror', e => console.error('PAGE ERROR', e.message));
  await p.goto(url, { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction('window.__ready===true', { timeout: 120000 });
  while (true) {
    const n = next++; if (n >= END) break;
    const out = path.join(dir, `f${String(n).padStart(5, '0')}.png`);
    if (process.env.RESUME && fs.existsSync(out)) { done++; continue; }
    try {
      const u = await p.evaluate((n, w, s) => window.RISO.frame(n, w, s), n, width, seed);
      fs.writeFileSync(out, Buffer.from(u.split(',')[1], 'base64'));
    } catch (e) { failed++; console.error('frame', n, 'failed:', e.message); }
    done++;
    if (done % 60 === 0) { const el = (Date.now() - t0) / 1000; console.log(`${done}/${count}  ${el.toFixed(0)} s, ~${(el / done * (count - done)).toFixed(0)} s left`); }
  }
  await p.close();
}
await Promise.all(Array.from({ length: tabs }, worker));
await b.close();
console.log(`done: ${done - failed} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s${failed ? `, ${failed} failed` : ''}`);
if (failed) process.exit(1);
