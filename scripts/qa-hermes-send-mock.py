#!/usr/bin/env python3
"""Minimal Hermes bridge mock for QA (POST /send). Writes last payload to /tmp/qa-hermes-last-send.json."""
from __future__ import annotations

import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("qa-hermes-mock: " + (fmt % args) + "\n")

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b""
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except Exception:
            payload = {"raw": raw.decode("utf-8", errors="replace")}
        with open("/tmp/qa-hermes-last-send.json", "w", encoding="utf-8") as fh:
            json.dump(payload, fh)
        body = b'{"ok":true}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    sys.stderr.write(f"qa-hermes-mock listening on :{port}\n")
    server.serve_forever()


if __name__ == "__main__":
    main()
