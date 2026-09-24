# framewright

This repository is two things at once: a template project for a short procedural video and
an agent skill that knows how to make one. A video here is a single self-contained HTML file
in which every frame is a pure function of (frame number, seed, output width). Frames are
rendered in headless Chrome, assembled with ffmpeg, and the soundtrack is synthesized in a
script. No footage, no image files, no CDN.

## Start here

1. Read `.agents/skills/framewright/SKILL.md` and follow it step by step. It is the whole
   workflow: environment check, interactive brief, three concepts, storyboard, scaffold,
   scene-by-scene build with visual checks, render, sound, delivery.
   Claude Code loads it as the `framewright` skill (`/framewright`). Codex, Gemini CLI,
   Cursor, Copilot and OpenCode read `.agents/skills/` natively. Any other agent: open the
   file and read it.
2. Run `bash .agents/skills/framewright/scripts/doctor.sh`. If it reports missing tools,
   tell the user what would be installed, get a yes, then run it with `--install`.
3. Ask the brief before writing any video code. Propose three concepts. Get a pick. Only
   then scaffold.

## Repository map

```
AGENTS.md                         this file, read by most agents
CLAUDE.md, GEMINI.md              one-line imports of this file for Claude Code and Gemini CLI
.gemini/settings.json             tells Gemini CLI to read AGENTS.md
.agents/skills/framewright/       the skill: SKILL.md, references/, scripts/, assets/
.claude/skills/framewright        symlink to the skill for Claude Code
examples/ris-tv/                  a finished 40-second video: index.html, audio.mjs, previews
package.json                      npm scripts and the puppeteer dependency for this folder
```

After `bash .agents/skills/framewright/scripts/init.sh` the working files appear in the
root: `index.html`, `audio.mjs`, `storyboard.md`, `scripts/`. That is where the video is
built when the user works inside this clone.

## Rules for every agent

- Never put image, video or font files, base64 or CDN links into the HTML. Polygons traced
  from a photo by `scripts/trace.py` are data and are allowed.
- Verify by rendering frames and looking at them (`node scripts/look.mjs shot ...`,
  `... sheet ...`). Never conclude from reading code that a frame looks right.
- Build one scene at a time. A contact sheet of the whole video comes before the full
  render.
- Scene lengths are multiples of the beat. Sound is written last, to the locked lengths.
- Keep helpers above the plates block in `index.html`.
- Never commit `frames/`, `shots/`, `*.mp4`, `*.wav`, `portrait.js`, `curves.json` or the user's photos.
  The `.gitignore` already excludes them; do not weaken it.
- Ask before installing system packages. Ask before publishing anything that shows a real
  person.

## Commands

```bash
bash .agents/skills/framewright/scripts/doctor.sh [--install]   # toolchain
bash .agents/skills/framewright/scripts/init.sh                 # scaffold index.html, scripts/, audio.mjs
bash .agents/skills/framewright/scripts/init.sh --world         # the same for a film without cuts (one continuous world)
npm install                                                     # puppeteer
node scripts/look.mjs shot 0,30,60 1200 7                       # frames to look at
node scripts/look.mjs sheet 24 480 7 shots/sheet.png            # contact sheet
node scripts/render.mjs frames 7 1920 5 && bash scripts/build.sh out.mp4
bash scripts/make.sh [photo.jpg]                                # portrait, audio, render, build in one go
```

## The example

`examples/ris-tv/index.html` is a complete video in the retro TV style: power-on, test
card, a countdown that breaks, two teletext pages, an oscilloscope, a portrait that locks in,
power-off. Read it as a worked example of plates, helpers, transitions and post-processing.
Its portrait block holds a synthetic placeholder; real projects generate that block from a
photo. Render it with
`HTML=examples/ris-tv/index.html node .agents/skills/framewright/scripts/look.mjs sheet 24 480 7 shots/example.png`.
