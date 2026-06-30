"""MetaScraper service layer — orchestrates store + diff + sheet sync, and
builds the read-model the dashboard consumes."""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from backend.metascraper import sheets, store
from backend.metascraper.diff import is_proven, longevity_ranks, merge_capture
from backend.metascraper.models import GROUP_LABELS, AdRecord, AppConfig, CaptureFile


def _today_iso() -> str:
    return datetime.now(timezone.utc).date().isoformat()


# ─── Config ───────────────────────────────────────────────────────────────────
def get_config() -> AppConfig:
    return store.load_config()


def save_config(data: dict[str, Any]) -> AppConfig:
    return store.save_config(AppConfig.from_dict(data))


def reset_config() -> AppConfig:
    return store.reset_config()


# ─── Ingest (the auto-fed endpoint) ───────────────────────────────────────────
def ingest_capture(capture: CaptureFile) -> dict[str, Any]:
    """Merge a capture into the store, persist, record the run, mirror to the
    sheet. Returns a summary the caller (and Claude-in-Chrome) can log."""
    today = _today_iso()
    before = store.load_ads()
    before_by_id = {a.library_id: a for a in before}

    merged = merge_capture(before, capture, today=today)
    store.save_ads(merged)

    # Tally what changed this run.
    merged_by_id = {a.library_id: a for a in merged}
    new_ids = [a.library_id for a in merged if a.status == "new" and a.library_id not in before_by_id]
    killed_ids = [
        a.library_id for a in merged
        if a.status == "killed" and before_by_id.get(a.library_id) is not None
        and before_by_id[a.library_id].status != "killed"
    ]
    summary = {
        "ingested": len(capture.ads),
        "store_size": len(merged),
        "new": len(new_ids),
        "killed_this_run": len(killed_ids),
        "running": sum(1 for a in merged if a.status == "running"),
    }
    store.record_capture(capture, summary)

    sheet_result = sheets.sync(merged)
    summary["sheet"] = sheet_result
    return summary


# ─── Read model for the dashboard ─────────────────────────────────────────────
def _ad_view(ad: AdRecord, rank: float | None) -> dict[str, Any]:
    data = ad.as_dict()
    data["proven"] = is_proven(ad.days_active)
    data["longevity_rank"] = rank
    return data


def get_ads_view() -> list[dict[str, Any]]:
    ads = store.load_ads()
    ranks = longevity_ranks(ads)
    view = [_ad_view(a, ranks.get(a.library_id)) for a in ads]
    # Longevity is the signal — default sort by days_active desc (nulls last).
    view.sort(key=lambda a: (a["days_active"] is not None, a["days_active"] or 0), reverse=True)
    return view


def get_summary() -> dict[str, Any]:
    """Per-niche summary cards + overall counts."""
    ads = store.load_ads()
    config = store.load_config()
    label = {n.id: n.label_jp for n in config.niches}
    group_of = {n.id: n.group for n in config.niches}

    per_niche: dict[str, dict[str, Any]] = {}
    for ad in ads:
        bucket = per_niche.setdefault(
            ad.niche_id,
            {
                "niche_id": ad.niche_id,
                "label_jp": label.get(ad.niche_id, ad.niche_id),
                "group": group_of.get(ad.niche_id, "other"),
                "group_label": GROUP_LABELS.get(group_of.get(ad.niche_id, "other"), "その他"),
                "active": 0,
                "killed": 0,
                "new": 0,
                "longest_days": None,
                "longest_ad": None,
            },
        )
        if ad.status == "killed":
            bucket["killed"] += 1
        else:
            bucket["active"] += 1
        if ad.status == "new":
            bucket["new"] += 1
        if ad.days_active is not None and (bucket["longest_days"] is None or ad.days_active > bucket["longest_days"]):
            bucket["longest_days"] = ad.days_active
            bucket["longest_ad"] = {
                "library_id": ad.library_id,
                "page_name": ad.page_name,
                "ad_library_url": ad.ad_library_url,
            }

    return {
        "totals": {
            "tracked": len(ads),
            "active": sum(1 for a in ads if a.status != "killed"),
            "killed": sum(1 for a in ads if a.status == "killed"),
            "proven": sum(1 for a in ads if is_proven(a.days_active)),
        },
        "niches": sorted(per_niche.values(), key=lambda n: n["active"], reverse=True),
        "last_capture": (store.list_captures() or [{}])[0].get("captured_date"),
    }


def get_diff_since_last() -> dict[str, Any]:
    """New + killed since the previous capture date — the weekly delta view."""
    captures = store.list_captures()
    if not captures:
        return {"since": None, "current": None, "new": [], "killed": []}

    current_date = captures[0]["captured_date"]
    prev_date = store.previous_capture_date(current_date)
    ads = store.load_ads()
    ranks = longevity_ranks(ads)

    new = [_ad_view(a, ranks.get(a.library_id)) for a in ads if a.first_seen == current_date]
    killed = [
        _ad_view(a, ranks.get(a.library_id))
        for a in ads
        if a.status == "killed" and prev_date is not None and a.last_seen == prev_date
    ]
    return {
        "since": prev_date,
        "current": current_date,
        "new": new,
        "killed": killed,
    }


def patch_ad(library_id: str, hook_category: str | None, notes: str | None) -> dict[str, Any] | None:
    ads = store.load_ads()
    target = next((a for a in ads if a.library_id == library_id), None)
    if target is None:
        return None
    if hook_category is not None:
        target.hook_category = hook_category or None
    if notes is not None:
        target.notes = notes or None
    store.update_ad(target)
    ranks = longevity_ranks(ads)
    return _ad_view(target, ranks.get(library_id))


def health() -> dict[str, Any]:
    from backend.config import settings

    return {
        "ingest_token_set": bool(settings.metascraper_ingest_token),
        "sheet_configured": sheets.is_configured(),
        "store_size": len(store.load_ads()),
        "last_capture": (store.list_captures() or [{}])[0].get("captured_date"),
    }
