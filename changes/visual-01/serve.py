"""Serve this worktree's design/blueprint without HTTP caching (Phase C visual work).

Usage (from the worktree root):
    python3 changes/visual-01/serve.py [port]    # default 8881; 8879 stays the frozen interview-01 server
"""
import functools
import http.server
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2] / "design" / "blueprint"


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8881
    handler = functools.partial(NoCacheHandler, directory=str(ROOT))
    http.server.ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()
