# Painting films

Read before building a film in styles 13-16 (`references/styles.md`). The painting kit (sections 3-8, 10 and
11) is implemented in `assets/painting.html`, with a demo scene: a calm lake with a drifting cloud band,
glitter and reeds. `init.sh --painting` scaffolds it as `index.html`, and the demo renders out of the box.
`examples/lake-dawn` in the repository is a finished 15-second film built this way: a mountain lake at
sunrise that is drawn, painted and brought to life; its scene adds foliage tufts, birds, mist and a boat.
The surf in section 9 is a recipe with no code here: write it in the scene block on `field`, `gens`,
`stagger` and `dabFast`.

## 1. What a painting film is

One still oil painting, built once per (seed, width) from cached layers of brush marks. The film shows it
in three media without a cut: a sepia pencil drawing computed from the painting appears on paper, the paint
washes in over the drawing, and the finished painting comes alive while the camera pushes in. The eye never
re-reads the composition; it watches the medium change.

Plates are chapters of time, not pictures. Every plate calls one function, `drawPainting(S)`, which reads the
moment from the cues and draws the same painting in the state that moment asks for. Plates keep the beat grid
and give the cues a place; all of them have `cutIn: false, cutOut: false`.

The page is the plate skeleton's engine with two blocks above the plates: the painting kit (between
`/* ===== painting kit ===== */` and `/* ===== end painting kit ===== */`), which knows nothing about the
view, and the scene (`/* ===== scene ===== */` to `/* ===== end scene ===== */`), which is data and builders
for one view. A new film replaces the scene block and keeps the kit.

## 2. When

Choose it when the message is a place, a memory, a season, a quiet thank-you, or a thing becoming real (a
sketch that turns into the finished picture). The reward beat, the moment the painting starts to move, carries
the film; the rest is the living painting and a slow push-in.

Keep other styles for text-heavy films, jokes, lists and anything cut on the beat. A painting film has one
view and room for one title, not a sequence of messages.

