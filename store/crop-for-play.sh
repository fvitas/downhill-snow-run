#!/bin/sh
# Play rejects screenshots whose long side is more than twice the short side, and a 1290 × 2796
# iPhone shot is 2.17:1. This trims the excess evenly off the top and bottom, which is safe-area
# space the game keeps clear of the HUD.
set -eu
cd "$(dirname "$0")"
mkdir -p screenshots/play
found=0
for shot in screenshots/ios/*.png screenshots/ios/*.PNG screenshots/ios/*.jpg screenshots/ios/*.jpeg; do
  [ -f "$shot" ] || continue
  found=1
  w=$(sips -g pixelWidth "$shot" | awk '/pixelWidth/ {print $2}')
  h=$(sips -g pixelHeight "$shot" | awk '/pixelHeight/ {print $2}')
  name=$(basename "${shot%.*}").png
  if [ "$h" -gt $((w * 2)) ]; then
    sips -s format png -c $((w * 2)) "$w" "$shot" --out "screenshots/play/$name" >/dev/null
  else
    sips -s format png "$shot" --out "screenshots/play/$name" >/dev/null
  fi
  echo "screenshots/play/$name"
done
[ "$found" -eq 1 ] || echo "No screenshots in store/screenshots/ios yet."
