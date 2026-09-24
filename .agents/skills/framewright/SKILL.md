---
name: framewright
description: Build a short procedural video (10–60 s) as one self-contained HTML file where every frame is a pure function of (frame number, seed, width), then render it to MP4 with headless Chrome and ffmpeg, with a synthesized soundtrack and optional photo-to-vector portraits. Use when the user asks for an animated clip, motion graphics, an intro or outro, a video greeting, shout-out or question addressed to someone, a teaser, kinetic typography, a retro TV, risograph, terminal or blueprint style animation, a one-take film where a single line or camera journey carries the story, or wants "a video from code" without stock footage or video editors. Runs an interactive brief, proposes three concepts, storyboards to a beat grid, builds scene by scene with visual checks, verifies the final MP4.
license: MIT
compatibility: Node 20+, Chrome via Puppeteer, ffmpeg with libx264. Python 3 with numpy, scipy and Pillow only for photo tracing. macOS and Linux; Windows through WSL.
metadata:
  author: smwbev
  version: "1.1.0"
  homepage: https://github.com/smwbev/framewright
---

# Framewright

You are going to make a short video the way a printmaker makes a print: one HTML file with a
canvas, a list of scenes called plates, and a frame function that draws any frame on demand
from (frame number, seed, width). No footage, no image files, nothing from a CDN. Frames are
rendered in headless Chrome and assembled by ffmpeg. Sound is synthesized last, to the locked
scene lengths.

Talk to the user in their language. Keep the rules below even when the user is in a hurry:
every shortcut here costs more than it saves.

`SKILL_DIR` below means the folder that contains this file (in Claude Code it is
`${CLAUDE_SKILL_DIR}`; elsewhere it is `.agents/skills/framewright`). After step 3 the
scripts also live in the project's own `scripts/` folder.

## Non-negotiables

1. A frame depends only on frame number, seed and output width. No `Math.random`, no wall
   clock, no CSS animation, no `requestAnimationFrame` as a time source.
2. No image, video, font or library files, no base64, no CDN. Polygons traced from a photo
   by a script are data and are fine. System fonts are enough.
3. You verify by looking at rendered frames, never by reading code and imagining. Any fix is
   confirmed with a frame.
4. One scene at a time. Write a plate, shoot three frames, look, fix, then the next plate.
5. Scene lengths are multiples of the beat from the first draft. Sound comes last.
6. Full render only after a contact sheet of the whole video looks right.
7. Never commit `frames/`, `shots/`, `*.mp4`, `*.wav` or the user's photos.
8. Ask before installing system packages. Never publish a real person's likeness without
   the user confirming they have the right to use it.

## Workflow at a glance

| Step | What happens | Checkpoint with the user |
|---|---|---|
| 0 | environment check | only if something must be installed |
| 1 | brief | questionnaire, one block |
| 2 | concepts | three options, pick one |
| 3 | storyboard + scaffold | one "go" |
| 4 | scenes, one by one | contact sheet every 2–3 scenes |
| 5 | assets (photos, logos) | preview of the traced portrait |
| 6 | full sheet, render, build | preview MP4 |
| 7 | sound | rebuilt MP4 |
| 8 | delivery and variations | final |

Typical wall-clock: brief and concepts 10 minutes, scaffold 10, each scene 10–20, render
2–4 minutes per minute of 1080p video, sound 15.

## Step 0. Environment

```bash
bash SKILL_DIR/scripts/doctor.sh            # report; add --json for a machine-readable summary
bash SKILL_DIR/scripts/doctor.sh --install  # installs what is missing, asks before each step
```

Required: Node 20+, npm, ffmpeg with libx264, Puppeteer with Chrome in the project.
Optional: Python 3 with numpy, scipy, Pillow, only when a photo will be traced. If the doctor
reports missing tools, tell the user what will be installed and where, get a yes, then run
`--install` (add `--yes` when the user already agreed). Do not start step 3 with a failing doctor.

## Step 1. The brief

Run the questionnaire from `references/questionnaire.md`. Use the harness's structured
question tool when one exists (Claude Code: `AskUserQuestion`, up to four questions per call,
two to four options each, put the recommended option first and mark it). Without such a tool,
print the questions as a numbered list with lettered options and a default per question, and
accept terse answers like `1b 2a 3c`. Always ask, in this order:

1. Message: what must the viewer understand or feel, in one sentence. Names, dates, links,
   exact phrases that must appear on screen.
