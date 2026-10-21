"""Local preview server for the portfolio — `python3 serve.py [port]`.

Same as `python3 -m http.server`, but tells the browser never to cache, so a
normal refresh always shows the latest HTML/CSS/JS. (Plain http.server sends
no cache headers, so Chrome reuses stale pages — the ?v=N query strings only
bust the CSS/JS, not the HTML pages that reference them.) Local use only;
the real host sets its own caching.
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4599
    print(f"Serving on http://localhost:{port} (no-cache)")
    ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()
