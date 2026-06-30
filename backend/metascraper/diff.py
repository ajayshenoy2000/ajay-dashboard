"""Diff & longevity engine (§8). Pure, deterministic, fully unit-testable.

Given the existing AdRecord store and a new CaptureFile, produce the merged
store with new/running/killed status and longevity metrics recomputed. No I/O,
no clock reads except the explicit `today` argument so tests are reproducible.

Key invariants:
  * Match on library_id.
  * Only ads inside the run's hunted_scope can be marked killed — a partial
    hunt must never false-kill untouched niches/competitors.
  * Manual fields (hook_category, notes) survive every merge.
"""

from __future__ import annotations

from dataclasses import replace
from datetime import date

from backend.metascraper.models import AdRecord, CaptureFile, normalize_media_type

PROVEN_DAYS = 56  # 8 weeks — the "proven" longevity threshold.


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except (ValueError, TypeError):
        return None


def compute_days_active(
    started_running_date: str | None,
    anchor: str,
) -> int | None:
    """Whole days between the ad's start date and `anchor` (today if running,
    last_seen if killed). Null-safe: returns None when start date is missing."""
    start = _parse_date(started_running_date)
    end = _parse_date(anchor)
    if start is None or end is None:
        return None
    return max((end - start).days, 0)


def is_proven(days_active: int | None) -> bool:
    return days_active is not None and days_active > PROVEN_DAYS


def _scope_contains(scope: set[str], record: AdRecord) -> bool:
    """Was this record's niche/advertiser actually queried this run? An ad is
    in scope if its niche_id is in the hunted scope, or its page_id was tracked
    as a competitor in scope. niche_id is the primary bound."""
    if record.niche_id and record.niche_id in scope:
        return True
    if record.page_id and record.page_id in scope:
        return True
    return False


def merge_capture(
    store: list[AdRecord],
    capture: CaptureFile,
    today: str,
) -> list[AdRecord]:
    """Merge one capture into the store and return the new store.

    `today` is the ISO date used as the longevity anchor for still-running ads
    (passed explicitly so the engine stays pure and testable).
    """
    captured_date = capture.captured_date
    incoming = {str(a["library_id"]): a for a in capture.ads if a.get("library_id")}
    by_id = {r.library_id: r for r in store}

    # Bound the kill sweep. If the capture didn't declare a scope, fall back to
    # the niches present in the capture's own ads — never the whole store.
    scope: set[str] = set(capture.hunted_scope)
    if not scope:
        scope = {str(a.get("niche_id")) for a in capture.ads if a.get("niche_id")}

    result: list[AdRecord] = []
    seen_ids: set[str] = set()

    # 1. New + running: walk the incoming capture.
    for library_id, payload in incoming.items():
        seen_ids.add(library_id)
        existing = by_id.get(library_id)
        fresh = AdRecord.from_dict(payload)

        if existing is None:
            # NEW — first time we've seen this creative.
            fresh.status = "new"
            fresh.first_seen = captured_date
            fresh.last_seen = captured_date
            fresh.weeks_observed = 1
            fresh.days_active = compute_days_active(fresh.started_running_date, today)
            result.append(fresh)
        else:
            # RUNNING — refresh mutable fields, bump observation counters,
            # preserve manual tags and first_seen.
            merged = replace(
                existing,
                # Refresh capturable fields from the latest payload.
                page_name=fresh.page_name or existing.page_name,
                page_id=fresh.page_id or existing.page_id,
                primary_text=fresh.primary_text or existing.primary_text,
                headline=fresh.headline if fresh.headline is not None else existing.headline,
                description=fresh.description if fresh.description is not None else existing.description,
                cta_label=fresh.cta_label if fresh.cta_label is not None else existing.cta_label,
                media_type=normalize_media_type(payload.get("media_type")) if payload.get("media_type") else existing.media_type,
                platforms=fresh.platforms or existing.platforms,
                started_running_date=fresh.started_running_date or existing.started_running_date,
                ad_library_url=fresh.ad_library_url or existing.ad_library_url,
                landing_url=fresh.landing_url if fresh.landing_url is not None else existing.landing_url,
                media_url=fresh.media_url if fresh.media_url is not None else existing.media_url,
                # Managed counters.
                status="running",
                last_seen=captured_date,
                weeks_observed=existing.weeks_observed + (0 if existing.last_seen == captured_date else 1),
                # Manual fields explicitly preserved.
                hook_category=existing.hook_category,
                notes=existing.notes,
            )
            merged.days_active = compute_days_active(merged.started_running_date, today)
            result.append(merged)

    # 2. Killed / untouched: walk the rest of the store.
    for record in store:
        if record.library_id in seen_ids:
            continue
        if _scope_contains(scope, record) and record.status != "killed":
            # Absent from a run that DID query its niche → killed. Freeze
            # last_seen, anchor days_active to last_seen.
            killed = replace(record, status="killed")
            killed.days_active = compute_days_active(killed.started_running_date, killed.last_seen)
            result.append(killed)
        else:
            # Out of scope this run, or already killed → carry forward untouched.
            result.append(record)

    return result


def longevity_ranks(store: list[AdRecord]) -> dict[str, float]:
    """Percentile rank (0–100) of days_active within each niche. Ads with no
    days_active are excluded from ranking and omitted from the result."""
    ranks: dict[str, float] = {}
    by_niche: dict[str, list[AdRecord]] = {}
    for record in store:
        if record.days_active is None:
            continue
        by_niche.setdefault(record.niche_id, []).append(record)

    for records in by_niche.values():
        ordered = sorted(records, key=lambda r: r.days_active or 0)
        n = len(ordered)
        for index, record in enumerate(ordered):
            # Percentile = share of records at or below this one.
            ranks[record.library_id] = round(((index + 1) / n) * 100, 1)
    return ranks
