# Visual systems

Sixteen styles that render well from code and read on a contact sheet. Each entry: the look,
a palette to start from, type, motion language, signature objects, the post-processing recipe,
the sound palette, the trap. Palettes are starting points; the topic picks the accent. The list
is a starting set, not a limit: a concept may build a system of its own, described under the same
headings.

Numbers in recipes assume a 1920×1080 output; scale with width where noted. Every per-pixel
pass is deterministic: noise comes from a linear congruential generator seeded with
`hash(seed, 'grain', frame)`, never from `Math.random`.

## 1. Retro TV (CRT broadcast)

Look: a cathode-ray screen showing television that has nothing to show. Dark glass, curved
edges, scan lines, colour fringes, snow, test card, teletext, on-screen menus.
Palette: near-black `#04060a`, bluish white `#eef3ff`, OSD green `#8cff7a`, amber `#ffb020`,
full test-card colours when the card is on.
Type: bitmap text from a thresholded system monospace font, 14 px glyphs upscaled without
smoothing, cells 4–12 logical units. Vector type only for nothing.
Motion: cuts as channel switches (band tearing, roll, snow for 3–4 frames), text revealed
row by row, blinking status words, a scan beam passing down, RGB channels converging when a
signal "locks".
Objects: test card with circle and colour bars, seven-segment countdown, teletext page with
a header and coloured fastext row, oscilloscope with graticule, "NO SIGNAL" box, lower
third with a red accent, power-on flash and power-off collapse to a dot.
Post recipe: sample coordinates `uv·(1+k·r²)/(1+k)` with `k≈0.06` (barrel; side midpoints
stay, corners go black in an arc); red channel sampled at radius `×1.0022` plus 0.9 px to
the right, blue mirrored; scan lines with period `round(H/360)` and profile
`0.58+0.42·sin^1.2`; vignette `1-0.30·(r²/2)^1.4`; grain ±9; bloom = the result blurred by
`W/220` px added with `lighter` at alpha 0.26; a faint diagonal glass highlight. Cost about
0.4 s per 1080p frame in JS, fine offline, so the live preview runs at 960 px.
Sound: mains hum 50 Hz, hiss through a 6.5 kHz low-pass, 1 kHz test tone, sine beeps,
square-wave alarms, data chirps for text, a low thunk plus a 15.7 kHz whine for power-off.
Trap: noise everywhere. Keep text large, keep one calm scene between two noisy ones.

## 2. Risograph print

Look: two or three spot inks on off-white paper, halftone dots, slight misregistration,
paper grain, ink that is denser where layers overlap.
Palette: paper `#f3efe4`, fluorescent pink `#ff5fa2`, blue `#1f4fd8`, yellow `#ffd93d`,
sometimes teal `#00a2a6`. Black only as a fourth ink, sparingly.
Type: heavy grotesque or a rounded display face at large sizes; small text is one ink and
never halftoned.
Motion: everything wobbles a little (the live-line generator), shapes appear as ink blocks
sliding in, overprints build up layer by layer, cuts are hard.
Objects: big flat shapes, cut-paper figures, thick outlines, patterns of dots and hatching,
portraits as two-ink separations.
Post recipe: render each ink as its own grey layer; convert each to halftone (dot radius
proportional to darkness on a rotated grid, angles 15°, 45°, 75°); offset each ink by 1–3 px
in a fixed random direction per seed; multiply the inks onto the paper; add paper grain ±6
and a few random ink specks. Light inks work as accents and thin underlays, never as full
fills under dark inks, or the colour goes muddy.
Sound: paper, thumps of a printing drum, warm bass, brushes, tape hiss.
Trap: thin lines thinner than the halftone cell crumble. Outline the hero object thick.

## 3. Terminal (phosphor)

