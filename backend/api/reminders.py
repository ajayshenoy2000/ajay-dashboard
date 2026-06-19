"""Apple Reminders integration via osascript.

macOS-only (osascript doesn't exist on Fly.io/Linux), so this is local-dev-only —
routes return 503 on other platforms instead of failing to import or boot.
"""

from __future__ import annotations

import platform
import subprocess

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/reminders")

REMINDERS_AVAILABLE = platform.system() == "Darwin"
_reminders_list: str = "Dashboard"


class CreateReminderRequest(BaseModel):
    text: str


class UpdateReminderRequest(BaseModel):
    done: bool = False


def _require_macos() -> None:
    if not REMINDERS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Reminders integration is only available on macOS (local dev)")


def _run(script: str) -> str:
    result = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=15)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "osascript error")
    return result.stdout.strip()


def _ensure_list(list_name: str) -> None:
    safe = list_name.replace('"', '\\"')
    _run(f'''
tell application "Reminders"
    if not (exists list "{safe}") then
        make new list with properties {{name:"{safe}"}}
    end if
end tell''')


def _escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def _get_reminders(list_name: str, include_completed: bool = False) -> list[dict]:
    _ensure_list(list_name)
    safe = _escape(list_name)
    filter_clause = "" if include_completed else " whose completed is false"
    out = _run(f'''
tell application "Reminders"
    set output to ""
    repeat with r in (reminders of list "{safe}"{filter_clause})
        set doneFlag to "0"
        if completed of r then set doneFlag to "1"
        set output to output & (id of r) & "\\t" & (name of r) & "\\t" & doneFlag & "\\n"
    end repeat
    return output
end tell''')
    items = []
    for line in out.split("\n"):
        if "\t" in line:
            parts = line.split("\t", 2)
            if len(parts) >= 2:
                rid = parts[0].strip()
                name = parts[1].strip()
                done = len(parts) >= 3 and parts[2].strip() == "1"
                items.append({"id": rid, "text": name, "done": done})
    return items


def _get_all_lists() -> list[str]:
    out = _run('''
tell application "Reminders"
    set output to ""
    repeat with l in lists
        set output to output & (name of l) & "\\n"
    end repeat
    return output
end tell''')
    return [line.strip() for line in out.split("\n") if line.strip()]


def _create_reminder(list_name: str, text: str) -> dict:
    _ensure_list(list_name)
    safe_list = _escape(list_name)
    safe_text = _escape(text)
    rid = _run(f'''
tell application "Reminders"
    set newR to make new reminder at end of list "{safe_list}" with properties {{name:"{safe_text}"}}
    return id of newR
end tell''')
    return {"id": rid.strip(), "text": text, "done": False}


def _find_and_act(list_name: str, rid: str, action: str) -> None:
    safe_list = _escape(list_name)
    safe_id = _escape(rid)
    _run(f'''
tell application "Reminders"
    try
        set r to first reminder of list "{safe_list}" whose id is "{safe_id}"
        {action}
    end try
end tell''')


def _complete_reminder(list_name: str, rid: str) -> None:
    _find_and_act(list_name, rid, "set completed of r to true")


def _delete_reminder(list_name: str, rid: str) -> None:
    _find_and_act(list_name, rid, "delete r")


class SetListRequest(BaseModel):
    list: str


@router.get("/health")
def reminders_health() -> dict:
    return {
        "available": REMINDERS_AVAILABLE,
        "list": _reminders_list,
        "platform": platform.system(),
    }


@router.get("/lists")
def get_lists() -> list[str]:
    _require_macos()
    try:
        return _get_all_lists()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
def get_list() -> dict:
    return {"list": _reminders_list}


@router.post("/list")
def set_list(payload: SetListRequest) -> dict:
    global _reminders_list
    name = payload.list.strip()
    if not name:
        raise HTTPException(status_code=400, detail="list name is required")
    _require_macos()
    try:
        _ensure_list(name)
        _reminders_list = name
        return {"list": _reminders_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
def list_reminders(include_completed: bool = False) -> list[dict]:
    _require_macos()
    try:
        return _get_reminders(_reminders_list, include_completed=include_completed)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
def create_reminder(payload: CreateReminderRequest) -> dict:
    _require_macos()
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    try:
        return _create_reminder(_reminders_list, text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{reminder_id}")
def update_reminder(reminder_id: str, payload: UpdateReminderRequest) -> dict:
    _require_macos()
    try:
        if payload.done:
            _complete_reminder(_reminders_list, reminder_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{reminder_id}")
def delete_reminder(reminder_id: str) -> dict:
    _require_macos()
    try:
        _delete_reminder(_reminders_list, reminder_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
