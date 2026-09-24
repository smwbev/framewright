<h1 align="center">framewright</h1>

<p align="center">
  <a href="https://github.com/smwbev/framewright/releases"><img src="https://img.shields.io/badge/version-1.1.0-08C?style=flat" alt="Version 1.1.0" /></a>
  <a href="https://agentskills.io"><img src="https://img.shields.io/badge/agent%20skill-agentskills.io-08C?style=flat" alt="Follows the Agent Skills specification" /></a>
  <a href="https://agents.md"><img src="https://img.shields.io/badge/AGENTS.md-ready-08C?style=flat" alt="Ships an AGENTS.md" /></a>
  <img src="https://img.shields.io/badge/agents-Claude%20Code%20%C2%B7%20Codex%20%C2%B7%20Gemini%20CLI%20%C2%B7%20Cursor-4493F8?style=flat" alt="Works with Claude Code, Codex, Gemini CLI, Cursor and more" />
  <img src="https://img.shields.io/badge/node-%E2%89%A5%2020-4493F8?style=flat" alt="Requires Node 20 or newer" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-08C?style=flat" alt="MIT License" /></a>
</p>

<p align="center">
  <sub><a href="README.ru.md">Русский</a></sub>
</p>

<p align="center">
  <strong>An agent skill and a project template for short videos made entirely from code.</strong><br/>
  One HTML file. Every frame is a pure function of <em>(frame number, seed, width)</em>.<br/>
  Rendered with headless Chrome, assembled with ffmpeg, scored by a script. No footage, no images, no CDN.
</p>

---

<p align="center">
  <img src="examples/ris-tv/preview.webp" alt="Preview of the RIS TV example: TV powers on, test card, countdown, teletext, oscilloscope" width="720" />
</p>

<p align="center">
  <img src="examples/ris-tv/contact-sheet.jpg" alt="Contact sheet of all eight scenes of the example" width="960" />
</p>

<p align="center"><sub>The example: 40 seconds, 8 scenes, 1200 frames, one 45 KB HTML file. The portrait scene in the public example uses a synthetic placeholder. Full MP4 with sound: <a href="https://github.com/smwbev/framewright/releases/download/v1.0.0/ris-tv-sample.mp4">ris-tv-sample.mp4</a> (27 MB).</sub></p>

## What it does

You describe the video you want. The agent runs a short interactive brief, proposes three
concepts (a literal one, a metaphor, a genre parody), agrees a storyboard on a beat grid,
then builds the video scene by scene, looking at rendered frames after every step. It renders
the frames, synthesizes a soundtrack to the locked scene lengths, assembles the MP4 and
checks the file. Photos become posterized polygons, never pixels. Every step has a visual
checkpoint and a rule against guessing.

For a film without cuts it builds one continuous world instead of separate scenes: a line that
remembers when each of its points was drawn, a camera on keyframes with even zooms and smooth
following, a light layer with bloom, and a soundtrack that follows the line's speed and position
on screen.

| Step | What the agent does | What you see |
|---|---|---|
| 0 | checks node, ffmpeg, Chrome, python; offers to install what is missing | a short report |
| 1 | the brief: message, format, length, tone, style, assets, sound, deliverables | 8–11 questions with defaults |
| 2 | three concepts with palette, key scenes, ending, sound and risk | a table and a recommendation |
| 3 | storyboard in bars, scaffold from the skeleton, first frame | one "go" |
| 4 | one scene at a time, three frames per scene, a contact sheet every 2–3 scenes | contact sheets |
| 5 | photos traced into polygons, placeholders until files arrive | a portrait preview |
| 6 | full contact sheet, render in parallel tabs, encode, verify from the MP4 | a preview MP4 |
| 7 | soundtrack synthesized to the cue map, MP4 rebuilt | the final MP4 |
| 8 | variations on request: another seed, vertical cut, GIF, poster frame | files |

## Quick start

### Option 1: clone and run your agent inside