Look: a monochrome character grid on black, one phosphor colour, a blinking cursor, text
that types itself, boxes drawn with line characters.
Palette: green `#7dffb0` on `#04110a`, or amber `#ffb000` on `#100a02`, or white
`#dfe6ff` on `#05070c`. One colour per video plus a dimmer shade of it.
Type: monospace only, through the bitmap-text helper, one cell size for body text and one
for headings. Every glyph sits on the grid.
Motion: typing at 12–20 characters per second with jitter, cursor blink at 1 Hz, progress
bars made of block characters, spinners `|/-\`, log lines scrolling up, a whole screen
"cleared" in one frame.
Objects: prompts, logs, ASCII boxes, a `waiting…` spinner that never ends, a portrait as
ASCII density characters, a big banner in block letters.
Post recipe: slight bloom (blur `W/300`, alpha 0.3), scan lines period 3 at 0.85, a slow
brightness breathing ±2 %, occasional single-frame flicker of one line.
Sound: key clicks, a soft 60 Hz hum, modem chirps, a bell for the result.
Trap: walls of text. One idea per screen; the rest is decoration in dim colour.

## 4. Blueprint (technical drawing)

Look: thin white lines on cyanotype blue, dimension arrows, hatching, title block, stamps.
Palette: blue `#0b3d91`, paper white `#e9f1ff`, one warning colour `#ff4d4d` or red-orange
for stamps and the single highlighted part.
Type: engineering lettering, a condensed sans in caps, plus a monospace for numbers.
Motion: lines draw themselves along their length, dimensions snap in with a tick, the sheet
pans and zooms slowly, stamps slam down with two frames of overshoot.
Objects: the subject drawn as a part with three views, section hatching, a bill of
materials, revision table, a compass rose, a Gantt bar.
Post recipe: line weight never under 2 logical units; a paper texture from low-frequency
noise at 4 % ; slight blue vignette; no bloom.
Sound: pencil scratches, a ruler click, paper, metronome, a rubber stamp.
Trap: it can feel cold. Give one element a joke: a dimension that reads "?", a stamp that
never lands.

## 5. Swiss poster (kinetic typography)

Look: big type on a flat ground, one accent colour, a grid you can feel, words moving as
objects.
Palette: black `#111`, white `#f4f4f2`, one accent (red `#e63b2e`, cobalt `#2e4fe6`, or
lime `#c8f04a`). Never more than three.
Type: a heavy neo-grotesque in three sizes only; letter-spacing tight; alignment to a
strict grid.
Motion: words slide, stack, rotate 90°, scale from 0.2 to 1 with `ease.back`, letters
appear one per frame, a line wipes another, cuts on the beat.
Objects: text, rules, one big circle or block, a halftone photo as a shape.
Post recipe: none, or a faint paper grain ±4. Sharpness is the style.
Sound: a click track, a single sustained note, a snare on the cut.
Trap: too many sizes and weights. Three sizes, one weight, one accent.

## 6. Flat vector (motion graphics)

Look: clean shapes, soft shadows, rounded corners, friendly icons, gradients only for light.
Palette: a warm neutral `#f6f1ea`, ink `#1d1d1f`, three accents from one hue family plus
one complementary.
Type: a geometric sans, mixed case, generous spacing.
Motion: everything eases (`ease.io`, `ease.back`), overlapping action, squash on landing,
icons build from primitives, a "camera" pan between islands of content.
Objects: cards, devices, badges, charts that grow, a character made of circles.
Post recipe: none. Maybe a 1 % vignette.
Sound: marimba plinks, whooshes from filtered noise, a soft kick, ukulele-like plucks
from a short saw with fast decay.
Trap: looks like every explainer. Give it one unusual constraint: a single hue, or every
shape drawn with one line.

## 7. Paper cutout (collage)

Look: layers of coloured paper with drop shadows, torn edges, printed halftone bits,
tape strips, hand-written labels.
Palette: kraft `#c9a97a`, cream `#f1e9d8`, black ink, one or two bright papers.
Type: typewriter-like monospace plus one hand-drawn feel via jittered vector strokes.
Motion: pieces slide in from off-screen and settle with a bounce; shadows move with them;
layers peel; things get pinned with a tack.
Objects: torn strips, stamps, photo corners, arrows drawn by hand, a portrait as a
posterized cutout.
Post recipe: per layer a 2 px offset shadow at 25 % alpha; paper grain ±5; edges made
irregular by a noise-displaced outline.
Sound: paper rips, scissors, tape, a wooden click.
Trap: clutter. Five pieces on screen at most.