2. Where it plays and the format: 16:9, 9:16, 1:1, 4:5.
3. Length: 10–15, 20–25, 30–40, 45–60 seconds.
4. Tone: playful, deadpan, warm, epic, technical, dark.
5. Style: let you propose (default) or a family from `references/styles.md`.
6. Assets: photos, logos, screenshots. Files must be placed in the project folder; an image
   pasted into chat cannot be saved by you. Ask about rights for real people.
7. Sound: synthesized, none, or room for the user's track (then ask its BPM).
8. Deliverables and quality: draft or final, extra cuts (vertical, GIF, poster frame,
   seed variations).

If the user says "you decide", take the defaults, say which ones you took, and move on.

## Step 2. Concepts

Propose exactly three concepts before any code. Build them from three angles: literal (show
the subject), metaphor (a visual system that stands for the situation: a TV test card for
waiting, a blueprint for a plan, a terminal for a process), and genre parody (news bulletin,
arcade attract mode, safety card, weather forecast, teletext). For each concept give: a name,
a one-sentence logline, the visual system and palette, three to five key scenes in order, the
ending, a sound sketch, why it fits, and its main risk. Present a compact table, recommend
one, and ask the user to pick. The method and worked examples are in
`references/questionnaire.md`. A concept whose logline is one journey without cuts (a line that
never lifts, a flight from a detail out to a landscape) is built as one continuous world
(`references/world.md`); say so in its row, because it changes how scenes are built and changed.

## Step 3. Storyboard and scaffold

Fill `storyboard.md` (template in `assets/storyboard.md`): one row per plate, lengths in
bars, the beat grid (30 fps, 120 BPM: beat 15 frames, bar 60), the second of the main event,
the total. The total must equal the agreed length; when a scene is added later, another
scene gives up a bar. Show the table and ask for a single go.

Then scaffold:

```bash
bash SKILL_DIR/scripts/init.sh           # index.html, scripts/, audio.mjs, storyboard.md, package.json
bash SKILL_DIR/scripts/init.sh . --world # the same, but index.html is the one-world skeleton (no cuts)
npm install                              # puppeteer (Chrome comes from the cache or is downloaded once)
node scripts/look.mjs shot 0,30,60 1200 7
```

Open the PNGs with your image viewing tool and look at them. The skeleton's demo plate must
render before you touch it. Then replace the demo plate with your first scene.

## Step 4. Scenes

Read `references/guide.md` once before the first scene. The essentials:

- `plate('name', {len: 2*BAR}, (S, R) => { ... })`. `S.t` is progress 0..1, `S.i` the local
  frame, `S.f` the global frame, `S.g` the 2D context in logical coordinates (short side
  1080). `R` is a generator stable for the whole plate; `S.b` re-seeds every three frames and
  gives a live line; `S.nz` changes every frame for noise. Seeds derive from the plate name.
- All geometry in logical units, centred through `CX, CY`. Keep important content inside the
  central 92 % of the frame.
- Time inside a plate in beats: `Math.floor(S.i/BEAT)`, `span(S.i, a, b)`, `ease.out(...)`.
  Never hard-code global frame numbers inside a scene.
- Helpers live above the plates block, never between plates.
- Transitions are drawn by the engine at plate edges (`cutIn`/`cutOut` flags); scenes do
  not know about them.
- A world film (`--world`) has no cuts. Plates are builders, `build(W, {pen, b, R})`, that
  append to one timeline: `b(x)` is beat x of the plate, the pen continues the line from where
  the previous plate left it, `camKey` moves one camera, `title` adds text. Read
  `references/world.md` before the first builder.

Per scene: write it, shoot the first frame, one in the middle, one five frames before the
end, look, fix, look again. After every two or three scenes:

```bash
node scripts/look.mjs sheet 24 480 7 shots/sheet.png
FROM=240 TO=480 node scripts/look.mjs sheet 12 480 7 shots/sheet-b.png   # one section, denser
```

Checklist for the sheet, each item with your eyes: every cell reads as a still in 1.5
seconds; no text is clipped; neighbouring lines and panels do not touch; two adjacent cells
of one plate never look identical; cuts land where planned and do not eat the first frame
of a scene; nothing important sits in the outer 8 %; colour is not muddy; thin lines do not
crumble; the main event sits on its planned second; the last frame looks like an ending;
no two titles share the screen in the same place. A scene that fails "1.5 seconds" gets
redesigned, not decorated. An empty scene gets a bigger object or a closer camera, never more
detail; a busy close-up gets its decor dimmed around the subject. In a world film also shoot
the last frame of each plate next to the first frame of the next: nothing may jump.

Send the sheet to the user at these points with two sentences of status. Do not narrate
code.

## Step 5. Assets

