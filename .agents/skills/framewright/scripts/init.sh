#!/usr/bin/env bash
# Scaffold a framewright project in the current directory (or the given one).
#   scripts/init.sh [target_dir=.] [--world | --painting] [--force]
#   --world     start from the one-world skeleton: a film without cuts (references/world.md)
#   --painting  start from the painting skeleton: a drawing that becomes a living painting (references/painting.md);
#               audio.mjs is then the nature soundtrack, with its blocks in nature.mjs next to it
# Creates: index.html (from a skeleton), scripts/, audio.mjs (template; --painting adds nature.mjs), storyboard.md, package.json, .gitignore
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); SKILL=$(dirname "$HERE")
TARGET=.; FORCE=0; PAGE=skeleton.html; AUDIO=audio-template.mjs; LOOK=0
for a in "$@"; do case "$a" in --force) FORCE=1;; --world) PAGE=world.html; AUDIO=audio-template.mjs; LOOK=0;; --painting) PAGE=painting.html; AUDIO=audio-nature.mjs; LOOK=30,82,200;; *) TARGET=$a;; esac; done
mkdir -p "$TARGET/scripts" "$TARGET/shots"; cd "$TARGET"
put(){ if [ -e "$2" ] && [ $FORCE = 0 ]; then echo "  keep   $2 (exists, use --force to overwrite)"; else cp "$1" "$2"; echo "  write  $2"; fi; }
put "$SKILL/assets/$PAGE" index.html
put "$SKILL/assets/$AUDIO" audio.mjs
if [ "$PAGE" = painting.html ]; then put "$SKILL/assets/nature.mjs" nature.mjs; fi
put "$SKILL/assets/storyboard.md" storyboard.md
for f in look.mjs check.mjs render.mjs build.sh make.sh export-curves.mjs inject.mjs portrait.sh trace.py doctor.sh; do put "$HERE/$f" "scripts/$f"; done
chmod +x scripts/*.sh scripts/*.mjs 2>/dev/null || true
if [ ! -f package.json ]; then cat > package.json <<'JSON'
{
  "name": "framewright-project",
  "private": true,
  "type": "module",
  "scripts": {
    "doctor": "bash scripts/doctor.sh",
    "shot": "node scripts/look.mjs shot",
    "sheet": "node scripts/look.mjs sheet",
    "info": "node scripts/look.mjs info",
    "check": "node scripts/check.mjs",
    "curves": "node scripts/export-curves.mjs curves.json",
    "audio": "node scripts/export-curves.mjs curves.json && node audio.mjs track.wav",
    "render": "node scripts/render.mjs frames 7 1920 5",
    "build": "bash scripts/build.sh out.mp4",
    "make": "bash scripts/make.sh"
  },
  "dependencies": { "puppeteer": "^23.11.1" }
}
JSON
echo "  write  package.json"; else echo "  keep   package.json"; fi
if [ ! -f .gitignore ]; then printf 'node_modules/\nframes/\nframes-*/\nshots/\n*.mp4\n*.mov\n*.wav\n*.log\nportrait.js\ncurves.json\n.venv/\n.DS_Store\n' > .gitignore; echo "  write  .gitignore"; else echo "  keep   .gitignore"; fi
echo
if [ "$LOOK" = 0 ]; then
  echo "next: npm install   (or bash scripts/doctor.sh --install), then: node scripts/look.mjs shot 0 1200 7 and look at shots/f0000.png"
else
  echo "next: npm install   (or bash scripts/doctor.sh --install), then: node scripts/look.mjs shot $LOOK 1200 7 and look at the drawing, the colour and the living painting in shots/"
fi