## 8. Neon grid (synthwave)

Look: a horizon grid in perspective, a big sun with stripes, glowing outlines, chrome
type, scan lines lightly.
Palette: night `#0b0320`, magenta `#ff2bd6`, cyan `#2be2ff`, sun orange `#ff8a2b`.
Type: an extended geometric sans with a chrome gradient, or italic script for one word.
Motion: the grid scrolls toward the camera at a beat-locked speed, the sun rises on the
drop, outlines pulse with the kick, text slams in with a flash.
Objects: grid, sun, mountains as triangles, a car silhouette, palm trees as vectors, a
portrait as glowing contours.
Post recipe: bloom blur `W/160` at alpha 0.5, chromatic offset 1.5 px, scan lines at 0.92.
Sound: four-on-the-floor kick, gated snare, saw bass, a pad of detuned saws through a
slow filter.
Trap: bloom everywhere kills contrast. Only the outlines glow; fills stay dark.

## 9. Chalkboard

Look: white and pastel chalk on dark green or black slate, dusty strokes, smudges, hand
lettering, diagrams with arrows.
Palette: slate `#1e2a24`, chalk `#f2f2e6`, pastel yellow `#f0dc8a`, pastel pink `#e8a0b0`,
pastel blue `#9fc5e8`.
Type: hand lettering by jittered vector strokes (two generators: stable path, live jitter),
or a rounded sans made rough by noise displacement.
Motion: strokes draw at hand speed, a swipe erases with a smudge, arrows grow, underlines
wobble.
Objects: diagrams, formulas, a to-do list with checkmarks, a stick figure, a portrait as a
chalk sketch (contours only).
Post recipe: strokes drawn twice: a wide low-alpha pass for dust and a thin bright pass;
slate texture from two octaves of noise at 6 %; faint eraser smudges as soft ellipses.
Sound: chalk taps, squeaks (short sine sweeps 2–4 kHz), an eraser swish from noise.
Trap: everything wobbles equally and the eye tires. Only the current stroke is alive; the
rest freezes after it is drawn.

## 10. Pixel game (8-bit)

Look: a low-resolution grid (160×90 or 320×180 logical pixels) upscaled without smoothing,
a limited palette, sprites, a HUD.
Palette: 16 colours at most; start from a known pattern: dark navy, mid blue, teal, green,
yellow, orange, red, magenta, four greys.
Type: a 5×7 bitmap font drawn from a table of glyph rows, or the bitmap-text helper at
`px 8`.
Motion: everything moves in whole pixels; characters step at about 10 fps, each pose held for
a divisor of the beat (3 frames at 120 BPM; guide.md, section 3), the camera at 30 fps; screen
shake by 1–2 pixels; a flash frame on hits.
Objects: a title screen with "PRESS START" blinking, a scrolling landscape in two layers,
a progress bar, a boss health bar, a level-complete jingle screen.
Post recipe: render to a small canvas, scale up with `imageSmoothingEnabled=false`; optional
scan lines at 0.9; no bloom.
Sound: square and triangle waves, noise drums, arpeggios at 1/16 notes, a jingle at the
end.
Trap: mixing resolutions. Everything, including text, lives on the same pixel grid.

## 11. Oscilloscope (vector display)

