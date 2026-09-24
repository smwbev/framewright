# Engine, helpers and the way of working

Read once before the first scene. Everything here is implemented in `assets/skeleton.html`
and used at full scale in `examples/ris-tv/index.html`.

There are two starting files. `assets/skeleton.html` is a film of separate plates joined by
cuts: each plate draws its own picture. `assets/world.html` is one continuous world: plates are
builders that append a line, camera keys, titles and light events to one timeline, and one
function draws any frame of it (`init.sh --world`, method in `references/world.md`). Choose the
world for a journey or a growth told without cuts; choose plates for bulletins, parodies, lists
and anything cut on the beat. Everything below holds for both.

## 1. The file

One HTML file, one canvas, one script. Sections in this order: parameters, generators,
math, canvas pool, palette, helpers, generated data between markers, engine, plates, boot.
Helpers stay above the plates block: a helper placed between two plates leaves with the
plate you cut. Generated data (polygons from a photo) lives between
`/*PORTRAIT_START*/` and `/*PORTRAIT_END*/` and is replaced by `scripts/inject.mjs`, never
by hand.

Size guide: the HTML stays under 200 KB; polygon data 30–70 KB as integers.

## 2. Knobs and the script object

```
?f=140      draw one frame and set window.__ready
?s=12       seed of the impression
?w=1920     output width; height follows the aspect and is forced even
?grid=24    contact sheet of evenly spaced frames with labels
?cw=480     cell width of the sheet
?from=480&to=720   with grid: the sheet covers only these frames (without grid: where the preview starts)
?ar=16:9    aspect ratio
no knobs    live preview in the browser, capped at 960 px
```

```js
window.RISO = {
  fps: FPS,
  get total(){ return TOTAL() },
  get plates(){ return PLATES.map(p => ({name: p.name, len: p.len})) },
  frame(n, width, seed){ renderFrame(n, width, seed, MAIN); return MAIN.toDataURL('image/png') },
  contact(n, cellW, f0, f1){ contactSheet(n, cellW, SEED, MAIN, f0, f1); return MAIN.toDataURL('image/png') },
  curves(seed){ return {fps, bpm, total, start: {plate: frame}, frames: [...]} }   // for the soundtrack
}
```

`curves()` gives plate starts; a world film adds per-frame values (head speed and position on
screen, camera zoom). `scripts/export-curves.mjs` writes them to `curves.json` and `audio.mjs`
builds its timeline from that file. The world skeleton also has `stats()`, the size of the
world, which `look.mjs info` prints.

Scripts call `RISO.frame` and save the data URL. They never screenshot the page: a
screenshot depends on CSS and device scale; `toDataURL` returns exactly the drawn pixels.

## 3. Coordinates and time

- Logical coordinates with a fixed short side of 1080. `LW`, `LH` follow the aspect; `CX`,
  `CY` are the centre. Scenes never touch output pixels; the engine scales the context.
- Safe area: important content inside the central 92 % of each axis. On-screen labels start
  at 7–8 % of the height from the edge. Styles that distort edges (CRT barrel, vignettes)
  need this; other styles benefit anyway.
- 30 fps. `BEAT` and `BAR` derive from `BPM`. At 120 BPM a beat is 15 frames and a bar 60.
  Plate lengths are multiples of `BEAT`; eighths (7.5 frames) are not cut points.
- Inside a plate use beats and progress, never global frame numbers:
  `const beat = Math.floor(S.i / BEAT), inBeat = (S.i % BEAT) / BEAT;`
  `span(S.i, a, b)` gives 0..1 between two local frames; wrap it in `ease.out`, `ease.io`,
  `ease.back`.

## 4. Generators

Three per frame, all seeded through `hash(seed, ...)` with the plate name, so inserting a
plate never changes its neighbours:

| generator | reseeded | use |
|---|---|---|
| `R` | once per plate | composition: positions, choices that must not move |
| `S.b` | every 3 frames | the live line: jitter of outlines, flicker decisions |
| `S.nz` | every frame | noise fields, snow, grain decisions |

Compute a jittered path once and reuse it; two calls of `S.b` produce two different paths.
Per-pixel effects use a linear congruential generator seeded with `hash(seed, 'grain', f)`.

## 5. The engine

