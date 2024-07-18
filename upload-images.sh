#!/bin/bash
set -e

ROOT="/Users/jesseditson/Library/Mobile Documents/com~apple~CloudDocs/archival/renders/sections"

function upload {
    archival upload home sections.$1 "$ROOT/192/$2.png"
    archival upload home sections.${1}_shadow "$ROOT/192/$2-shadow.png"
}

cd "$ROOT"
# For a single image:
# magick logo-shadow.png -resize 512x512 ../logo-shadow.png
magick mogrify -resize 192x192 -quality 100 -path ./192 *.png
optipng 192/*.png
cd -

upload 0.image_a markdown
upload 0.image_b video
upload 1.image_a javascript
upload 1.image_b svelte
upload 2.image_a rocket
upload 2.image_b cloud
upload 3.image_a git
upload 3.image_b hammer
