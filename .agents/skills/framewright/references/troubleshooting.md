# Troubleshooting

## Picture

| Symptom | Cause | Fix |
|---|---|---|
| muddy, dirty colour | a dense light fill under a dark ink or layer | light colours as accents and thin underlays, never full fills under dark |
| thin lines crumble | line thinner than the halftone or pixel cell | thicker hero outlines, or a finer cell on that plate only |
| a plate looks empty | scale, not missing detail | one large object instead of twenty small ones, or a closer camera; never more detail |
| a cell does not read in 1.5 s | the plate is a process, not a picture | redesign the plate around one still image |
| text clipped | no width fitting | `fit` in `pixText`, measure before placing |
| lines touch each other | line height ignored a sub-line | compute line height in units of `cell` including sub-lines |
| the cut eats the first frame | transition 3–4 frames, event on frame 0 | move the event one beat later, or `cutIn: false` |
| labels cut at the corners | barrel or vignette | safe area 92 %, labels at 7–8 % of height from the edge |
| letters shimmer between frames | text not snapped to its grid | keep `pixText` snapping; do not place text at fractional cells |
| everything wobbles and tires the eye | every element uses the live generator | only the current stroke is alive; freeze what is done |
| a hold looks frozen on the sheet | no breathing | ±1.5 unit drift, a blink, a slow brightness sine |
| RGB split too strong or uneven | offset given in output pixels | offsets in logical units, multiplied by `S.sc` at draw time |
| a frame is black with no error | the plate threw before drawing | read the `PAGE ERROR` line from `look.mjs`; the exception is there |
| neighbouring plates changed after inserting one | generators seeded by plate index | seed by plate name (the skeleton does) |
| the vertical cut looks wrong | landscape composition scaled | compose the vertical variant: check its own sheet with `AR=9:16` |
| a title hides under the platform's buttons in 9:16 | title placed for 16:9 | baseline at `TITLE_Y`: 70 % of the height in vertical |
| two titles smudge into one | both on screen at once in the same place | end one before the next begins, even when both fade |

## World films

| Symptom | Cause | Fix |
|---|---|---|
| the camera jumps at a plate boundary | the next plate's first key is far from where the camera was | start the plate with a key where the previous one ended, or let a key 12+ frames later take over |
| a zoom rushes at first and then crawls | `z` interpolated linearly | interpolate `log z` (`camRaw` in `world.html` does) |
| the camera lands late on an event | Gaussian smoothing settles up to 12 frames after a key | move the key 12 frames earlier or hold two equal keys |
| lines get fat or vanish during a zoom | widths in world units | widths in screen px divided by `k` |
| a stroke appears all at once | the stroke arrives before the pen's time: the previous one overran | read the pen warning, retime the previous plate's strokes |
| the head creeps during a pause | a pause without a point at its end | `pen.hold` writes one (the skeleton does) |
| frames slow down as the line grows | the line redrawn point by point every frame | `Path2D` chunks and a binary search for the head (`world.html`) |
| a hidden part of the line ends with a stray piece | range split inside a chunk | `cover()` and `dim()` add chunk breaks; do not pass raw ranges |
| a close-up looks busy | decor as bright as the subject | spotlight: `W.spot` about 0.6 in intimate scenes |
| bloom washes the picture out | light over a light ground, too much bloom | keep the ground dark under light, lower the bloom alpha from 0.85 |
| decor crowds the frame after a zoom out | one grid for every scale | several grids ×4 apart, each shown while its dots are 40+ px apart on screen |

## Portrait

See `photo.md`, section 3.

## Sound

| Symptom | Cause | Fix |
|---|---|---|
| cues drift from the picture | `T` table out of date | copy starts from `look.mjs info`, regenerate |
| a scene is silent | no bed | add hum, hiss or a pad at 0.02–0.06 under everything |
| the track is one solid block | too many layers at high amplitude | drop beds to 0.03, drums to 0.5, watch the pre-normalization peak (aim 0.7) |
| clicks at cue boundaries | zero attack or release | `att` 4 ms, `rel` 20 ms minimum |
| sound follows an old version of the picture | stale `curves.json` | `node scripts/export-curves.mjs curves.json` before `audio.mjs` (`make.sh` and `npm run audio` do; the template warns) |
| a voice that follows the picture zippers | controls jump every frame | smooth amplitude and pan over 20–30 ms (`follow` does) |
| the follow voice drones at one level | `sMax` too low, the curve saturates | raise `sMax` to the speed of a brisk stroke; read `sp` in `curves.json` |

## Render and files

| Symptom | Cause | Fix |
|---|---|---|
| render slow | per-pixel pass without cached maps or too large a blur | cache maps per resolution, blur radius `W/220` or less, 4–6 tabs |
| MP4 huge | CRF 17 on noise | CRF 22 with a 14 Mbit/s cap (`build.sh` default) |
| MP4 does not play on a phone | not yuv420p or an odd dimension | `build.sh` handles both; do not encode by hand |
| frame count differs from the plan | old frames left in `frames/` | `rm -rf frames` before a full render, or `RESUME=1` deliberately |
| audio ends early | `-shortest` with a short WAV | make `T.end` equal the video length |
| fonts differ from the sheet | rendered on another machine | render where you reviewed; bitmap text hides small differences |

## Environment

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot find module 'puppeteer'` | not installed in this project | `npm install` in the project (or `doctor.sh --install`) |
| puppeteer installed but no browser | postinstall blocked by npm policy | `npx puppeteer browsers install chrome`; Chrome lives in `~/.cache/puppeteer` |
| `Could not find Chrome` on Linux CI | missing shared libraries | install `libnss3 libatk-bridge2.0-0 libgbm1 libasound2` or use the distro chromium and set `PUPPETEER_EXECUTABLE_PATH` |
| pip refuses to install (PEP 668) | Homebrew or Debian Python is externally managed | `doctor.sh --install` falls back to `./.venv`; `portrait.sh` picks it up |
| pip hangs for minutes | building a wheel from source (OpenCV on a new Python) | you do not need OpenCV; the tracer runs on numpy and scipy |
| `ls *.jpg` errors in zsh | no match aborts the command | `ls -la | grep -i jpg` |
| a heredoc is rejected for "control characters" | escape sequences like `` in the text | write the file with the editor tool or replace the escapes |
| symlinked skill not seen on Windows | symlinks need Developer Mode | `npx skills add smwbev/framewright --copy` or copy the folder |
| Gemini CLI ignores AGENTS.md | context file name not configured | `.gemini/settings.json` with `context.fileName: ["AGENTS.md","GEMINI.md"]` ships in the repo |
