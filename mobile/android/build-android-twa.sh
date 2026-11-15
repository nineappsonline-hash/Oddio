#!/usr/bin/env bash
# Oddio Android TWA build entry point. Nothing signs or deploys automatically.
set -euo pipefail
ACTION="${1:-help}"
case "$ACTION" in
  init)
    echo "Initializing an Android Trusted Web Activity from the live Oddio PWA."
    echo "Verify icon, package identifier and Android SDK configuration interactively."
    exec npx --yes @bubblewrap/cli init --manifest=https://oddio.online/manifest.webmanifest
    ;;
  build)
    if [[ ! -f twa-manifest.json ]]; then
      echo "No Bubblewrap project: run '$0 init' in a fresh Android build directory first." >&2
      exit 1
    fi
    echo "Building Android TWA with locally configured keystore (do not commit secrets)."
    exec npx --yes @bubblewrap/cli build
    ;;
  *)
    echo "Usage: $0 init|build"
    echo "init — interactive creation from https://oddio.online/manifest.webmanifest"
    echo "build — compile an initialized TWA project using the local signing setup"
    ;;
esac
