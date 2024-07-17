#!/bin/bash
set -e

ROOT="/Users/jesseditson/Library/Mobile Documents/com~apple~CloudDocs/archival/renders/sections"

function upload {
    archival upload home sections.$1 "$ROOT/128/$2.png"
    archival upload home sections.${1}_shadow "$ROOT/128/$2-shadow.png"
}

cd "$ROOT"
magick mogrify -resize 192x192 -quality 100 -path ./128 *.png
optipng 128/*.png
cd -

upload 0.image_a markdown
upload 0.image_b video
upload 1.image_a javascript
upload 1.image_b svelte
upload 2.image_a rocket
upload 2.image_b cloud
upload 3.image_a git
upload 3.image_b hammer
