# One line

A finished framewright film made in one take: the life of a worker bee over 40 days, drawn by one
continuous golden line that never lifts. 56 seconds, 16:9 with a vertical cut, 1680 frames at
30 fps, 90 BPM, one 57 KB HTML file, a soundtrack driven by the line. Titles and code comments
are in Russian.

| # | plate | bars | what happens |
|---|---|---|---|
| 1 | egg | 2 | a golden dot breathes in the warm dark; a line leaves it and draws a hexagonal cell |
| 2 | larva | 2 | inside the cell the line coils into a growing spiral; drops of food arrive on the beats |
| 3 | cap | 2 | the line weaves a wax cap, a pupa shows through, the cap cracks and the bee walks out: "Day 1 · Birth" |
| 4 | comb | 3 | the camera pulls back to the comb; one role per bar: nurse, builder, guard |
| 5 | out | 2 | the line leaves through the entrance; the hive stands in a dawn landscape; orientation arcs: "Day 21 · Forager" |
| 6 | meadow | 3 | loops over the meadow, each one opens into a flower; a day counter runs from 22 to 39; the sun crosses the sky |
| 7 | dance | 2 | back in the dark hive, a figure-eight waggle dance points at the sun |
| 8 | last | 2 | sunset, "Day 40"; the line rises in a long arc over the hive, thins, trembles and stops |
| 9 | drop | 3 | the last point becomes a drop of honey and falls into its cell: "In 40 days of life · 1/12 of a teaspoon of honey"; in the next cell a new dot starts a new line |

The film is the one-world method of `references/world.md` at full scale; it was written first,
and `assets/world.html` generalizes its engine. What to read in `index.html`:

- one world for the whole film: a cell inside the comb, the comb inside the hive, the hive in a
  meadow under a sky that follows the time of day;
- plates are builders that append to one line with a draw time, a memory floor and a width per
  point; the head is found by binary search, the finished line is cached in `Path2D` chunks;
- camera keys with log-space zoom, following of the head and Gaussian smoothing; a dive into the
  comb tracked with a key every four frames;
- a light layer with bloom; the wax cap hides part of the line through `destination-out`; parts
  of the line dim over time;
- in the close-ups the comb is dimmed around the subject by a spotlight measured on screen;
- titles at 80 % of the height, 70 % in the vertical cut;
- `RISO.curves()` exports the head's speed and screen position per frame, and `audio.mjs` turns
  them into the bee's buzz and the line's tone.

The API is a little older than the skeleton: builders take `(W, pen, t0, R)` and the wax cap is a
special case inside `drawWorld` instead of `cover()`.

Render it from the repository root:

```bash
npm install
HTML=examples/honeybee/index.html node .agents/skills/framewright/scripts/look.mjs sheet 24 480 7 shots/honeybee.png
HTML=examples/honeybee/index.html node .agents/skills/framewright/scripts/check.mjs
HTML=examples/honeybee/index.html node .agents/skills/framewright/scripts/render.mjs frames 7 1920 5
( cd examples/honeybee && node ../../.agents/skills/framewright/scripts/export-curves.mjs curves.json && node audio.mjs ../../track.wav )
bash .agents/skills/framewright/scripts/build.sh out.mp4
```

The vertical cut: `AR=9:16` in front of the render with width 1080 into `frames-v`, then
`bash .agents/skills/framewright/scripts/build.sh out-vertical.mp4 frames-v`. Or open
`index.html` in a browser for a live preview; `?f=1425&w=1200` shows the poster frame.