Photos become posterized polygons, never pixels:

```bash
bash scripts/portrait.sh photo.jpg --levels 0.14,0.28,0.42,0.56,0.70,0.84 --height 900
node scripts/look.mjs shot <frame in the portrait scene> 1200 7
```

Look at `shots/portrait_preview.png` and at the rendered frame. Tune levels, blur, crop and
background threshold per `references/photo.md`. While the file is not yet in the folder, build
the scene on the synthetic placeholder that ships in the skeleton and say so.

## Step 6. Full sheet, render, build

```bash
node scripts/look.mjs sheet 24 480 7 shots/sheet.png      # look at it, fix, repeat
node scripts/render.mjs frames 7 1920 5                   # dir, seed, width, tabs
bash scripts/build.sh out.mp4                             # frames (+ track.wav) -> mp4
```

Verify from the file, not from the frames: `ffprobe` frame count equals the total from
`look.mjs info`, duration equals frames divided by 30, and a tile made from the MP4 matches
the sheet:

```bash
ffmpeg -i out.mp4 -vf "select='not(mod(n\,50))',scale=480:-1,tile=6x4" -frames:v 1 shots/out_sheet.png
```

Send the first MP4 to the user as soon as it exists, even with placeholders, and say what is
a placeholder.

## Step 7. Sound

`scripts/export-curves.mjs` writes `curves.json` from the page: plate starts, and in a world
film the speed and screen position of the line's head for every frame. `audio.mjs` takes its
timeline from it, so it never drifts from the picture (a page without `RISO.curves()` needs the
starts from `look.mjs info` copied into `T` by hand). Write one block of events per plate using
the cue map in `references/audio.md`; in a world film give the line or the character a voice
that follows the curves (`follow()`, `references/audio.md`, section 7). Then:

```bash
node scripts/export-curves.mjs curves.json
node audio.mjs track.wav
ffmpeg -i track.wav -filter_complex "showwavespic=s=1800x300:split_channels=1" -frames:v 1 shots/wave.png
bash scripts/build.sh out.mp4
```

You cannot listen, so read the waveform: no accidental silence inside active scenes, no
scene pinned to the ceiling. Whenever a scene length changes, regenerate the track.

## Step 8. Delivery

Deliver `out.mp4` (1920×1080, H.264, AAC, ~0.7 MB per second on noisy styles) and say how
to rebuild: `bash scripts/make.sh [photo.jpg] [seed] [width]`. Offer, do not impose:
another seed (a different impression of the same plates), a vertical cut
(`AR=9:16 node scripts/render.mjs frames-v 7 1080 5`, then check a sheet with `AR=9:16`; lower
titles sit at 70 % of the height there, `TITLE_Y`, clear of the platform's buttons),
a GIF for chats, a poster frame (`look.mjs shot <frame> 1920`), the HTML itself as a live
preview. Remove intermediate MP4s so one result remains.

## Changing things later

Insert a scene: add the plate, shorten another to keep the total, export the curves and
regenerate the track, reshoot the sheet. Seeds derive from plate names, so neighbours do not change.
Change a text: reshoot the frames that show it, check `fit`. Swap a photo: rerun
`portrait.sh`, reshoot the portrait scene. In a world film a retimed plate moves later plates
in time and the pen carries its end point over: reshoot the boundary frames
(`references/world.md`, section 9). Every change ends with a sheet and a rebuilt MP4.

## Reference files

- `references/questionnaire.md`: the brief, wording for both structured and plain-chat
  modes, the concept generator with worked examples.
- `references/styles.md`: twelve visual systems with palettes, motion language, signature
  objects, post-processing recipes and sound palettes.
- `references/guide.md`: the engine, helpers, timing grid, review protocol, render and
  encoding numbers, file layout.
- `references/world.md`: one continuous world for films without cuts: builders, the pen and
  its line, the keyed camera, the light layer, occlusion and dimming, spotlight, titles,
  review and changes, sound from the picture.
- `references/audio.md`: cue map, synthesis blocks, mastering, checks, voices that follow the
  picture.
- `references/photo.md`: photo to polygons, parameters, rendering and animation of portraits.
- `references/troubleshooting.md`: symptoms, causes, fixes, including environment traps.
- `assets/skeleton.html`: the starting file. `assets/world.html`: the starting file of a world
  film. `assets/audio-template.mjs`: the sound toolkit. `scripts/export-curves.mjs`: plate
  starts and per-frame curves for the sound.
- `../../examples/ris-tv/` in the repository: a finished 40-second video with eight plates,
  sound and a portrait pipeline, to read as a worked example.
