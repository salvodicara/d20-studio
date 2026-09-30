"""Serve design/blueprint locally without HTTP caching, so updated ES modules are never stale.

Usage (from the worktree root):
    python3 changes/interview-01/blueprint-checks/serve-nocache.py
"""
import functools
import http.server
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[3] / "design" / "blueprint"


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


if __name__ == "__main__":
    handler = functools.partial(NoCacheHandler, directory=str(ROOT))
    http.server.ThreadingHTTPServer(("127.0.0.1", 8879), handler).serve_forever()
