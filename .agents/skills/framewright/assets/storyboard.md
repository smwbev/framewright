# Storyboard

Fill this in before writing the first scene. One row per plate. Lengths in bars (1 bar = 4 beats;
at 120 BPM and 30 fps a beat is 15 frames and a bar is 60). The total must equal the agreed length.
The main event sits on a bar boundary. The last bar belongs to the ending.

| # | plate | bars | frames | seconds | what the viewer sees | what the viewer hears | key moment |
|---|-------|------|--------|---------|----------------------|-----------------------|------------|
| 1 | intro | 2 | 120 | 0–4 | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| … | | | | | | | |
| n | outro | 1 | 60 | | | | |

Total bars: ___  ·  Total seconds: ___  ·  Main event at: ___ s (bar ___)

World film (one take, no cuts): one line on the world's layout from the smallest scale to the largest,
and the camera per plate: where it looks and how much it sees (`z`) at the plate's start and end.

Painting film (`init.sh --painting`): the plates are chapters of time (sketch 4 beats, colour 3 beats, then alive);
one line on the view (sky, planes back to front, the subject), what moves when alive, and the moments that are cues.

Checks: every plate readable as a still in 1.5 s; two neighbouring cells of one plate never look identical;
text fits with margins; nothing important in the outer 8 % of the frame (9:16: the top 15 % and bottom 20 %).
Key moments the sound must hit become the page's `CUES` (`[plate, beat, name]`), or `W.cues` in a world film.
