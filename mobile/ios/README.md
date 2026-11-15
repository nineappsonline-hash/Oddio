# Oddio iOS — Xcode source scaffold (not an IPA)

Two native SwiftUI source files are supplied to start an iOS wrapper which displays the real `https://oddio.online` service with Oddio's identical interface. Add both files to a newly created iOS App target in **Xcode on macOS**; set the app's bundle identifier, branded icons, entitlements and signing team under your own Apple developer identity.

**Limitations:** iOS build/signing cannot be completed on Ubuntu without a macOS build environment. App Store review may reject a minimal WebView wrapper for insufficient native functionality. Before store submission, add genuine device-level value such as a properly tested Now Playing integration, background-audio policy, native error/reconnect UX, accessibility, and account deletion compliance; check the latest Apple review rules. This scaffold does not claim background playback or offline rights. Do not include blanket ATS security exceptions or copy signed Cloudflare audio URLs into native storage.

**Sign-in/authentication:** WebKit's default website data store is used for persistent first-party cookies; validate OAuth redirects, logout and external provider handling on physical devices. Other HTTPS links open Safari and private R2 stream requests are authorized through Oddio's existing playback endpoint.

**Status:** Source scaffold only. No `.xcodeproj`, IPA, entitlement approval, signing keys or app-store submission is generated.
