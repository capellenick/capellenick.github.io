"""Local preview server for the portfolio — `python3 serve.py [port] [--lan]`.

Same as `python3 -m http.server`, but tells the browser never to cache, so a
normal refresh always shows the latest HTML/CSS/JS. (Plain http.server sends
no cache headers, so Chrome reuses stale pages — the ?v=N query strings only
bust the CSS/JS, not the HTML pages that reference them.) Local use only;
the real host sets its own caching.

Only this computer can open it by default (127.0.0.1), so it's safe to leave
running on school/café Wi-Fi — otherwise anyone on the network could browse
the whole folder, .git included. Add --lan to let other devices on the same
network in (e.g. to check the site on a phone), then stop it when done.
Always serves this folder, whatever directory it's started from.
"""
import functools
import os
import socket
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    # Clean addresses, like GitHub Pages: /about serves about.html.
    def translate_path(self, path):
        p = super().translate_path(path)
        if not os.path.exists(p) and os.path.exists(p + ".html"):
            return p + ".html"
        return p

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--lan"]
    lan = "--lan" in sys.argv[1:]
    port = int(args[0]) if args else 4599
    handler = functools.partial(NoCacheHandler, directory=os.path.dirname(os.path.abspath(__file__)))
    server = ThreadingHTTPServer(("" if lan else "127.0.0.1", port), handler)
    print(f"Serving on http://localhost:{port} (no-cache)")
    if lan:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("10.255.255.255", 1))   # no packet is sent; just picks the Wi-Fi address
            print(f"Also open to this network: http://{s.getsockname()[0]}:{port}")
        except OSError:
            print("Also open to this network (--lan)")
    server.serve_forever()
