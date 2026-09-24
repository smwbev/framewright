# World demo

The eight-second demo that `init.sh --world` scaffolds as `index.html`, the starting point of a
film told in one take. A dot breathes, the line draws a ring and a square inside it, a lid slides
over the square and hides that part of the line, the first drawing fades as the line travels on
through three growing loops, and the camera opens from a close-up to the whole drawing while the
pool of light on the decor widens. The soundtrack template gives the line a voice that follows its
speed and position on screen.

The source is `.agents/skills/framewright/assets/world.html`, the method `references/world.md`.
A finished film built the same way: `examples/honeybee`.

```bash
bash .agents/skills/framewright/scripts/init.sh my-film --world
cd my-film && npm install
node scripts/look.mjs sheet 18 400 7 shots/sheet.png
bash scripts/make.sh        # check, curves, sound, frames, MP4
```
