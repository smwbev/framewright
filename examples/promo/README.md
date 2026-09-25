# framewright promo

The skill's own promo, made with the skill: 24 seconds at 30 fps and 120 BPM, 720 frames, one HTML
file, a synthesized soundtrack. Square by default (1080×1080, for X), 16:9 with `AR=16:9`.

| time | plate | what happens |
|---|---|---|
| 0–1.5 s | hook | the finished lake painting, alive, under "This whole video is code."; from 1 s it rewinds back to blank paper |
| 1.5–3.5 s | prompt | "You describe it." A prompt types itself into an agent window |
| 3.5–11 s | paint | the painting plays from paper: pencil islands, oil colour rising through them, life; "Not a video model. Just code." |
| 11–19 s | montage | the beat drops; eight style cards, one per two beats: Retro TV, Risograph, Terminal, Blueprint, Neon grid, Pixel game, Oscilloscope, Newspaper |
| 19–21 s | stats | "1 HTML file. 0 video editors. 0 stock footage." on three beats |
| 21–24 s | end | the name, the install command, the agents it works with |

What to read in `index.html`:

- the Lake at dawn painting from `examples/lake-dawn`, run on its own clock: the kit reads its cues
  through `pcue()` (fixed painting frames), and `paintAt(S, localFrame)` draws any moment of it, so the
  hook shows it alive at frame 0, the rewind plays it backwards and the middle plays it from paper;
- the promo block: captions on plates that pop in, the rewind, the prompt box, the style cards, the
  numbers, the end card; everything laid out for a 1080-wide square and centred by `OX` in wider frames;
- the first frame is a finished picture with the hook, because X shows it before the video plays.

`audio.mjs` builds the track from `nature.mjs` helpers and a few instruments of its own (kick,
snare, hats, bass, plucks, pads, impacts, risers, key clicks): lapping and birds over the lake, a tape
rewind, keys under the prompt, a pencil, a riser into the drop, one sound per style card, three impacts
on the numbers, a final chord. It is mastered to −14 LUFS for social video.

Render it from the repository root:

```bash
mkdir -p /tmp/promo && cp examples/promo/*.html examples/promo/*.mjs /tmp/promo/ && cd /tmp/promo
bash <repo>/.agents/skills/framewright/scripts/init.sh . && ln -s <repo>/node_modules node_modules   # keeps index.html and audio.mjs
node scripts/check.mjs
node scripts/render.mjs frames 7 1080 5            # square; AR=16:9 node scripts/render.mjs frames 7 1920 5 for the wide cut
node scripts/export-curves.mjs curves.json && node audio.mjs track.wav
bash scripts/build.sh out.mp4
```

Frames, curves, WAV and MP4 stay out of git.
