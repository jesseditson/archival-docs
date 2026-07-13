#!/usr/bin/env bash
# Verifies every marketing/docs page has unique title, a meta description, and a canonical URL.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

fail=0
pages=$(find dist -name '*.html' ! -path 'dist/api/*')

for f in $pages; do
  grep -q '<meta name="description"' "$f" || { echo "MISSING description: $f"; fail=1; }
  grep -q '<link rel="canonical"' "$f"    || { echo "MISSING canonical:   $f"; fail=1; }
done

dupes=$(grep -ho '<title>[^<]*</title>' $pages | sort | uniq -d)
if [ -n "$dupes" ]; then
  echo "DUPLICATE titles:"; echo "$dupes"; fail=1
fi

if [ "$fail" -eq 0 ]; then echo "PASS: all pages have unique titles, descriptions, and canonicals"; fi
exit "$fail"
