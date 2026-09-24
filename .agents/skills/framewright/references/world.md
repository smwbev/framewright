# One continuous world

Read before building a film without cuts. Everything here is implemented in `assets/world.html`;
`init.sh --world` scaffolds it as `index.html` with a two-plate demo that renders out of the box.
`examples/honeybee` in the repository is a finished 56-second film built this way.

## 1. When

A plate film cuts between pictures. A world film is one take: the camera never cuts, a line
never lifts, the viewer travels. Choose it when the logline is a journey or a growth: a line
that draws a life, a flight from a detail out to a landscape and back, a map that unrolls, a
machine assembled part by part. Keep plates for bulletins, parodies, lists and anything cut on
the beat.

The price: scenes stop being independent. A change early in the film moves everything after it
(section 9), and review happens by sections, not by plates.

## 2. Anatomy

Plates keep their lengths on the beat grid, but each one gets a builder, and all of them share
one draw function:

```js
plate('spark', {len: 2*BAR, build(W, {pen, b, R}) {
  pen.hold(b(1));                                  // b(x): the frame of beat x of this plate
  pen.along(ring, b(4), 'sio', {keep: 0.85});      // draw the ring, arrive on beat 4
  camKey(W, b(0), 0, 0, 34); camKey(W, b(8), 0, 0, 50);
  title(W, b(2), b(7.2), 'SMALL LINE', 'Big line');
}});                                               // the draw function defaults to drawWorld
```

`buildWorld(seed)` runs once per seed and is cached. It computes `W.start[name]` from the plate
lengths, runs the builders in order with one pen that carries over from plate to plate, sorts the
camera keys, cuts the line into drawing chunks and checks the titles. `drawWorld(S)` renders any
frame from `W` alone, so a frame stays a pure function of (frame, seed, width).

| builders append | how | drawn |
|---|---|---|
| the line | `pen` moves (section 3); a second line through `extraPen` | light layer |
| camera keys | `camKey` (section 4) | every frame |
| titles | `title` (section 7) | over everything |
| light events | `W.glows.push({f0, f1, draw(lg, f, k)})`: flashes, sparks, a glowing drop | light layer |
| decor | `W.sets.push({f0, f1, draw(g, f, k, cam)})`, may outlive its plate | under the light |
| hidden or fading parts of the line | `cover`, `dim` (section 5) | light layer |
| values over the whole film | functions on `W`: `W.spot(f)`, `W.headGlow(f)` | where used |

Time inside a builder is in beats: `b(1.5)` is one and a half beats into the plate, `b(8)` two
bars. Another plate's time is `W.at('name', beats)`. Never write global frame numbers. Randomness
comes from `R`, seeded by the plate name. `look.mjs info` prints the plates with their start
frames and the size of the world.

## 3. The line

The line is five arrays: `X, Y` in world units, `T` the frame at which the head passes the point,
`A` the memory floor (how bright a stroke stays after the head has passed, 0..1), `Wd` a width
multiplier. The pen writes them:

| call | does |
|---|---|
| `pen.along(pts, t1, ease, o)` | follow a polyline from the current point, arrive at frame `t1` |
| `pen.to(x, y, t1, ease, o)` | a straight stroke |
| `pen.bez(c1, c2, p, t1, ease, o)` | a cubic Bézier from the current point |
| `pen.hold(t1)` | stay still until `t1` |

Options: `keep` (the memory floor, a number or a function of the stroke fraction `u`), `width`
(the same), `step` (resampling step in world units: 0.5, or 1–2 for long flights seen from far),
`warp(u, x, y)` returning an offset (a tremble that grows toward the end, a wiggle). Eases: `sio`
(default), `io`, `in`, `out`, `sin`, `sout`, `lin`.

Points are resampled at a constant step and each point's time comes from the inverse of the ease,
so the head moves along the whole polyline with one ease however its vertices are spaced. `hold`
writes a point, so the head does not creep into the next stroke. A stroke that arrives before the
pen's current time means the previous stroke overran; the pen warns in the console and draws it
at once. `buildWorld` also warns when a plate's strokes run past the plate's end.

Drawing: the head at frame `f` is found by binary search in `T` and interpolated between two
points. The finished part is cached as `Path2D` chunks of 20 points; only the chunk that holds the
head is rebuilt per frame. Every chunk is stroked twice, a wide faint glow (9 px, alpha × 0.2) and
a bright core (2.3 px), with alpha `A + (1 − A)·exp(−age/τ)`, τ ≈ 75 frames: a fresh stroke
burns bright and settles to its floor. Floors: 0.15–0.35 for travel, 0.5–0.85 for strokes that
must stay readable. A 56-second film had 23 000 points in 1 150 chunks and 48 camera keys; a
1920 px frame with its PNG took 0.3 s.

## 4. The camera

`camKey(W, f, x, y, z, {w, lag, ox, oy, e})`: at frame `f` look at `(x, y)` with `z` world units
across the short side of the frame. Because `z` counts the short side, the same key frames the
same subject in 16:9 and 9:16.

- Between keys `x, y` follow the ease of the key you move toward, and `z` is interpolated in log
  space, so a zoom has an even pace. A linear `z` rushes at the close end and crawls at the far end.
- `w` (0..1) pulls the aim toward the head as it was `lag` frames ago, shifted by `ox, oy`.
  0.3–0.85 with a lag of 7–10 keeps a travelling head in frame and a little ahead of the centre.
  `w` blends between keys like everything else, so following fades in and out.
