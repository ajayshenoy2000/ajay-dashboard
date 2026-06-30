"""Optional Google Sheets mirror via an Apps Script Web App (§10.1).

Rather than a service account + Google SDK, we POST processed rows to a Google
Apps Script Web App bound to the user's sheet (see Code.gs in the route README).
The script runs as the user, so it has native sheet access — no key files, no
new Python deps (reuses httpx).

Fully gated: if METASCRAPER_SHEET_WEBHOOK_URL is unset, every call is a no-op
that returns a clear status, so the build/ingest never breaks without it.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from backend.config import settings
from backend.metascraper.diff import is_proven, longevity_ranks
from backend.metascraper.models import AdRecord

logger = logging.getLogger(__name__)

# Column order written to the sheet (header row managed by the Apps Script).
SHEET_COLUMNS = [
    "library_id", "status", "page_name", "niche_id", "days_active",
    "weeks_observed", "started_running_date", "first_seen", "last_seen",
    "media_type", "platforms", "cta_label", "hook_category", "proven",
    "longevity_rank", "ad_library_url", "landing_url", "media_url",
    "primary_text", "headline", "notes",
]


def is_configured() -> bool:
    return bool(settings.metascraper_sheet_webhook_url)


def _row_for(ad: AdRecord, rank: float | None) -> dict[str, Any]:
    return {
        "library_id": ad.library_id,
        "status": ad.status,
        "page_name": ad.page_name,
        "niche_id": ad.niche_id,
        "days_active": ad.days_active,
        "weeks_observed": ad.weeks_observed,
        "started_running_date": ad.started_running_date,
        "first_seen": ad.first_seen,
        "last_seen": ad.last_seen,
        "media_type": ad.media_type,
        "platforms": ",".join(ad.platforms),
        "cta_label": ad.cta_label,
        "hook_category": ad.hook_category,
        "proven": "yes" if is_proven(ad.days_active) else "",
        "longevity_rank": rank,
        "ad_library_url": ad.ad_library_url,
        "landing_url": ad.landing_url,
        "media_url": ad.media_url,
        "primary_text": ad.primary_text,
        "headline": ad.headline,
        "notes": ad.notes,
    }


def sync(ads: list[AdRecord]) -> dict[str, Any]:
    """Upsert the full processed store into the sheet (keyed by library_id).

    Returns a status dict; never raises — a sheet failure must not fail the
    ingest, since Supabase remains the source of truth.
    """
    if not is_configured():
        return {"synced": False, "reason": "sheet_webhook_not_configured"}

    ranks = longevity_ranks(ads)
    rows = [_row_for(ad, ranks.get(ad.library_id)) for ad in ads]
    body = {
        "secret": settings.metascraper_sheet_secret or "",
        "columns": SHEET_COLUMNS,
        "key": "library_id",
        "rows": rows,
    }
    try:
        response = httpx.post(
            settings.metascraper_sheet_webhook_url,
            json=body,
            timeout=30.0,
            follow_redirects=True,  # Apps Script /exec issues a 302 to script.googleusercontent.com
        )
        response.raise_for_status()
        return {"synced": True, "rows": len(rows)}
    except Exception as exc:  # noqa: BLE001 — best-effort mirror
        logger.warning("MetaScraper sheet sync failed: %s", exc)
        return {"synced": False, "reason": str(exc)}