The price: the painting must hold a close look for ten seconds, so the scene takes most of the work (the
example's scene is 280 lines and about 70 k marks), and the first frame of each render tab builds for
1.3-1.6 s at 1920.

## 3. The scene contract

`SCENE` is one object the kit reads. Geometry is in logical px (short side 1080); the example keeps its lines
as fractions of the 16:9 frame and converts them with `toL`.

| field | what |
|---|---|
| `horizon` | y of the horizon as a fraction of the height: `depth(y)` is 0 there and 1 at the bottom, `persp(y) = 0.4 + 0.8 depth(y)` scales marks and speeds |
| `tRef` | the film time (s) the still's live hooks see; 0 unless a hook draws something at rest that depends on time |
| `layers` | back to front, the table below |
| `prepare(K)` | optional: shared data built once before the layers (sprite lists, reed lists, fields), kept on `K` |
| `after(K)` | optional: parts and sprites cut from the built layers (`K.L`), for a character that moves in pieces |
| `sketch(K)` | optional: the scene's own drawing as a cached layer, used instead of `pencilOf(still)` (a traced sketch, section 6) |
| `pencil` | `{v, blur, gain(x, y), o}`: a per-region pencil gain on the 1/4-resolution grid, blurred by `blur` cells; `o` overrides `PENCIL` |
| `reveal` | `{v, blur, settle, sketch, colour, offset: {sketch(x, y), colour(x, y)}}`, merged over `REVEAL` per key, `colour.finish` too: `{colour: {finish: {kmax: 0.15}}}` keeps the other finish values |
| `life`, `camera`, `wind` | `{ramp}`, `{cue, rate, ease, focus}` and the gust parameters: override `LIFE` |
| `curves(K, f, tau, life)` | extra per-frame fields for the sound |

A layer record:

| field | what |
|---|---|
| `name` | the cache's name and the seed of its generator |
| `rect()` | its logical rectangle; wider than the frame when it drifts |
| `paint(g, R, K, parts)` | the builder: draws once into the layer's own cache with the generator `R` |
| `parts` | `[{rect(), drift(tau, life)}]`: extra canvases painted in the same pass with the same generator, each moving on its own (cloud marks that drift over a sky that does not); the still is unchanged |
| `drift(tau, life)` | a rigid shift `[dx, dy]` |
| `flow(tau, life)` | an affine `[a, b, c, d, e, f]` in logical px, or pieces `[[y0, y1, A, x0, x1], ...]`, each clipped to its band on whole device rows: a drift that grows with depth, with no seam (keep the pieces continuous at their edges) |
| `alpha(tau, life)` | opacity; `alpha: tau => tau > 0 ? 0 : 1` hides a layer that its live hook redraws |
| `clip` | a polygon that the layer and its live hook are clipped to |
| `live(g, K, tau, life, t)` | drawn every frame after the cache: marks that move |

A layer with only `live` has no cache (birds, front reeds, foliage sprites). `drawLayer` applies a record's
drift, flow and alpha; `composeLive(g, K, tau, life, t)` draws every layer in order with its live hook. Every
drift, flow, alpha and live hook must be the identity at `tau = 0`: that is what makes the still and the first
living frame agree (section 11). `kit(seed, W)` builds `K`: `K.L[name]` the layer caches, `K.still` =
`composeLive(g, K, 0, 0, tRef)`, and on first use `K.R`, the drawing and the reveal fields (`reveals(K)`).

`drawPainting(S)` sets the camera, then draws by phase: before `wash` the paper (`paperOf`, with fibre from
`fibreField`) and the drawing through its time field; from `wash` the whole drawing and the still through the
colour field and its cap; from `done` the living layers, with the still on opaque paper (`stillOnPaper`) over
them fading out until `alive`. The kit draws no titles. A plate that needs one calls `drawPainting(S)`,
resets the transform (`S.g.setTransform(S.sc, 0, 0, S.sc, 0, 0)`; the camera is still on the context) and
draws the title on `TITLE_Y`.

## 4. Cues and the timeline

| cue | frame | picture |
|---|---|---|
| (start) | f0 | blank paper with its fibre |
| `marks` | f6 | the first pencil islands, along the top edge |
| | f30, f45, f54 | the drawing 50 % and 95 % uncovered, then complete; a short hold |
| `wash` | f60 | colour blooms start, bottom first, capped at 65 %: milky colour with the pencil showing |
| `finish` | f73 | the cap rises toward 0.9; early blooms fuller than late ones |
| `step` | f87 | the cap steps by 0.10 in one frame; per-point ceilings open, early areas first |
| `done` | f98 | paint complete; the still dissolves into its living layers at rest |
| `alive` | f105 | life ramps in over 8 frames |
| `push` | f110 | the camera push-in starts, with a 27-frame ease |

Plates on the 120 BPM grid: `sketch` 4 beats (f0-59), `colour` 3 beats (f60-104), `alive` the rest. The
`CUES` rows use fractional beats: `['sketch', 0.4, 'marks']`, `['colour', 0, 'wash']`, `['colour', 13/15,
'finish']`, `['colour', 27/15, 'step']`, `['colour', 38/15, 'done']`, `['alive', 0, 'alive']`, `['alive',
1/3, 'push']`. Scene cues (the example's `birds`) go into the same table.

The default reveal takes 3.5 s whatever the film's length; the living phase takes the rest. Films of
10-20 s keep the default. The time fields are in frames and tuned to these cues, so a stretched reveal moves
both. For a factor k on a phase: in `SCENE.reveal.sketch` multiply `t0, ax, ay, sigma, hw, top[0]` and
every value of `lo` except `lo[3]` (a height) by k; in `SCENE.reveal.colour` map every frame value T (`t0`,
both values of `lo` and both of `hi`) to `wash + k (T - 60)`, multiply `ax, ay, sigma, hw` and
`finish.ceil[1], ceil[2], ceil[4]` by k and divide `finish.creep` by k. A cue that only shifts moves `t0`
and both values of `lo` and `hi` by the same number of frames. Each of `lo` and `hi` is a [knee, limit]
pair and its softness is their distance: a knee moved without its limit softens the floor, so a wash moved
from f60 to f70 with `lo: [76, 61]` instead of `[76, 71]` opens a batch of blooms on f70 at once. Keep
`hi[1] + hw` at or below `done` − 1 so every point finishes before `done`. Then shoot the reveal sheet
(section 13).

## 5. Marks

Paint the way a painter works: a base coat, then marks region by region from back to front, then accents.

- `fieldFill(g, rect, fn, cell)`: a base coat from a colour function sampled every `cell` px and smoothed by
  the upscale. `gridField(xs, ys, rows)` makes such a function from a coarse grid of colours, `ramp(stops)`
  from stops along one value. Colours are `[r, g, b]` arrays: `C`, `css`, `mixc`, `hsl`, `jit`, `pickPal`.
- `field(name, deps, build)`, `fAt(F, x, y)`, `blurField(F, r)`: scalar fields on a 1/4-resolution grid
  (4-px cells), cached by name and inputs, read bilinearly: a distance to the shore, a wave phase, a gain.
- `dab(g, x, y, len, wid, ang, col, R, o)`: a bent, tapered quad with rounded ends, its colour jittered in
  HSL (hue ±4°, saturation ±6 %, lightness ±5 %). `o.imp`: impasto ridges, a lit edge 12 % lighter on the
  side facing the upper left and a dark edge 15 % darker on the other (alphas 0.34 and 0.24; at 0.5 and 0.35
  every dab reads as an outlined pebble). `o.ridgeP`: the share of dabs that get ridges. `o.br`: 3-5 bristle
  hairlines inside the dab, `o.brP` their share. `o.rag`: ragged knife edges. Also `bend`, `taper`, `alpha`,
  `jit`.
- `blade(g, x, y, len, w0, ang, bend, col, o)`: a grass or reed blade, a tapered quadratic curve from its
  root, the tip bent `bend` further; `o.lit` a thin lighter edge.
- `limbSamples(L, w0, w1, step, wobble)` and `fillLimb(g, S, col, k, off)`: a tapered branch along a
  centreline. The samples carry normals for bark marks, lenticels and a shadow band.
- `paintRegion(g, R, r, seed)`: a jittered grid of dabs at `cover` times full coverage (default 2) inside a
  polygon. Angle: `flow` plus low-frequency noise, ±`angJit` (10°). Colour: `r.col(x, y, v, R)`, `v` a
  cluster noise over `cluster` px (60-150: patches of one colour, not confetti). Sizes times `persp(y)` with
  `persp: true`. A share `spill` (0.2) of the dabs is left unclipped so borders stay painterly. Then
  `accents` and `lights`: `{share, len, wid, dl or col, alpha}`.

The example's marks for scale: sky 26-64 × 9-17 px at cover 1.5; far ridges 18-40 × 6-11; conifer slopes
vertical 10-22 × 4-8 at cover 2.8; water in rows of 24-70 × 2.6-5.5 px times `persp`.

**The drawing needs sparse dark accents.** The pencil turns local contrast into ink. Even, same-size dabs give
a grey fog: in a test on open water, a median sketch luma of 209 and 0.1 % of pixels below 150, where a drawing
that reads as pencil has about 220 and 3-12 %. Lay 3-5 % of each region as thin dark marks 30-60 levels darker
than their surroundings (troughs, shadow sides, twigs, gaps between blades), for example `accents: {share:
0.04, len: [8, 22], wid: [1.5, 3], dl: -0.14}`. Keep ridges faint in the sky and in open water: they become
ink. Give the focal object a dark skeleton: a tree whose limbs hide under even foliage draws as a grey puff.

Randomness comes only from the builder's `R` or `rng(hash(seed, name, ...))`, geometry is in logical units,
and a builder never draws into a pooled canvas.

## 6. The drawing

`pencilOf(K, src, o)` is a pencil filter of the painting, cached next to it (same rect, same 1.14× scale). It
works on luma Y and the dodge ratio D = Y / blur(Y): 1 on flat paint, below 1 in a mark darker than its
surroundings, above 1 on a highlight.

- Marks: v = D(σ 8)^1.8 · D(σ 2)^1.2 · D(σ 1)^0.8, σ in logical px. σ 8 draws a mark's body, σ 2 its
  edges as crisp lines, σ 1 its ridges and bristles as grain.
- Ink = (1 − v) · gain where v < 1, so the gaps between marks stay at paper. Where v > 1 a highlight lifts
  above the paper by 0.35 (v − 1), at most 0.05 (about 10 levels).
- Tone: darker paint adds a grained shade (1 − L^0.05) · 1.8 · gain on the 60 % of pixels that a paper-tooth
  grain (cells 2 × 1.2 px) catches, so dark areas read as a pencil wash with paper specks, not a grey veil.
- A linear ramp from ink `#30281D` to paper `#F2EBDC`, plus the paper's fibre (±1.5 levels, fibres 15-45 px).

`PENCIL` holds these defaults; `SCENE.pencil.o` overrides them. `SCENE.pencil.gain(x, y)` scales the ink per
region, 1.05-1.4 (the example: sky 1.28, land 1.25, reeds 1.3, water 1.08). The gain scales ink only; the
marks decide where it goes. A gain below 1 loses the thin dark lines that carry a drawing first: a tree drawn
at 0.85 lost its skeleton.

Computed, not drawn: the colour lands exactly on its own lines, and a change to the painting changes the
drawing with it. Look at the drawing alone before timing any reveal (section 13).

A film can start from someone's drawing instead. Trace the sketch into polygons by a script (ink levels as
even-odd paths and the silhouette: data, not an image), paint the subject from those polygons (a flat recolour,
then short marks sampled from it that run along the strokes, then the darkest ink again), and give the scene a
`sketch(K)` that draws the kit's pencil of everything else and the traced lines over clean paper on the subject.
The drawing phase then shows that sketch, and the colour lands on it. A subject that moves in parts (a head, a
tail) is cut in `after(K)`; a bend without a second pose is a mesh warp of the subject's cache (a grid of
triangles, each an affine map of its piece, vertices moved by a weight times the head's rigid motion, the least
moved drawn first) rather than a cut-out head, which leaves holes. A pose the sketch cannot reach stays out of
the story: a seated animal lowers its head about a quarter of the frame, not to the floor.

