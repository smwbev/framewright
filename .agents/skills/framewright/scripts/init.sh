#!/usr/bin/env bash
# Scaffold a framewright project in the current directory (or the given one).
#   scripts/init.sh [target_dir=.] [--world] [--force]
#   --world  start from the one-world skeleton: a film without cuts (references/world.md)
# Creates: index.html (from a skeleton), scripts/, audio.mjs (template), storyboard.md, package.json, .gitignore
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); SKILL=$(dirname "$HERE")
TARGET=.; FORCE=0; PAGE=skeleton.html
for a in "$@"; do case "$a" in --force) FORCE=1;; --world) PAGE=world.html;; *) TARGET=$a;; esac; done
mkdir -p "$TARGET/scripts" "$TARGET/shots"; cd "$TARGET"
put(){ if [ -e "$2" ] && [ $FORCE = 0 ]; then echo "  keep   $2 (exists, use --force to overwrite)"; else cp "$1" "$2"; echo "  write  $2"; fi; }
put "$SKILL/assets/$PAGE" index.html
put "$SKILL/assets/audio-template.mjs" audio.mjs
put "$SKILL/assets/storyboard.md" storyboard.md
for f in look.mjs render.mjs build.sh make.sh export-curves.mjs inject.mjs portrait.sh trace.py doctor.sh; do put "$HERE/$f" "scripts/$f"; done
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
echo "next: npm install   (or bash scripts/doctor.sh --install), then: node scripts/look.mjs shot 0 1200 7 and look at shots/f0000.png"