Look: a single bright trace on a dark round screen with a graticule, everything drawn as
one continuous line, glow, slight persistence.
Palette: trace `#7dffb0` on `#04110a`, or `#9ad0ff` on `#020913`.
Type: single-stroke lettering made of line segments (define letters as polylines), or the
bitmap helper for labels outside the screen.
Motion: the beam draws the path at constant speed (by cumulative length), the completed
figure jitters slightly, sweeps pass across, figures morph by interpolating polylines with
the same point count.
Objects: Lissajous figures, a spinning wireframe, an ECG line, a radar sweep, a face as a
single traced contour.
Post recipe: trace drawn three times: wide at 0.15 alpha, medium at 0.5, thin bright;
persistence by drawing the previous 3 frames' paths at decreasing alpha (recompute them,
frames are pure functions); bloom blur `W/200` at 0.4.
Sound: sine glides that follow the trace, a soft click per sweep, a low buzz on errors.
Trap: too many objects. One figure at a time on a vector display.

## 12. Newspaper (halftone print)

Look: black ink on newsprint, big headlines, columns of fake body text as grey blocks,
halftone photos, rules and boxes, a date line.
Palette: newsprint `#e8e2d3`, ink `#151515`, one spot red `#c8332b` for a stamp or a
circle.
Type: a bold condensed serif or slab for headlines, a serif for decks, grey bars for body.
Motion: the paper unrolls or slams down, a headline types letter by letter with a
typewriter feel, a red circle is drawn around the key line, the page turns.
Objects: masthead, headline, subhead, a halftone portrait with a caption, a weather box,
a stock ticker, a crossword.
Post recipe: halftone on a 45° grid for photos, ink bleed by a 1 px blur before threshold,
newsprint noise ±5, slight yellow vignette.
Sound: a printing press rhythm, paper, a typewriter bell, a newsboy shout replaced by a
brass stab.
Trap: unreadable fake text. Body text is grey bars, never real small type.

## 13. Sketch to painting (a drawing that becomes a living painting)

Look: one landscape told in three media without a cut. A warm sepia pencil drawing appears on cream
paper through soft growing islands; a golden-hour oil painting of the same view washes in over it,
first milky with the pencil showing through, then finished, and the lines dissolve; the painting
comes alive and the camera pushes in. The drawing is computed from the painting (a colour-dodge
pencil filter), so the eye never re-reads the composition: it watches the medium change.
Palette: paper `#F2EBDC`; pencil as a linear ramp from `#30281D` through `#554D42`, `#91897C`,
`#CDC6B8` to the paper (warm sepia, hue 36–38°); while the colour arrives it is the painting at 65 %
over the drawing: teal `#82A49C`, ochre `#C7A66D` and `#91784A`, peach `#F3D5A6`; the painting
itself from 14.
Type: none by default. A title is pencil on the paper (`#554D42`, a humanist serif italic from the
system fonts), shown with the drawing and gone with the lines.
Motion: 0.2 s of blank paper; the drawing is uncovered along a diagonal time ramp plus noise, sky
first (T = 0.32 + 0.47x + 0.86y s, noise σ 0.11 s, each point in 2.5 frames), its first islands
separate drips along the top edge: 50 % at 1.0 s, done at 1.8 s; a 0.2 s hold; colour arrives the
other way, bottom first, in soft blooms to 65 % opacity (150–250 px feather) with the pencil
visible, then everything finishes to 100 % together (2.4–3.25 s) and the lines vanish; a 0.25 s
still; life ramps in over 0.27 s at 3.5 s; a slow push-in (×1.10–1.14 over the rest of the film)
about the point of interest from 3.67 s. Lines are never drawn along their length, and nothing
un-reveals. A longer reveal stretches the cues and the time fields together, keeping their order.
Objects: a view with depth (sun and sky, two or three hill planes, water or a field, a near
foreground), a glitter path under the sun, surf or a calm mirror lake, one windswept tree or figure
at a side, reeds or a grass slope in the corner.
Post recipe: none over the colour: no grain, no vignette, no grade. Paper with ±1.5 levels of
15–45 px fibre mottling. The drawing is `pencilOf(still)`, a colour dodge at two scales with a
grained tone and a per-region gain of 1.05–1.4, cached once; reveals are 1/4-resolution time fields
thresholded per frame. Caches are built 1.14× oversize so the push-in never upsamples. The demo that
`init.sh --painting` scaffolds implements this style; the method is `references/painting.md`.
Sound: a quiet bed from frame 0 with a 1.7 s linear fade-in, flat through drawing and colour; the
ambience opens with the painting: at sea a wave whose onset leads the `alive` cue by 0.35 s, about
+14 dB within a second; at a lake or in a field wind, water and birds rising over 1–2 s. No pencil or
whoosh sounds. Blocks: `references/audio.md`, Nature ambience.
Trap: the drawing inherits the painting's marks. Even, same-size dabs give a grey fog instead of a
drawing (on open water a median sketch luma of 209 and 0.1 % dark cores, where a drawing that reads
as pencil has about 220 and 3 % or more). Paint sparse thin dark accents, tune the region gains, and
look at the drawing alone before timing a reveal. A mask with too little noise reads as a wipe.