## 7. Reveals

Two time fields on the 1/4-resolution grid give, per point, the frame at which the drawing (`Ts`) and the
colour (`Tc`) arrive. `timeField(name, seed, o)`:

    T(x, y) = t0 + ax·x + ay·y + sigma·N(x, y)

x and y are normalised; N is an fBm of three octaves (cells c, c/2, c/4 with c = `cell` of the width,
amplitudes `oct`, each lattice rotated by `rot`) with its best-fit plane removed and unit std. Without the
detrend a seeded fBm carries a random slope that bends the reveal's direction per seed. Without the rotation
an axis-aligned late tongue shows as a straight ghost stripe. Soft floors and ceilings `lo`, `hi` ([knee,
limit], tanh) keep the paper blank until `marks`, keep colour out before `wash`, and finish every point by
`done` − 1, so the switch at `done` shows no step.

`maskAt(slot, F, f, o)` thresholds a field at frame f: alpha = smoothstep(T − hw, T + hw, f) · cap, then an
optional 3×3 box blur, into a pooled 1/4-resolution canvas rewritten every frame. `through(g, src, M, slot,
d)` draws a cache through it under the camera. `revealFields(seed)` builds the fields without pixels.

Defaults (`REVEAL`):
- Drawing: T = 9.7 + 14.2x + 25.8y frames, sigma 3.2, cell 0.08, hw 1.25 (2.5 frames per point). A diagonal
  from the top left, sky first. Coverage 5 / 50 / 95 % at f15 / f30 / f45, feather about 33 px, about 30
  separate islands.
