#!/usr/bin/env bash
# Full pipeline: [photo ->] check -> curves -> audio -> frames -> mp4.   ./make.sh [photo.jpg] [seed=7] [width] [tabs=5]
# width: leave it out and render.mjs takes 1920 for a landscape page, 1080 for a portrait one
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
PHOTO=${1:-}; SEED=${2:-7}; WIDTH=${3:-}; TABS=${4:-5}
if [ -n "$PHOTO" ]; then "$HERE/portrait.sh" "$PHOTO"; fi
# gate: frames do not depend on render order, the page loads nothing, the source has no clock or Math.random (SKIP_CHECK=1 skips)
if [ -z "${SKIP_CHECK:-}" ] && [ -f "$HERE/check.mjs" ]; then node "$HERE/check.mjs" "$SEED"; fi
# the sound reads plate starts and per-frame curves from the page (RISO.curves); a project's own export-curves.mjs wins
if [ -f export-curves.mjs ]; then node export-curves.mjs curves.json "$SEED"
elif [ -f "$HERE/export-curves.mjs" ]; then node "$HERE/export-curves.mjs" curves.json "$SEED"; fi
# the seed goes to audio.mjs too: a nature soundtrack (audio-nature.mjs) takes it as its film seed; the classic template ignores it
if [ -f audio.mjs ]; then node audio.mjs track.wav "$SEED"; else echo "no audio.mjs, video will be silent"; fi
rm -rf frames && node "$HERE/render.mjs" frames "$SEED" "$WIDTH" "$TABS"
"$HERE/build.sh" out.mp4
