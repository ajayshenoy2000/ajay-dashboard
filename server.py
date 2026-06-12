#!/usr/bin/env python3
"""
Ajay Dashboard local server.
Serves static files on port 8080 and exposes /api/reminders backed by
Apple Reminders via osascript. Replaces `python -m http.server`.

Usage:  python3 server.py
"""

import http.server
import json
import os
import subprocess
import urllib.parse
from pathlib import Path

PORT = 8080
ROOT = Path(__file__).parent

# Name of the Reminders list to use. Created automatically if it doesn't exist.
REMINDERS_LIST = "Dashboard"


# ── AppleScript helpers ────────────────────────────────────────────────────────

def _run(script: str) -> str:
    r = subprocess.run(["osascript", "-e", script],
                       capture_output=True, text=True, timeout=15)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or "osascript error")
    return r.stdout.strip()


def _ensure_list(list_name: str):
    """Create the Reminders list if it doesn't exist."""
    safe = list_name.replace('"', '\\"')
    _run(f'''
tell application "Reminders"
    if not (exists list "{safe}") then
        make new list with properties {{name:"{safe}"}}
    end if
end tell''')


def _escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def get_reminders(list_name: str) -> list:
    _ensure_list(list_name)
    safe = _escape(list_name)
    out = _run(f'''
tell application "Reminders"
    set output to ""
    repeat with r in (reminders of list "{safe}" whose completed is false)
        set output to output & (id of r) & "\\t" & (name of r) & "\\n"
    end repeat
    return output
end tell''')
    items = []
    for line in out.split("\n"):
        if "\t" in line:
            rid, name = line.split("\t", 1)
            items.append({"id": rid.strip(), "text": name.strip(), "done": False})
    return items


def create_reminder(list_name: str, text: str) -> dict:
    _ensure_list(list_name)
    safe_list = _escape(list_name)
    safe_text = _escape(text)
    rid = _run(f'''
tell application "Reminders"
    set newR to make new reminder at end of list "{safe_list}" with properties {{name:"{safe_text}"}}
    return id of newR
end tell''')
    return {"id": rid.strip(), "text": text, "done": False}


def _find_and_act(list_name: str, rid: str, action: str):
    """Look up a reminder by id using a 'whose' filter (no loop, no -1728 error),
    then apply action inside a try block so missing ids are silently ignored."""
    safe_list = _escape(list_name)
    safe_id   = _escape(rid)
    _run(f'''
tell application "Reminders"
    try
        set r to first reminder of list "{safe_list}" whose id is "{safe_id}"
        {action}
    end try
end tell''')


def complete_reminder(list_name: str, rid: str):
    _find_and_act(list_name, rid, "set completed of r to true")


def delete_reminder(list_name: str, rid: str):
    _find_and_act(list_name, rid, "delete r")


# ── HTTP handler ───────────────────────────────────────────────────────────────

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    # ── helpers ──

    def _parse_id(self) -> str | None:
        qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        ids = qs.get("id")
        return ids[0] if ids else None

    def _read_body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length)) if length else {}

    def _json(self, code: int, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    # ── CORS pre-flight ──

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    # ── routes ──

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/reminders":
            try:
                self._json(200, get_reminders(REMINDERS_LIST))
            except Exception as e:
                self._json(500, {"error": str(e)})
            return
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/reminders":
            body = self._read_body()
            text = (body.get("text") or "").strip()
            if not text:
                self._json(400, {"error": "text is required"})
                return
            try:
                self._json(201, create_reminder(REMINDERS_LIST, text))
            except Exception as e:
                self._json(500, {"error": str(e)})
            return
        self._json(404, {"error": "not found"})

    def do_PATCH(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/reminders":
            rid = self._parse_id()
            if not rid:
                self._json(400, {"error": "id is required"})
                return
            body = self._read_body()
            try:
                if body.get("done"):
                    complete_reminder(REMINDERS_LIST, rid)
                self._json(200, {"ok": True})
            except Exception as e:
                self._json(500, {"error": str(e)})
            return
        self._json(404, {"error": "not found"})

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/reminders":
            rid = self._parse_id()
            if not rid:
                self._json(400, {"error": "id is required"})
                return
            try:
                delete_reminder(REMINDERS_LIST, rid)
                self._json(200, {"ok": True})
            except Exception as e:
                self._json(500, {"error": str(e)})
            return
        self._json(404, {"error": "not found"})

    def log_message(self, fmt, *args):
        pass  # suppress per-request noise


# ── entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"Dashboard → http://localhost:{PORT}")
    print(f"Reminders list: '{REMINDERS_LIST}'")
    with http.server.HTTPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()