- Colour: T = 86.3 + 3.2x − 15.3y frames, sigma 6.2, cell 0.10, hw 4, one blur. Bottom first, against the
  drawing's direction: the drawing comes down from the sky, the colour rises from the ground. Feather 150-250
  px: blooms, not a sweep. The first blooms are separate islands (4-8 by f69).

The top-edge islands: `top: [frames, band, cell, thr, soft]` brings the top edge `frames` earlier, fading
over `band` of the height; with `cell` (a fraction of the width) a value noise gates it along x, so the edge
opens as a few separate drips, not a strip. A floor that rises below the band (`lo[2..4]`: `lo[2]` frames per
frame height below y = `lo[3]`, at most `lo[4]`) keeps the rest from opening first. Without them the first ink
lands wherever the noise dips, often on a side edge. The example: `top: [3.5, 0.06, 0.05, 0.05, 0.3]`, `lo:
[8.5, 6.5, 100, 0.04, 3.5]`.

The two-stage colour cap (`finishOf`): blooms stop at 0.65, the painting over the drawing with the pencil
showing through; this milky moment is the most painterly of the film. From `finish` the base cap rises by
0.25 to `done`, with a step of 0.10 at `step`. Per point the cap creeps with age (0.003 per frame, at most
0.3) under a ceiling of 0.9 that opens to 1 over 2 frames between `step` + 5 and `done` − 3, earlier where the
colour came earlier. The lines vanish as the paint reaches 1. A settling glaze (`settle` 0.105, `desat`) pulls
saturation 10 % toward grey from `finish` and lets go between `done` and `alive`.

