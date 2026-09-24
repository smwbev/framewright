# Visual systems

Twelve styles that render well from code and read on a contact sheet. Each entry: the look,
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

Mix at most two systems, and only when one is the world and the other is a quotation inside
it: a teletext page inside a retro TV, a blueprint pinned on a chalkboard, a newspaper on a
flat-vector desk.
