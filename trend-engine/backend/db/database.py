from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any


ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data"
DB_PATH = DATA_DIR / "trend_engine.sqlite3"


def get_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS raw_source_items (
                id TEXT PRIMARY KEY,
                source TEXT NOT NULL,
                payload TEXT NOT NULL,
                collected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS processed_trends (
                id TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS briefs (
                id TEXT PRIMARY KEY,
                trend_id TEXT NOT NULL,
                payload TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            """
        )


def upsert_json(table: str, item_id: str, payload: dict[str, Any]) -> None:
    if table not in {"raw_source_items", "processed_trends", "briefs"}:
        raise ValueError(f"Unsupported table: {table}")
    with get_connection() as connection:
        id_column = "id"
        columns = f"{id_column}, payload"
        values = "?, ?"
        if table == "briefs":
            columns = "id, trend_id, payload"
            values = "?, ?, ?"
            params = (item_id, payload["trendId"], json.dumps(payload, ensure_ascii=False))
        else:
            params = (item_id, json.dumps(payload, ensure_ascii=False))
        connection.execute(
            f"INSERT OR REPLACE INTO {table} ({columns}) VALUES ({values})",
            params,
        )