Offsets: `SCENE.reveal.offset.sketch(x, y)` and `.colour(x, y)` add frames per region before the knees,
blurred by `SCENE.reveal.blur` cells: the glow around the sun earlier, a tree later, the far water left in
pencil a little longer. They tilt the ramp; refit `ay` so the overall direction stays. Change `v` with them.

Style 15 holds the plateau: place `finish`, `step` and `done` after the frames that show it and set
`colour.finish.kmax` to about 0.15, so blooms stop at 0.65 and creep to about 0.8.

A reveal with too little noise against its ramp reads as a wipe. Keep sigma at 3 frames or more for the
drawing and 6 for the colour, and feathers of 25-60 px and 120-260 px.

## 8. Life

From `alive` the amplitude L = `lifeAt(f)` ramps as 1 − (1 − x)^4, x = (d + 1) / 8, d frames since the cue:
0.41 on the cue frame, 0.85 two frames later, 1 at eight. Life is visible at once and then settles. The life
clock tau = `lifeClock(f)` (seconds) is its integral, so a displacement written as speed × tau ramps in with L
and is 0 before the cue. Drift and flow read tau; live hooks also get t, the film time, which the wind reads.

`gust(t, seed)` is one wind for the picture and the soundtrack: a 1.05 Hz carrier whose amplitude (±50 % over
1.8 s) and phase (up to 3 rad over 1.4 s) wander, a 0.45 Hz swell (0.35), a 1.6 Hz ripple (0.25) and smooth
noise (0.8 over 0.22 s); about −2..2. A single sine reads as a metronome: the crown comes back every period.
A gust that crosses the frame is read with a delay, gust(t − (LW − x) / v), v 600-700 px/s, right to left;
the example's crown reads the same signal 0.25 s after the reeds at its feet.

