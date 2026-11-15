import SwiftUI
import WebKit
import UIKit

/// A minimal iOS web shell preserving Oddio's real online design and account.
/// This is NOT a background-audio, offline or App Store approved implementation.
struct OddioWebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = [.audio, .video]
        configuration.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 16/255, green: 12/255, blue: 13/255, alpha: 1)
        if let url = URL(string: "https://oddio.online/en") {
            webView.load(URLRequest(url: url))
        }
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator() }

    class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }
            // Keep authentication and playback inside the owned HTTPS origin.
            // Other HTTPS destinations open in Safari, not inside the app.
            if url.scheme == "https" && url.host == "oddio.online" {
                decisionHandler(.allow)
            } else if url.scheme == "https" {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
            } else {
                decisionHandler(.cancel)
            }
        }
    }
}