```bash
git clone https://github.com/smwbev/framewright my-video
cd my-video
npm install
claude        # or: codex, gemini, cursor, opencode ...
```

Then say what you want, for example: *"a 20-second deadpan video asking Anna when the
release ships, retro TV style"*. The agent picks up `AGENTS.md`, loads the skill and starts
with the brief.

### Option 2: add the skill to your own project

```bash
npx skills add smwbev/framewright          # installs into the agents you choose
gemini skills install https://github.com/smwbev/framewright --path .agents/skills/framewright --consent   # Gemini CLI
```

Or copy `.agents/skills/framewright` into your project. Claude Code reads
`.claude/skills/`, so add a symlink or copy there.

## Supported agents

| Agent | How it picks the skill up |
|---|---|
| Claude Code | `.claude/skills/framewright` (symlink to the skill); `CLAUDE.md` imports `AGENTS.md`; invoke with `/framewright` |
| OpenAI Codex | reads `AGENTS.md` and `.agents/skills/` natively; `$framewright` |
| Gemini CLI | `.gemini/settings.json` points at `AGENTS.md`; skills from `.agents/skills/` |
| Cursor | `AGENTS.md` and `.agents/skills/` natively |
| GitHub Copilot coding agent | `AGENTS.md` and `.agents/skills/` natively |
| OpenCode, Amp, Zed, Warp, Factory, Cline, Roo, Windsurf | `AGENTS.md`; most read `.agents/skills/` too |
| anything else | point it at `.agents/skills/framewright/SKILL.md` |

The skill follows the [Agent Skills](https://agentskills.io) specification: `SKILL.md` with
frontmatter, `references/` loaded on demand, `scripts/` and `assets/`.

## Requirements

Node 20+, npm, ffmpeg with libx264, Chrome via Puppeteer (installed by `npm install`).
Python 3 with numpy, scipy and Pillow only if a photo will be traced. macOS and Linux;
Windows through WSL.

```bash
bash .agents/skills/framewright/scripts/doctor.sh            # report
bash .agents/skills/framewright/scripts/doctor.sh --install  # install what is missing, asks first
```

## Repository layout

```
AGENTS.md                      entry point for agents
CLAUDE.md, GEMINI.md           one-line imports of AGENTS.md
.gemini/settings.json          Gemini CLI reads AGENTS.md
.agents/skills/framewright/
  SKILL.md                     the workflow
  references/                  questionnaire and concept generator, styles, engine guide, one-world films, audio, photo, troubleshooting
  scripts/                     doctor, init, look, render, build, make, export-curves, trace, inject, portrait
  assets/                      skeleton.html, world.html, audio-template.mjs, storyboard.md
.claude/skills/framewright     symlink for Claude Code
examples/ris-tv/               a finished video: index.html, audio.mjs, previews
```

## The example

`examples/ris-tv` is a complete 40-second video in the retro TV style: the set powers on,
snow and NO SIGNAL, a test card with a day counter, a countdown that breaks, two teletext
pages with the question, an oscilloscope tracing a paperclip, a portrait that locks in, and
the tube switching off. Render a contact sheet of it:

```bash
npm install
npm run example        # writes shots/example-sheet.png
```

Or render the whole thing: `HTML=examples/ris-tv/index.html node .agents/skills/framewright/scripts/render.mjs frames 7 1920 5`,
then `cd examples/ris-tv && node audio.mjs ../../track.wav`, then `bash .agents/skills/framewright/scripts/build.sh out.mp4`.

## Making videos by hand

The skill is also a manual. `references/guide.md` explains the engine, the helpers, the
timing grid and the review protocol; `references/styles.md` catalogues twelve visual systems
with post-processing recipes; `references/world.md` covers films made as one continuous world;
`references/audio.md` and `references/photo.md` cover sound and portraits.
`assets/skeleton.html` and `assets/world.html` are working starting points: open one in a
browser for a live preview, add `?f=30&w=1200` for a single frame, `?grid=24` for a contact sheet.

## License

MIT. Videos you make with it are yours.