| what | how (the example's numbers) |
|---|---|
| clouds | cloud marks painted as `parts` of the sky, drifting 2-5 px/s by height |
| mist | `drift` 3 px/s, `alpha` breathing 1 → 0.75 → 1 over 7 s |
| a boat | `flow`: a 2 px bob and a 0.6° roll about its centre, period 3.1 s |
| reeds | front blades drawn every frame with `blade()` (about 370 in the example, 680 in the demo): angle + 0.6 w, bend + w, w = L (0.055 gust + 0.02 noise) × mobility; the dense back mass stays cached |
| foliage | tufts as sprites: each rasterised once at the cache scale into its own small canvas, its root the pivot, swung each frame as a pendulum: angle L m (−0.07 w + 0.035 n), shift L m (4 w + 1.5 n) px, mobility m 0.3-1.2 growing away from the trunk |
| birds | a `live`-only layer for 5 s from a cue: two-dab V marks that flap and glide |
| water, glitter | section 9 |
| hills, trunk, jetty | still |

A crown moves on one signal. The example's tufts read the gust at their own x, with the crossing delay
above, so a gust runs through the crown from right to left. Never give each tuft a random delay of its own:
a hashed 0.2 s delay made the parts of a crown ripple out of phase. Tufts differ by amplitude (the mobility
m) and their own slow noise; a small hashed tilt of the swing axis (±8°) separates neighbouring sprays
further. Motion ghosts, if you add them, go only where a tuft moves more than 3 px in 1/90 s; ghosts on
every tuft cost about 50 ms a frame.

Marks carried by a moving field. A mark re-sampled on a screen grid every frame cannot move, and a persistent
particle cannot be born where the pattern opens. Sample generation n of the marks once, at its birth time
n·T, on a jittered grid (cached per seed and n), and carry each mark along the field so it keeps its phase.
Show it for one period T from a hashed offset o, with fades of F periods at both ends: `gens(tau, T)` lists
the three generations alive and their ages, `stagger(o, a, F)` gives a mark's visibility. The three add up to
one full set at any time, and nothing pops. T 3-5 s, F 0.1. Marks drawn every frame use `dabFast`, the dab
outline with ready fill and ridge styles and no generator, so a mark looks the same on every frame.

## 9. Water

**A surf** (a recipe; no code ships for it) is crests on a phase field. phi (1/4 resolution) is a soft
minimum of the distances to an offshore front and to the shore, each divided by the crest spacing (0.02 +
0.12 depth^0.7) · height, plus a noise warp. Crest k lies on phi = k + dk, with dk up to ±0.25 hashed per
crest: an irregular train whose spacing varies, so the surf does not come back every period. Crests advance
at 0.07 spacings/s far out (about 4 px/s) to 0.21 near the shore (15-25 px/s), with ±30 % noise across the
bay.
- Crest-bound marks (the roll, its lip, the dark face under it, curls, spray) are sampled per generation and
  carried along the moving phase by one soft-capped Newton step.
- Water-bound foam (whitewater, lace, wash) is deposited when a breaking crest passes a point and then holds,
  drifting at most 6 px/s and fading in over 0.45 s. Held lace lives 1.3-1.7 crest intervals, so a point stays
  covered until the next crest renews it. The foam field holds while the fronts move through it; foam that
  rides with the crests reads as a conveyor belt.
- Breaks are events per crest, hashed every 1.5-4 s: they switch on in 0.25 s over 80-200 px and peel along
  the crest at 10 px/s. The foam field grows through the shot.
- Fade marks where the phase gradient is ill-conditioned (ridges, U-turns): there the Newton step hops and
  marks buzz.

It draws 6-10 k marks per frame; a living frame with the surf takes 96-140 ms at 1920. A generation takes
about 60 ms to build: split it into bands, each with its own generator, and build one band per frame over the
frames before the generation is first drawn. The result does not depend on the order of the builds.

**A calm lake** is a painted mirror of the layers already built. In the lake's builder, draw the sky, sun and
ridge caches (with their parts) flipped about the shore line (`translate(0, 2·y0)`, `scale(1, -1)`), darken
and cool them toward the viewer with a gradient (alpha 0.18 at the shore to 0.8 at the bottom), read the result
back (`getImageData`, inside the build) and repaint it as horizontal marks: 24-70 × 2.6-5.5 px times `persp`,
rows 3.2 px times `persp` apart, colours sampled from the mirror. Add ripple streaks (the mirror 12 % lighter,
and dark troughs), a gold path under the sun (dashes spread 0.012-0.07 of the width, wider toward the viewer)
and reflections of posts and hulls as short vertical dabs. The flipped image alone reads as a photo; repainted,
it reads as paint. The lake layer comes after the layers it mirrors.

Trembling: once alive, the static lake is hidden (`alpha: tau => tau > 0 ? 0 : 1`) and its `live` hook draws
the same cache in horizontal strips 3-9 px tall (thinner at the shore), each shifted sideways by
amp · (0.7 n(y / (10 + 30d), 0.55 tau) + 0.3 sin(2π (tau / 2.3 + y / (40 + 80d)))),
amp = (0.4 + 5.5 d^1.3) · L px, d = `depth(y)`. Each strip reads 1.5 cache pixels more than its step, so
neighbours overlap by about a device row and no seam opens. At tau 0 the hook draws nothing and the still is
unchanged.

Glitter fades and never blinks: a fixed set of sparkles (340 on the gold path), each with alpha = L ·
smoothstep(0.25, 0.75, n(tau / per + ph)), per 0.7-1.5 s, drifting under 1 px/s. A sparkle lives about a
second; fewer than 0.5 % of the glitter's pixels change by more than 60 levels between frames. Sparkles switched
on and off by a hash read as a screensaver within seconds.

## 10. The camera

`camAt(f)` is a push-in about `focus` from the `push` cue: z = exp(rate · tc), with tc = d² / (2E) during the
ease-in (d frames since the cue, E = `ease` frames) and E/2 + (d − E) after it, in seconds. Defaults: rate
0.01359 per second, ease 27 frames, focus the centre: ×1.136 at 9.8 s after `push`. The example pushes at
0.0088 about (0.62, 0.40): ×1.10 over 11.3 s. For a final zoom z1 on the last frame fEnd:
rate = ln(z1) · FPS / (fEnd − push − E/2).

`camSet` puts the camera on the context before anything is drawn, so paper, drawing, masks and paint stay
registered. Every layer is drawn from its cache under that transform, and caches are built `OVER` = 1.14
times larger than the output, so the push never upsamples. Keep the final zoom at or below `OVER`; a deeper
push needs a larger `OVER`, and every cache grows with its square. No pan: the push reads as leaning in.

## 11. Caches and determinism

The painting is built once and every frame composes caches. These rules keep `check.mjs` green:

1. Key every cache by name, seed, output width, aspect, `OVER`, `PAINT_V` (the kit's recipe version), its
   rect and every parameter its build reads. `layer()` does the first ones; `pencilOf` adds the source's key
   and every pencil value. A key cannot see into a function: a scene record that passes functions (`pencil`,
   `reveal`) carries a `v`; change it with them.
2. A cache is never a pooled canvas. `cvs()` canvases are rewritten every frame; `LAYERS` are built once, each
   on its own canvas with its own transform, and never drawn into again.
3. Build from fixed inputs only: the still from `composeLive` at rest, the drawing from the still, the lake's
   mirror from built layers. A build that reads the frame being rendered changes with render order.
4. `getImageData` only inside a build. Per-frame pixel work stays at 1/4 resolution (masks, a 3×3 blur in JS,
   1-3 ms). No `ctx.filter` blur per frame.
5. Noise from a seeded 256 × 256 lattice table (`noise(seed)`, `n.fbm`). A hash per lookup is far slower:
   two reveal fields take 13 ms from the table and about 200 ms with a hash.
6. Build at the start of a frame, before drawing. `reveals(K)` builds the drawing and the fields the first
   time a frame before `done` needs them; frames after `done` never build them.
7. The still must equal the living frame at life 0. At tau 0 every life term is the identity, so the still and
   the layers at rest show the same marks in the same places. They differ only by resampling (one image
   against layers drawn one by one: 1.9 levels on average in the example, 2 % of pixels by more than 12). From
   `done` to `alive` the still fades over its layers at rest on frames that do not move, which hides it, and
   life starts at full visibility on its cue. Test: shoot f(alive) − 1, f(alive) and f(alive) + 1 and diff
   them. The first step is of the order of the second (the example: 6.0 then 4.5 levels on average); a pop is
   a first step several times larger, or change in parts of the picture that do not move.
8. The scene's coordinates are fractions of the 16:9 frame. A 9:16 film is its own layout: the same fractions
   stretch the picture.

`check.mjs` catches the rest: its "fresh", "after another width" and "after a sweep" orders are these traps.

## 12. Costs

At 1920 on an M-series Mac, one render tab:

| | the example (a calm lake) |
|---|---|
| cold build of the still (about 70 k marks) | 1.3 s; 1.5 s with the drawing and the fields |
| of which the lake's mirror, repainted in 30 k marks | 0.7 s |
| the pencil filter | 0.2-0.3 s |
| a reveal frame | 30-45 ms |
| a living frame | 40 ms |
| PNG encoding, render only | 140-160 ms |
| full render, 5 tabs | 450 frames in 25 s |
| HTML | 91 KB (the kit 50 KB) |

A surf scene (section 9) costs more: a cold build of 1.4-1.6 s and a living frame of 96-140 ms with 6-10 k
surf marks. Budgets: a living frame under 150 ms, a cold build under 2 s per tab, the HTML under 200 KB.

A dab costs 8-20 µs at 1920, and its two ridge strokes are about 10 µs of that: set `ridgeP` 0.3-0.6. One
path per mark is faster than batched paths in Chrome's canvas. Front blades cost about 1 ms per 100 a frame
(the demo's 680: 6-7 ms). Many live marks under one clip are drawn over an opaque copy of the frame that is
clipped once (`composeLive` does this for a layer with `clip` and `live`; clipping every mark costs 35 %
more). A slow living frame draws too many marks: cache what does not move, and draw fewer, larger live
marks.

## 13. Review

The drawing first, then the reveal, then life.

1. The drawing alone: shoot the frame before `wash` at full size, and 1:1 crops. Paper shows between marks,
   darks sit where the painting has shadow, the focal object has a dark skeleton, water is dashes rather than
   a veil. A grey fog means even marks (section 5).
2. The reveal: `FROM=0 TO=110 node scripts/look.mjs sheet 12 480 7 shots/reveal.png`. Each cell reads as
   one of: paper (f0-5), islands along the top (f8-15), drawing (f30-59), milky colour with the pencil
   showing (f66-86), finished (f98), alive (from f105). The first blooms are separate islands; no straight
   edge or stripe crosses the frame.
3. Diffs across the cues: f(wash) − 1 and f(wash), f(done) − 1 and f(done), f(alive) − 1, f(alive) and
   f(alive) + 1 (section 11).
4. Life: a section sheet of 12 cells over 4 s, and strips of 4-8 consecutive frames of each moving part at 2×.
   Motion that reads as a screensaver gives the film away: glitter that blinks, sprites that slide rigidly, a
   crown that bobs on one frequency, a surf that moves as one sheet, a pattern that comes back every period, a
   mark that hops for one frame. What should hold still holds still.
5. The push: the last frame is as sharp as the first living one and still framed on the point of interest.
6. `node scripts/check.mjs` says OK.

## 14. Changing a painting film

- A colour or a mark changes the drawing with it: look at the drawing alone again, then the reveal sheet.
- Another seed is another impression of the same composition: other dab positions, other islands and blooms.
  Four seeds of one film met the same reveal timings within 2 frames.
- Retiming moves the cues and the time fields together (section 4); export the curves and regenerate the sound.
- A new view replaces the scene block and keeps the kit. The example was built on the kit unchanged in about
  50 minutes: the scene 30, looking and fixing 10, check, render and sound 10.

## 15. Sound

Recipes are in `references/audio.md`, section 8. A quiet bed plays from frame 0 under a fade-in, and
nothing follows the pencil (no pencil or whoosh sounds). The ambience opens with life: a wave whose onset
leads `alive` by 0.35 s, or wind, water and birds. `RISO.curves()` exports per frame `sketch` and `colour`
(the revealed shares), `life`, `gust`, `z` and the scene's own fields (`SCENE.curves`), all computed without
pixels by `paintingCurves`. Wind and rustle follow `gust`, the signal the reeds and the crown move on, with a
slower onset (a 1.8 s smoothstep from `alive`) so the ambience does not switch on in one frame. Birds and
other accents come after `alive`, never on the cue itself. The example's `audio.mjs` is a short worked case:
wind and rustle on the gust, lapping water, birds after `alive`.
