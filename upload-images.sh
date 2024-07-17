#!/bin/bash
set -e

function upload {
    archival upload home sections.$1 /Users/jesseditson/Library/Mobile\ Documents/com\~apple\~CloudDocs/archival/renders/sections/128/$2.png
    archival upload home sections.${1}_shadow /Users/jesseditson/Library/Mobile\ Documents/com\~apple\~CloudDocs/archival/renders/sections/128/$2-shadow.png
}

upload 0.image_a markdown
upload 0.image_b video
upload 1.image_a javascript
upload 1.image_b svelte
upload 2.image_a rocket
upload 2.image_b cloud
upload 3.image_a git
upload 3.image_b hammer