## 14. Living oil painting (impasto plein-air landscape)

Look: a golden-hour impasto oil landscape that breathes. Knife-flat plateaus of colour with a lit
upper ridge and a dark lower one; broken colour (golden flecks in teal water, lilac shadows in cream
foam, sky showing through foliage); strong aerial perspective. Everything that moves in nature
moves, and nothing else does.
Palette, for a coast at golden hour, for example: sky from `#D6C8B9` at the top through `#EDC890` to
`#FDC37A` at the horizon, hottest `#FDBE65` beside the sun; sun core `#FEEDB5`, `#FEDD89`, rim
`#FBCA74`; clouds lit `#F0D0A0`, bellies `#CFB8A5`; sea `#6B96A3` near the horizon to `#498993`,
troughs `#2E6E79`, crests `#75A09F`, wave face `#196B69`, lip `#D6D5B8`; foam `#E2D0B3` over
lilac-grey `#B6B9B8`, lace `#E5D0B1`; glitter `#E7C17D` and `#FEDD89`; hills `#B59D8F` far,
`#868176`, `#8D826C` with lit `#BA9D6A`; grass `#7C5A1E` and `#C2923C` with gaps `#462E0A`; trunk
`#453021` lit `#9E7C44`; foliage `#624A15` and `#B79454`, sky flecks `#E6B88A`. Teal against gold,
cream as the bridge. For a lake at dawn (`examples/lake-dawn`): sky `#A7B2CE` at the top through
`#E4AFA4` to `#F7DCBC` at the horizon, ridges in lilac haze `#A3A5C2` and `#7E7797`, conifers
`#34504C`, the water the mirror of that sky darkened toward `#35667A`, reeds `#8C8A3E` and `#B59A55`
over a dark mass `#3F4722`. For a field or a forest edge, keep the sky and take the ground from the
grass and foliage rows above.
Type: a humanist serif italic in paper cream with a soft dark shadow on the lower title line, or
none.
Motion: tree tufts flutter at about 1 s with a swell of about 2 s (the kit's `gust`), along an axis
65–85° from the horizontal (a spray bobs on its limb more than it slides sideways), ±6–12 px, the
crown on one gust signal and never on random per-tuft delays, tufts bending about their pivots
(whole clumps move under 2 px); the sea texture drifts toward the shore at 3–6 px/s; crests advance
about 4 px/s far out to 15–25 px/s near the shore; breaks are born abruptly at hashed times 1.5–4 s
apart along a crest and then peel along it at about 10 px/s; the foam field grows through the shot;
glitter drifts with the water and each sparkle lives 0.7–1.5 s; clouds drift 2–5 px/s, faster higher
up; hills, rocks, trunk and grass hold still (grass at most shimmers); a push-in of 0.9–1.4 % per
second after a 0.9 s ease-in (the kit's default is 1.36 %), no pan. Nothing loops inside a film.
Objects: a low sun veiled by cloud streaks and its glitter path; water, either surf (crest lines
with curls and lace) or a calm mirror lake; two or three hill planes in haze; a beach, a bank or a
shore; one windswept tree at a side, built from tufts; wind-combed grass or reeds; rocks with foam
rims or a jetty; a cumulus band with lilac bellies.
Post recipe: none. The impasto is in the marks (a lit edge +12 % lightness, a dark edge −15 %, at
alphas of about 0.34 and 0.24; hue ±4°, saturation ±6 %, lightness ±5 % per dab), never a filter
over the frame. Method: `references/painting.md`, sections on life and water.
Sound: a surf bed and wave events (`references/audio.md`, Nature ambience), wind that follows the
same gust signal as the tree, a sparse leaf rustle when foliage fills the frame; birds or gulls only
as rare accents.
Trap: screensaver motion. Blinking glitter, rigidly sliding sprites and a sea that repeats every few
seconds give it away. Sparkles fade, tufts bend, curls are born irregularly, the foam grows.

## 15. Pencil and wash (watercolour over graphite)

Look: the in-between state of 13 held as the style: a warm sepia pencil drawing with transparent
colour blooms over it at 60–75 % opacity, the pencil visible through the colour, the paper glowing
through it, soft bloom edges of 150–250 px, some of the drawing left uncoloured.
Palette: paper `#F2EBDC`, the pencil ramp of 13; washes are the painting at 65–75 % over paper:
teal `#85ACAF`, peach `#F3D5A6`, gold `#F9D19C`, ochre `#C7A66D`, olive `#A58D60`, umber `#827162`,
foam lilac `#CBCAC5`.
Type: pencil lettering in `#554D42` (a humanist serif italic, or letter-spaced small caps),
uncovered by the drawing's mask; a coloured word blooms like the washes.
Motion: slow. Blooms arrive through a soft noise field (150–250 px feather), hold at 65 % and creep
toward 75–80 % while they spread (the per-point creep of `references/painting.md`, section 7); a new
scene is a new bloom over a new drawing, not a cut; the camera drifts under 0.5 % per second and
carries the motion; if the film comes alive, it does so after the finish, as in 13.
Objects: landscapes, a house, a street, a botanical plate, a map, a traced portrait (photo polygons
through the pencil filter), a paper margin with nothing on it.
Post recipe: pencil filter of a hidden painting; the painting through a soft mask capped at
0.65–0.8 (the reveal of 13 held at its plateau, `references/painting.md`, section 7); paper fibre
±1.5. A 1–2 px darker tide line at a bloom's edge is a watercolour convention the kit does not draw:
test it on a frame before adopting it.
Sound: light and airy: a foam hiss or wind bed around −20 LUFS, distant birds, a soft paper touch
on each new bloom.
Trap: mud. Washes stacked on washes darken and grey. Here a wash is the painting at partial
opacity over the drawing, never multiplied layers: one wash per place, and at least a fifth of the
frame stays near-white paper.

## 16. Gouache poster (flat painterly illustration)

Look: a flat gouache-like illustration. Short round-ended horizontal dabs in three or four tones per
region, no outlines, no light inside a stroke; rows of light dabs make the wave bands; foam as cream
capsules; glitter as short dashes; foliage in flat pads; long thin grass blades leaning with the
wind; the painting darkens and greys toward its edges.
Palette, for a coast in late light, for example: sky `#F7D1A5`, `#E2B29A`, `#CE9E91`, upper corner
`#B79D8C`; sun glow `#DED8C8` (no disc); sea `#156E83`, `#1B778C`, `#1F7E91`, `#30969F`, `#36A3A8`;
foam `#EEEFE1` over an aqua halo `#96C7C2`; glitter `#DBD9BA` to `#E6E2C3` on a `#A1AC86` glow;
headland `#AA9D6F` with bushes `#7C7C51`; far hill `#C0AAA0`; sand `#E6D1A2`; foliage `#5F5727`,
`#8F813D`, `#CAAF62`; trunk `#43321E` lit `#806937`; grass `#7D6728`, `#9C863F`, `#CEB46B`; edge
grey `#6E6A62`. Inland, a lake, a field or a forest takes the same sky and edge grey, three or four
flat tones per region, and the foliage and grass rows for the ground. For the line variant: paper
`#F1E9DB`, ink `#635C51`.
Type: a rounded or geometric sans in paper cream on a 30 % dark plate, or a bold serif.
Motion: the sea is a function of the frame modulo its period P of 2–3 s (longer reads as a swell,
shorter as a chop): crest phase ln(v/H)/s − f/P, with v the depth below the horizon, H the frame
height and s about 0.12, so each crest lies about 13 % deeper than the one before and the spacing
grows toward the viewer as perspective does; crests tilt from 0° far out to about 25° near; foam
capsules are stamped and held 8–16 frames; glitter dashes switch on and off over 2–3 frames (on-runs of
about 6 frames, about 10 % lit: the poster's one mechanical rhythm, kept soft); one gust signal travels right to left at 600–700 px/s through the grass (tips ±3–6 px, less
toward the dark edges) and the tree pads (2–5 px); in a short film write the wind as a few strong
gusts with calms between rather than a steady flutter, because a gust reads as an event; clouds
under 5 px/s; a push-in 1 → 1.05 as a smoothstep ending on the last frame.
Objects: the vocabulary of 14 simplified: a tree of 20–25 flat pads on a thin trunk (a pine, an
acacia, an oak), capsule foam, dash glitter, rows of bush dashes on the hills, a beach or a field
edge, a grass slope.
Post recipe: on the paint layer only, lerp toward `#6E6A62` with weight 0.35·(1 − d/band)² over 0.15
W at the left and right and 0.07 H at the top, and multiply 0.75 into the bottom-right corner; no
grain over the colour. Line variant (ink and wash): trace the living painting's own frame with a
max-channel Sobel, ink D = 8 + 110·smoothstep(20, 170, g) in `#635C51`, lines 1.7–2.5 px, over an 8
% multiply of the blurred painting; paper `#F1E9DB` with a few hundred specks of 1–3 px, 6–15 levels
dark. The kit has no tracer: build it like `pencilOf`, once, from a cached frame
(`references/painting.md`).
Sound: waves on the visual period (a small wash every period), wind that swells with the gusts,
rustle in the grass during them.
Trap: it can read as clip-art, and an exact short loop shows within a few seconds. Vary the tones
and foam per wave cycle (hash on the cycle index) and keep at least four tones per region. In the
line variant, Sobel of textured strokes draws beaded double lines: soften the source by 1 px before
tracing.

## Picking and mixing

| The message is about | Try first | Then |
|---|---|---|
| waiting, absence, delay | 1 Retro TV, 11 Oscilloscope | 3 Terminal |
| a plan, a launch, a build | 4 Blueprint, 3 Terminal | 5 Swiss poster |
| a greeting, a birthday, thanks | 6 Flat vector, 7 Paper cutout, 2 Risograph | 9 Chalkboard |
| a product, a feature | 6 Flat vector, 5 Swiss poster | 8 Neon grid |
| a joke at someone's expense, a roast | 12 Newspaper, 1 Retro TV | 10 Pixel game |
| music, a party, a drop | 8 Neon grid, 5 Swiss poster | 10 Pixel game |
| learning, an explainer | 9 Chalkboard, 6 Flat vector | 4 Blueprint |
| nostalgia, an anniversary | 2 Risograph, 12 Newspaper | 1 Retro TV |
| a place, travel, a memory, a quiet thank-you | 14 Living oil painting, 13 Sketch to painting | 15 Pencil and wash |
| a transformation, an idea becoming real, before and after | 13 Sketch to painting | 4 Blueprint |
| nature, a season, weather, a mood | 14 Living oil painting, 16 Gouache poster | 15 Pencil and wash |

Mix at most two systems, and only when one is the world and the other is a quotation inside
it: a teletext page inside a retro TV, a blueprint pinned on a chalkboard, a newspaper on a
flat-vector desk.