- The result is smoothed with a Gaussian over ±18 frames (σ = 6; `z` averaged in log space).
  Corners between keys become curves, starts and stops ease, and the camera settles on a key up to
  12 frames after it: put the key earlier when an event must be framed on its frame.
- To track a falling or thrown object, push a key every 4 frames along its trajectory with
  `e: 'lin'`; the smoothing does the rest.
- `k = SHORT / z` is logical px per world unit. Whatever must keep its size on screen through a
  zoom (line widths, dots, hairlines of decor, glow radii) is given in px and divided by `k`.
- Pace from a real film: a zoom of about ×2 per second reads as the world opening, ×5 per second
  and faster as a dive. A hold drifts at most 20 % of the frame per second.

Before the first key and after the last the camera stands still; with no keys it frames `z = SHORT`
around the origin.

## 5. Light

The line, the head and every glow are drawn in world coordinates on an offscreen canvas of the
frame's size, then added onto the picture twice with `lighter`: through `filter = blur(W/170 px)`
at alpha 0.85 (bloom), then sharp. Light adds to a dark picture and never muddies it; keep the
ground dark wherever light must read.

- The head: a soft dot of 20 px with a 5 px core, scaled by `W.headGlow(f)` (a breath before the
  first stroke, dimmer while a character sits on the head).
- Occlusion: `cover(W, f0, f1, cut)` hides everything the light layer holds from before the call.
  That older part of the line is drawn, `cut(lg, f, k)` erases it with `destination-out` (fill the
  shape of the lid, the wall, the fog, with the cover's opacity), then newer strokes are drawn on
  top. The visible lid itself is decor in `W.sets`. Glows drawn before the line are erased too.
- Dimming: `dim(W, i0, i1, f0, f1, to)` fades points `i0..i1` of the line to `to` of their
  brightness between frames `f0` and `f1`: a memory that fades, a broken part, a past that recedes.
  Take the indices from `W.path.X.length - 1` in the builder where that part begins and ends.
- Both add chunk breaks at their indices, so a hidden or dimmed range starts and ends exactly
  there. Use them rather than raw index ranges.

## 6. Decor and the spotlight

Decor is drawn in world coordinates under the light and culled with `viewRect(cam, k, margin)`.
Dots and hairlines get screen sizes (`px / k`), big objects world sizes.

In a close-up the set around the subject competes with it. Dim the decor with a spotlight measured
on screen: multiply its alpha by `spotlight(W, f, cam, k, x, y)`, which is 1 inside 30 % of the
radius and 0 beyond `W.spot(f) · LH`. About 0.6 in an intimate scene, 3 or more when the world
opens; animate `W.spot` with the story. Measured on screen, the pool keeps its size through a zoom.

Decor that must read at every zoom: grids of jittered dots at several scales (spacing ×4 per
scale), each shown only while its dots stand at least ~40 px apart on screen. The demo does this.
A film that travels through distinct places (a room, a house, a field) gives each place its own
decor at its own scale instead.

## 7. Titles

`title(W, f0, f1, small, big, o)`: a small letter-spaced line over a big one, in screen space, on
the baseline `TITLE_Y`: 80 % of the height in 16:9, 70 % in 9:16, because the bottom fifth of a
vertical video belongs to the platform's captions and buttons. `small` and `big` may be functions
of the frame (a counter). A title fades in over 14 frames, out over 16, rises 12 units, and shrinks
to fit 84 % of the width. Two titles in the same place at the same time read as one smudge: end
one before the next begins. `buildWorld` warns about overlaps, and `look.mjs` prints the warning.

## 8. Review

- Sheets per section, not only for the whole film:
  `FROM=480 TO=720 node scripts/look.mjs sheet 12 480 7 shots/sheet-part.png`. The whole sheet
  shows the story; a section sheet shows whether the camera stalls or jumps.
- At every plate boundary shoot the last frame of one plate and the first of the next: the line and
  the camera continue, nothing jumps.
- An empty scene is a scale problem. Bring the camera closer (smaller `z`) or make the object
  bigger; more detail makes a scene busier, not fuller.
- A busy close-up: lower `W.spot`, darken the set, before removing anything.
- `node scripts/check.mjs` before the full render: the world is cached per seed, and any state a
  builder or a draw function keeps outside `W` shows up there as a frame that changes with render
  order.
- The vertical cut loses the sides of the landscape frame and gains top and bottom. Render its own
  sheet with `AR=9:16`; if the subject leaves the frame, add `oy` or `w` on the keys of that
  section rather than a second camera.

## 9. Changing a world film

- Retiming a plate moves every later plate in time, not in space: builders count in `b()`, so
  their strokes keep their shapes.
- The pen carries over. A plate that starts with a relative move (`pen.x + 40`) starts wherever the
  previous one ended; one that goes to absolute world points does not care. Anchor each plate's
  key moments to world points.
- Inserting a plate changes the first stroke of the next one: reshoot its first frames.
- Randomness stays per plate name; world-wide decor is seeded on its own.
- After any change: the section sheet, the boundary frames, then curves and sound regenerated
  (`make.sh` exports the curves before `audio.mjs`).

## 10. Sound from the picture

The world knows where the head is and how fast it moves on screen, so the sound can follow the
picture instead of a hand-written cue list. `RISO.curves()` returns plate starts and per-frame
values (`sp` head speed in px per frame, `pan` head position −1..1, `z`);
`scripts/export-curves.mjs` writes them to `curves.json`; `audio.mjs` takes its timeline from
there and drives a voice with `follow()`. Recipes: `references/audio.md`, section 7.