`renderFrame(n, width, seed, target)`: even height, content canvas at output size, its
context wiped (`wipe(g)`: `reset()`, so no save, clip, shadow or composite mode survives from
the previous frame), context scaled by `width / LW`, background fill, `P.fn(S, R)`, edge
transition (`cutIn`, `cutOut`), reset transform, `post()` into the target. It returns `S` so
the sheet can label cells. `locate(n)` maps a global frame to a plate and a local frame.
`TOTAL()` sums plate lengths; `look.mjs info` prints them.

`COL` and `ease` are frozen: a plate that edits a shared value throws at once instead of
changing every later frame of its tab. Any offscreen canvas a plate keeps (`cvs(name, w, h)`)
is wiped or cleared before it is drawn.

`post(src, dst, S, o)` is the style's finisher. The skeleton ships grain and vignette;
replace or extend it per `styles.md`. A per-pixel pass over 1920×1080 costs 50 ms for
simple maths and up to 0.5 s with bilinear resampling in three channels. Cache anything that
depends only on resolution (distortion maps) in a dictionary keyed by `W×H`.

`cut(g, S, amt)` is the transition drawn at plate edges. The skeleton fades to black; a
retro TV switches channels with band tearing and snow; a poster style cuts hard
(`cutIn: false, cutOut: false` on every plate). The first plate has `cutIn: false`; the
last has `cutOut: false`.

When a plate needs the last frame of the previous one (a TV switching off over the
portrait), move that plate's drawing into a function and call it with a fixed local frame.

## 6. Contact sheet

`contactSheet(n, cellW, seed, target)`: cells rendered at twice the cell width and scaled
down, so per-pixel post-processing looks the way it will in the video. Labels: frame,
plate, local `t`, seconds. Six columns for landscape, eight for portrait. Twenty-four cells
cover a 40-second video every 1.7 seconds; for a 15-second video use 18.

A sheet of one section: `FROM=480 TO=720 node scripts/look.mjs sheet 12 480 7 shots/sheet-b.png`
(start frames of the plates come from `look.mjs info`). In a long film, and in a world film where
plates flow into each other, review the section you just built this way: twelve cells over eight
seconds catch a camera that stalls or jumps, which one cell every two seconds hides.

## 7. Text

Bitmap text (`pixText`): a system bold monospace at 14 px is drawn into a small canvas, the
alpha is thresholded at 0.5, the mask is scaled up without smoothing by `cell` logical units
per glyph pixel, aligned by its tight bounding box (never by font metrics), snapped to the
glyph grid so letters do not shimmer between frames. `fit` shrinks `cell` to the largest
integer that fits a width. This gives teletext, OSD menus, terminal type, pixel-game text.
Vector text (`vecText`) for display sizes in poster, flat and blueprint styles. Measure
before you place; multi-line layouts compute line height in units of `cell`, including any
sub-line, so lines never touch.

Lower titles sit on one baseline, `TITLE_Y` in both skeletons: 80 % of the height in 16:9, 70 %
in 9:16, where the bottom fifth belongs to the platform's captions and buttons. Two titles never
share the screen in the same place: end one before the next begins, even when both fade. The
world skeleton warns about overlaps in the console.

Cyrillic and Latin are both in Menlo and Helvetica Neue on macOS; on Linux install
`fonts-dejavu` and use `DejaVu Sans Mono`. Rendering happens on one machine, so
cross-machine font drift is not a concern unless the HTML is rendered elsewhere.

## 8. Motion vocabulary

- Reveal: `reveal` as a fraction of width for row-by-row text; `frac` for paths by
  cumulative length (constant beam speed); scale pop `1.10 → 1` over 45 % of a beat on
  every count; slide-in from the edge with `ease.out` over 10–12 frames.
- Hold: a still that breathes. A ±1.5 unit drift from `S.b`, a blink at 1 Hz, a slow
  brightness sine of ±2 %. Two adjacent sheet cells must still differ.
- Cut: the engine does it. Inside a plate, a "flash frame" (one white frame) and a "shake"
  (±8 units for 4 frames) are enough punctuation.
- Camera: translate and scale the whole context inside the plate; ease between two
  keyframes; never move more than 20 % of the frame per second on a hold. A camera that
  travels far (a zoom from a detail to a landscape) interpolates the zoom in log space, or it
  rushes at the close end and crawls at the far end, and is smoothed over ±18 frames; widths that
  must stay constant on screen are divided by the scale. `world.html` has this camera
  (`references/world.md`, section 4).
- Transitions between two states of one object: interpolate polylines with the same point
  count; morph by cross-fading fills only when shapes share topology.

## 9. Parametric objects

