#!/bin/bash
set -euo pipefail
root="$(dirname "$(dirname "$(realpath "$0")")")"
export PATH="$HOME/.cargo/bin:$PATH"
npm --prefix "$root" run tauri:build -- --bundles app
version="$(node -p "JSON.parse(require('fs').readFileSync('$root/src-tauri/tauri.conf.json')).version")"
arch="$(uname -m)"
[ "$arch" = "arm64" ] && arch="aarch64"
app="$root/src-tauri/target/release/bundle/macos/轻影.app"
staging="$(mktemp -d "${TMPDIR:-/tmp/}lightvid-dmg.XXXXXX")"
trap 'rm -rf "$staging"' EXIT

# Seal sidecars and resources after bundling. This is ad-hoc, not Apple notarization.
for binary in "$app"/Contents/MacOS/*; do
  codesign --force --sign - "$binary"
done
find "$app/Contents/Resources/desktop-ai" -type f \( -name '*.node' -o -name '*.dylib' \) -exec codesign --force --sign - {} \;
codesign --force --sign - "$app/Contents/Resources/desktop-ai/native/lightvid-enhance"
codesign --force --sign - "$app"
codesign --verify --deep --strict --verbose=2 "$app"
ditto "$app" "$staging/轻影.app"
ln -s /Applications "$staging/Applications"
output="$root/public/downloads/轻影_${version}_${arch}.dmg"
hdiutil create -volname "轻影 ${version}" -srcfolder "$staging" -format UDZO -ov "$output"
hdiutil verify "$output"
shasum -a 256 "$output"


# The archive must contain the final signed app, not the earlier Tauri bundle.
node "$root/scripts/build-update.mjs"
