import SwiftUI

// Native iOS packaging starting point for a real Xcode project.
// WKWebView loads the existing HTTPS Next.js service, not a fake static export.
@main
struct OddioApp: App {
    var body: some Scene {
        WindowGroup {
            OddioWebView()
                .ignoresSafeArea(edges: .bottom)
        }
    }
}
