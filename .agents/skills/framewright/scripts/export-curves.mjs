#!/usr/bin/env node
// Dump the film's curves for the soundtrack: plate starts, cues and, in world films, per-frame values.
//   node export-curves.mjs [out=curves.json] [seed=7]
// Writes {fps, bpm, total, start: {plate: frame}, frames: [{f, sp, pan, z, ...}], cues: [{name, f, ...}]} from window.RISO.curves(seed).
// World films fill `frames` (head speed and position on screen, camera zoom), painting films too (sketch, colour, life,
// gust, zoom); plate films give plate starts and cues.
// A page without RISO.curves() is skipped with a note and exit code 0, so make.sh can always call this.
// Env: HTML=path/to/index.html (default ./index.html), AR=9:16 (aspect override)
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const [,, out = 'curves.json', seedS = '7'] = process.argv;
const html = path.resolve(process.env.HTML || 'index.html');
if (!fs.existsSync(html)) { console.error(`no such file: ${html} (set HTML=path)`); process.exit(1); }

const b = await puppeteer.launch({ headless: true, protocolTimeout: 600000, args: ['--allow-file-access-from-files', '--disable-accelerated-2d-canvas'] });
try {
  const p = await b.newPage();
  p.on('pageerror', e => console.error('PAGE ERROR', e.message));
  p.on('console', m => { if (['error', 'warn', 'warning'].includes(m.type()) && !/^Canvas2D: Multiple readback/.test(m.text())) console.error('CONSOLE', m.text()); });   // puppeteer >= 22 reports console.warn as 'warn'
  await p.goto('file://' + html + `?f=0&w=320&s=${seedS}` + (process.env.AR ? `&ar=${process.env.AR}` : ''), { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction('window.__ready===true', { timeout: 120000 });
  if (!await p.evaluate(() => typeof window.RISO?.curves === 'function')) {
    console.log(`no RISO.curves() in ${html}: nothing to export, audio.mjs keeps its own T table`);
  } else {
    const c = await p.evaluate(s => window.RISO.curves(s), +seedS);
    fs.writeFileSync(out, JSON.stringify(c));
    console.log(`${out}: ${c.total} frames at ${c.fps} fps, ${c.frames.length ? 'per-frame curves' : 'plate starts'}${c.cues?.length ? `, ${c.cues.length} cue${c.cues.length > 1 ? 's' : ''}` : ''}; starts ${JSON.stringify(c.start)}`);
  }
} finally {
  await b.close();
}
