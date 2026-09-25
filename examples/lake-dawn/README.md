# Lake at dawn

A finished framewright painting film: a calm mountain lake at sunrise with a birch, reeds, a jetty
and a moored boat, drawn in sepia pencil, painted in oil and brought to life in one shot. 15 seconds,
16:9, 450 frames at 30 fps, 120 BPM, one 91 KB HTML file (the painting kit is about 50 KB of it), a
soundtrack of wind, water, rustle and birds.

| # | plate | beats | seconds | what happens |
|---|---|---|---|---|
| 1 | sketch | 4 | 0–2 | blank paper; from f6 (`marks`) the first pencil islands open as separate drips along the top edge, and the drawing, computed from the painting, spreads down from the top left in growing islands: half the paper at f30, all of it by about f52; a short hold on the drawing |
| 2 | colour | 3 | 2–3.5 | from f60 (`wash`) oil colour rises from the bottom in soft blooms that stop at 65 %, the pencil still visible; from f73 (`finish`) the whole picture finishes to 100 % and the lines dissolve; the paint is complete at f98 (`done`) and holds still |
| 3 | alive | 23 | 3.5–15 | at f105 (`alive`) life ramps in: the lake trembles in strips, glitter on the sun path fades in and out, the boat bobs, clouds and mist drift, reeds and the birch crown sway on one gust; from f110 (`push`) the camera pushes in about a point just below the sun, ×1.10 by the last frame; at f200 (`birds`) a pair of birds crosses the sky from the left |

Every plate calls `drawPainting(S)`: the plates are chapters of time over one painting, not
pictures, and none of them cuts. The method is `references/painting.md`; the style is 13 in
`references/styles.md`. What to read in `index.html`:

- the painting kit, between `/* ===== painting kit ===== */` and `/* ===== end painting kit ===== */`,
  the same block as in `assets/painting.html`: layers of brush marks (`layer`, `dab`, `blade`) cached
  once per (seed, width) at `OVER` = 1.14× the output so the push-in never upsamples; the pencil
  drawing computed from the still (`pencilOf`); the reveals of the drawing and the colour through
  noisy time fields in absolute frames (`REVEAL`, `timeField`, `maskAt`, `finishOf`); life, wind and
  the camera (`LIFE`, `lifeAt`, `gust`, `camAt`);
- the scene, between `/* ===== scene ===== */` and `/* ===== end scene ===== */`: `SCENE` with the
  horizon, the sun, the ridge lines as fractions of the frame, a per-region pencil gain and the
  reveal overrides, then twelve layers back to front, from the sky to the birch crown;
- the lake: the sky, sun and ridge layers mirrored about the shore line and repainted as horizontal
  marks sampled from that mirror; alive, the cached layer is hidden and drawn in strips 3–9 px high
  that shift sideways by a smooth noise, with glitter that fades and never blinks;
- one wind for everything that moves: about 370 front reed blades drawn every frame sway on
  `gust(t - (LW - x)/700)`, and the birch crown's sprays swing about their roots on the same gust
  0.25 s later; a jetty in perspective and a boat layer that bobs and rolls;
- `CUES`, the moments the picture and the sound share; `RISO.curves()` exports per frame the
  revealed shares, life, the gust and the zoom (`paintingCurves`).

`audio.mjs` builds the soundtrack on `nature.mjs`, a copy of the skill's `assets/nature.mjs`: a quiet
air bed from frame 0; from `alive`, wind and a reed and leaf rustle that follow the page's gust,
lapping water at the jetty, three songbirds, a brighter call on `birds`, a distant cuckoo; nothing
follows the pencil. `assets/audio-nature.mjs` is this file made generic, and `init.sh --painting`
copies both into a new project.

Render it from the repository root:

```bash
npm install
HTML=examples/lake-dawn/index.html node .agents/skills/framewright/scripts/look.mjs sheet 24 480 7 shots/lake-dawn.png
FROM=0 TO=110 HTML=examples/lake-dawn/index.html node .agents/skills/framewright/scripts/look.mjs sheet 12 480 7 shots/lake-dawn-reveal.png
HTML=examples/lake-dawn/index.html node .agents/skills/framewright/scripts/check.mjs
HTML=examples/lake-dawn/index.html node .agents/skills/framewright/scripts/render.mjs frames 7 1920 5
( cd examples/lake-dawn && node ../../.agents/skills/framewright/scripts/export-curves.mjs curves.json && node audio.mjs ../../track.wav )
bash .agents/skills/framewright/scripts/build.sh out.mp4
```

With 5 tabs the render takes about 30 s. `curves.json`, `frames/`, `shots/`, `track.wav` and
`out.mp4` stay out of git. Or open `index.html` in a browser for a live preview; `?f=30&w=1200` shows
the drawing, `?f=82&w=1200` the colour arriving, `?f=300&w=1200` the living painting.
