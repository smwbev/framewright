#!/usr/bin/env bash
# Assemble PNG frames (+ optional WAV) into an MP4.
#   ./build.sh [out.mp4] [frames_dir=frames] [track=track.wav]
# Env: CRF=22 (quality; 17 is near-lossless and 5x larger on noisy content), FPS=30, MAXRATE=14M
# Colour: the frames are sRGB. They are converted with the BT.709 matrix and the file is tagged (BT.709 primaries and
# matrix, sRGB transfer, limited range). Left to itself ffmpeg converts with BT.601 and leaves the matrix untagged,
# which players read as BT.709: reds, greens and skin tones shift. The file appears only when the encode succeeded.
set -euo pipefail
OUT=${1:-out.mp4}; DIR=${2:-frames}; TRACK=${3:-track.wav}
CRF=${CRF:-22}; FPS=${FPS:-30}; MAXRATE=${MAXRATE:-14M}
command -v ffmpeg >/dev/null || { echo "ffmpeg not found, run scripts/doctor.sh --install"; exit 1; }
ls "$DIR"/f00000.png >/dev/null 2>&1 || { echo "no frames in $DIR (expected f00000.png ...)"; exit 1; }
COLOR=(-vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709:range=tv"
       -colorspace bt709 -color_primaries bt709 -color_trc iec61966-2-1 -color_range tv)
V=(-c:v libx264 -preset slow -crf "$CRF" -maxrate "$MAXRATE" -bufsize 28M "${COLOR[@]}" -movflags +faststart)
TMP="$OUT.part"; trap 'rm -f "$TMP"' EXIT
if [ -f "$TRACK" ]; then
  ffmpeg -y -v error -nostats -framerate "$FPS" -i "$DIR/f%05d.png" -i "$TRACK" "${V[@]}" -c:a aac -b:a 192k -shortest -f mp4 "$TMP"
else
  echo "no $TRACK, building without audio"
  ffmpeg -y -v error -nostats -framerate "$FPS" -i "$DIR/f%05d.png" "${V[@]}" -f mp4 "$TMP"
fi
mv "$TMP" "$OUT"
ffprobe -v error -show_entries format=duration -show_entries stream=codec_name,width,height,nb_frames,color_space -of default=nw=1 "$OUT" | tr '\n' ' '; echo
echo "$OUT: $(du -m "$OUT" | cut -f1) MB"
