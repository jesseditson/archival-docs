#!/bin/bash
# This file downloads the latest versions of archival, which will allow runing
# bin/archival on all platforms.
# When you need to update to a new version of archival, run this file.

set -e

cd $(dirname "$0")

rm -rf tmp
mkdir tmp

release_url="https://api.github.com/repos/jesseditson/archival/releases/latest"
[[ ! -z "$1" ]] && release_url="https://api.github.com/repos/jesseditson/archival/releases/tags/$1"

# download all files in the latest release
while read -r file; do
echo $file
    curl -O -L --output-dir tmp $file
done < <(curl -s $release_url | grep "browser_download_url" | cut -d : -f 2,3 | tr -d \")

# for each tar
for f in tmp/*.tar.gz; do
    # get the name of the containing folder, and strip the trailing slash
    FOLDER_NAME=$(tar -ztf $f | grep "/$")
    FOLDER_NAME=${FOLDER_NAME%/}
    echo $FOLDER_NAME
    # strip the binary and release name, leaving us with the platform
    PLATFORM=$(echo $FOLDER_NAME | cut -d - -f 3-)
    # extract just the binary for this platform
    tar -xzf $f $FOLDER_NAME
    # rename it to indicate which platform it is for
    if [[ -e "$FOLDER_NAME/archival.exe" ]]; then
        mv "$FOLDER_NAME/archival.exe" "archival-$PLATFORM.exe"
    else
        mv "$FOLDER_NAME/archival" "archival-$PLATFORM"
    fi
    # clean up
    rm -r $FOLDER_NAME
done

rm -rf tmp