Everything is a function of a scale parameter, centred on `CX, CY`: seven-segment digits,
a test card, a graticule, a paperclip from arcs and lines with cumulative length, a clock, a
progress bar, a lower third, a stamp, a speech bubble. Build the object once as points, then
draw it with the current style; the same points serve stroke reveal, fill and jitter.

## 10. Review protocol

```bash
node scripts/look.mjs shot 0,45,115 1200 7          # first, middle, five before the end
node scripts/look.mjs sheet 24 480 7 shots/sheet.png
node scripts/look.mjs info                          # plates, lengths, seconds
node scripts/check.mjs                              # before a full render: OK or a list of problems
ffmpeg -y -i shots/f0770.png -vf "crop=900:300:160:560" shots/crop.png   # small text at full size
```

`check.mjs` is the machine half of the review: pixels of sample frames identical in seven
render orders, no clock or `Math.random` in the source, no file requested by the page, plate
lengths on the beat, a BPM that divides into frames, no flat frame inside a plate, no plate that
stands still, and the time of one full-size frame. Every script starts Chrome with
`--disable-accelerated-2d-canvas`: an accelerated canvas switches to software after a few
readbacks, and the same frame then comes out slightly different in a fresh tab and in a used one.

Look at every PNG with the image tool. The script prints page errors and console warnings;
a black frame without an error message means a plate threw before drawing, so read the
output. The checklist is in `SKILL.md`, step 4.

Lessons from review of a finished film:

- An empty scene is a scale problem. Make the object bigger or bring the camera closer; more
  detail makes a scene busier, not fuller.
- In an intimate scene the set competes with the subject. Dim the decor around it with a
  spotlight measured on screen (full near the centre, gone at about 0.6 of the frame height),
  and open the light when the world opens (`references/world.md`, section 6).
- Where plates flow into each other, shoot the last frame of one plate and the first frame of
  the next side by side: nothing may jump.

## 11. Render and encode

```bash
node scripts/render.mjs frames 7 1920 5     # ~2 min per 1200 frames with per-pixel post on an M-series Mac
START=600 END=780 node scripts/render.mjs frames 7 1920 5
RESUME=1 node scripts/render.mjs frames 7 1920 5
bash scripts/build.sh out.mp4               # CRF=22, maxrate 14M, yuv420p, faststart, AAC 192k
AR=9:16 node scripts/render.mjs frames-v 7 1080 5 && bash scripts/build.sh out-vertical.mp4 frames-v
```

`build.sh` converts the sRGB frames with the BT.709 matrix and tags the file (BT.709 primaries
and matrix, sRGB transfer, limited range). ffmpeg alone would convert with BT.601 and leave the
matrix untagged; players read HD video as BT.709, so saturated colours shift, pure green by 39
levels in a measured test. The MP4 is written under a temporary name and appears only when the
encode succeeded.

PNG frames weigh 1.5–2.5 MB each; a minute of video is 3–4 GB, ignored by git. CRF 22 with a
14 Mbit/s cap gives about 0.7 MB per second on noisy styles and half that on flat styles;
CRF 17 is five times larger with no visible gain on a contact sheet. Keep deliverables under
50 MB for messengers. Verify the MP4: `ffprobe` frame count equals `RISO.total`, duration
equals frames / 30, a tile made from the file matches the sheet.

For a vertical cut, composition needs its own sheet: `fit` saves the text, not the layout.
Platform UI covers the top 15 % and bottom 20 % of vertical video: lower titles go up to 70 %
of the height (`TITLE_Y` does it when the aspect is vertical). One soundtrack serves both cuts.

## 12. Changing a finished video

- Insert a plate: add it, shorten a neighbour to keep the total, export the curves again (the
  sound's timeline follows; without `curves.json` update the `T` table by hand), reshoot the
  sheet, re-render. In a world film the next plate's first stroke now starts from a new point:
  reshoot that boundary (`references/world.md`, section 9).
- Change a line of text: reshoot the frames that show it and one sheet.
- Swap a photo: rerun `portrait.sh`, reshoot the portrait plate.
- Change the seed: nothing else changes; render and compare two sheets side by side.

## 13. Project layout after `init.sh`

```
index.html        the video
audio.mjs         the soundtrack
storyboard.md     the plan
curves.json       plate starts and per-frame curves for the sound, written by export-curves, ignored by git
scripts/          look, check, render, build, make, export-curves, inject, portrait, trace, doctor
shots/            frames and sheets for eyes, ignored by git
frames/           PNG frames, ignored by git
package.json      npm scripts and the puppeteer dependency
```
