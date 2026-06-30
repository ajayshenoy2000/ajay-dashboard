"""Persistence for MetaScraper. Durable on Fly via Supabase; local SQLite
fallback for offline dev (mirrors the trend-engine dual pattern).

Three collections:
  * config   — single AppConfig blob (seeded from niches.seed.json on first read)
  * ads      — one AdRecord per library_id (the persistent store the diff merges into)
  * captures — one row per weekly hunt (audit trail + diff-since-last anchors)

Volume is tiny (a few hundred rows/week), so ads are persisted as a full
upsert sweep rather than fine-grained mutation — simplest correct thing.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from backend.db.supabase_client import get_client
from backend.metascraper.models import AdRecord, AppConfig, CaptureFile

_ROOT = Path(__file__).resolve().parents[2]
_SEED_PATH = Path(__file__).resolve().parent / "niches.seed.json"
_DATA_DIR = _ROOT / "data"
_SQLITE_PATH = _DATA_DIR / "metascraper.sqlite3"

_CONFIG_TABLE = "metascraper_config"
_ADS_TABLE = "metascraper_ads"
_CAPTURES_TABLE = "metascraper_captures"
_CONFIG_ID = "config"


def load_seed_config() -> AppConfig:
    with _SEED_PATH.open(encoding="utf-8") as handle:
        return AppConfig.from_dict(json.load(handle))


# ─── SQLite fallback ──────────────────────────────────────────────────────────
def _sqlite() -> sqlite3.Connection:
    _DATA_DIR.mkdir(exist_ok=True)
    conn = sqlite3.connect(_SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS metascraper_config (
            id TEXT PRIMARY KEY,
            payload TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS metascraper_ads (
            library_id TEXT PRIMARY KEY,
            payload TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS metascraper_captures (
            captured_date TEXT PRIMARY KEY,
            payload TEXT NOT NULL
        );
        """
    )
    return conn


# ─── Config ───────────────────────────────────────────────────────────────────
def load_config() -> AppConfig:
    client = get_client()
    if client is not None:
        rows = client.table(_CONFIG_TABLE).select("payload").eq("id", _CONFIG_ID).limit(1).execute()
        if rows.data:
            return AppConfig.from_dict(rows.data[0]["payload"])
        seeded = load_seed_config()
        save_config(seeded)
        return seeded

    with _sqlite() as conn:
        row = conn.execute(
            "SELECT payload FROM metascraper_config WHERE id = ?", (_CONFIG_ID,)
        ).fetchone()
        if row:
            return AppConfig.from_dict(json.loads(row["payload"]))
    seeded = load_seed_config()
    save_config(seeded)
    return seeded


def save_config(config: AppConfig) -> AppConfig:
    payload = config.as_dict()
    client = get_client()
    if client is not None:
        client.table(_CONFIG_TABLE).upsert({"id": _CONFIG_ID, "payload": payload}).execute()
        return config
    with _sqlite() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO metascraper_config (id, payload) VALUES (?, ?)",
            (_CONFIG_ID, json.dumps(payload, ensure_ascii=False)),
        )
    return config


def reset_config() -> AppConfig:
    return save_config(load_seed_config())


# ─── Ads ──────────────────────────────────────────────────────────────────────
def load_ads() -> list[AdRecord]:
    client = get_client()
    if client is not None:
        rows = client.table(_ADS_TABLE).select("payload").execute()
        return [AdRecord.from_dict(r["payload"]) for r in (rows.data or [])]
    with _sqlite() as conn:
        rows = conn.execute("SELECT payload FROM metascraper_ads").fetchall()
        return [AdRecord.from_dict(json.loads(r["payload"])) for r in rows]


def save_ads(ads: list[AdRecord]) -> None:
    """Full upsert sweep of the current store."""
    client = get_client()
    if client is not None:
        if ads:
            client.table(_ADS_TABLE).upsert(
                [{"library_id": a.library_id, "payload": a.as_dict()} for a in ads]
            ).execute()
        return
    with _sqlite() as conn:
        conn.executemany(
            "INSERT OR REPLACE INTO metascraper_ads (library_id, payload) VALUES (?, ?)",
            [(a.library_id, json.dumps(a.as_dict(), ensure_ascii=False)) for a in ads],
        )


def update_ad(ad: AdRecord) -> None:
    """Persist a single record (used by inline hook_category/notes edits)."""
    save_ads([ad])


def delete_all_ads() -> None:
    client = get_client()
    if client is not None:
        client.table(_ADS_TABLE).delete().neq("library_id", "").execute()
        return
    with _sqlite() as conn:
        conn.execute("DELETE FROM metascraper_ads")


# ─── Captures (audit trail) ───────────────────────────────────────────────────
def record_capture(capture: CaptureFile, summary: dict[str, Any]) -> None:
    payload = {
        "captured_date": capture.captured_date,
        "country": capture.country,
        "hunted_scope": capture.hunted_scope,
        "ad_count": len(capture.ads),
        **summary,
    }
    client = get_client()
    if client is not None:
        client.table(_CAPTURES_TABLE).upsert(
            {"captured_date": capture.captured_date, "payload": payload}
        ).execute()
        return
    with _sqlite() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO metascraper_captures (captured_date, payload) VALUES (?, ?)",
            (capture.captured_date, json.dumps(payload, ensure_ascii=False)),
        )


def list_captures() -> list[dict[str, Any]]:
    client = get_client()
    if client is not None:
        rows = client.table(_CAPTURES_TABLE).select("payload").execute()
        captures = [r["payload"] for r in (rows.data or [])]
    else:
        with _sqlite() as conn:
            rows = conn.execute("SELECT payload FROM metascraper_captures").fetchall()
            captures = [json.loads(r["payload"]) for r in rows]
    return sorted(captures, key=lambda c: c.get("captured_date", ""), reverse=True)


def previous_capture_date(before: str) -> str | None:
    """The most recent capture date strictly before `before` — anchors the
    diff-since-last view."""
    dates = [c["captured_date"] for c in list_captures() if c.get("captured_date", "") < before]
    return max(dates) if dates else None
