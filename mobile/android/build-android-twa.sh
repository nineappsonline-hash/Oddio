#!/usr/bin/env bash
# Generate an Android Trusted Web Activity from the already deployed Oddio PWA.
# No credentials are committed. Run on Ubuntu with Android SDK, JDK and Node.
set -euo pipefail
: "${ODDIO_ANDROID_PACKAGE_ID:?Provide your owned unique Android package ID}"
: "${ODDIO_ANDROID_KEYSTORE:?Provide path to a local signing keystore (never commit)}"
if [[ ! -f "$ODDIO_ANDROID_KEYSTORE" ]]; then
  echo "Signing keystore not found: $ODDIO_ANDROID_KEYSTORE" >&2
  exit 1
fi
echo "Oddio Android package: $ODDIO_ANDROID_PACKAGE_ID"
echo "Verify the deployed https://oddio.online/manifest.webmanifest and icons first."
echo "Use Bubblewrap's interactive initialization to set the package ID and signing certificate."
echo "Command: npx --yes @bubblewrap/cli init --manifest=https://oddio.online/manifest.webmanifest"
echo "Then run: npx --yes @bubblewrap/cli build"
echo "IMPORTANT: Digital Asset Links requires the actual signing certificate SHA256."
echo "Do not publish until https://oddio.online/.well-known/assetlinks.json is verified."
