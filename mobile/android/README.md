# Oddio Android — production-domain Trusted Web Activity groundwork

Oddio is a dynamic Next.js streaming service, so do **not** use a static Next.js export as the native app's primary UI. Android's **Trusted Web Activity (TWA)** opens the real HTTPS web app in a verified browser context and preserves the same design, account cookies and R2 playback authorization.

## Developer build on Ubuntu

1. Confirm `https://oddio.online/manifest.webmanifest` is publicly accessible, that a real square PNG icon exists at the manifest path, and that the website + PWA installability work on Android first.
2. Install Android Studio/SDK and JDK as required by the current Bubblewrap instructions.
3. Initialize using `npx --yes @bubblewrap/cli init --manifest=https://oddio.online/manifest.webmanifest` from a fresh Android wrapper work directory, **outside** the Next.js source tree. Choose a package identifier you control.
4. Run `npx --yes @bubblewrap/cli build` to build an APK/AAB. Bubblewrap needs your actual Android signing keystore. Never commit the keystore or signing passwords.
5. Create `https://oddio.online/.well-known/assetlinks.json` **only after** the package ID and SHA-256 signing certificate fingerprint are known. You cannot invent a valid fingerprint. Verify TWA origin validation: otherwise Android opens a Custom Tab with browser chrome.
6. Test login persistence, signed Cloudflare R2 streams, Android lock-screen controls, navigation, deep links, lyrics and interruption recovery on real Android devices before releasing.

This folder is a release scaffold and procedure, **not a built or signed APK**. It deliberately leaves out unverified signing identifiers and secrets. Publishing through Google Play has separate enrollment and compliance requirements.

Official developer reference: https://developer.android.com/develop/ui/views/layout/webapps/guide-trusted-web-activities-version2
