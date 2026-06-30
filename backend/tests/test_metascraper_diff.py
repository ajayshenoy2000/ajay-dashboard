"""Unit tests for the MetaScraper diff & longevity engine (§8)."""

from __future__ import annotations

from backend.metascraper.diff import (
    compute_days_active,
    is_proven,
    longevity_ranks,
    merge_capture,
)
from backend.metascraper.models import AdRecord, CaptureFile


def _ad_payload(library_id: str, niche_id: str = "futae", **overrides):
    base = {
        "library_id": library_id,
        "niche_id": niche_id,
        "page_name": "○○美容クリニック",
        "page_id": "100123",
        "primary_text": "二重整形のキャンペーン",
        "headline": "今だけ",
        "cta_label": "予約する",
        "media_type": "video",
        "platforms": ["FACEBOOK", "INSTAGRAM"],
        "started_running_date": "2026-04-01",
        "ad_library_url": f"https://www.facebook.com/ads/library/?id={library_id}",
        "landing_url": "https://clinic.example.jp/lp",
        "media_url": None,
    }
    base.update(overrides)
    return base


def _capture(ads, captured_date="2026-06-08", scope=("futae",)):
    return CaptureFile(
        captured_date=captured_date,
        country="JP",
        ads=ads,
        hunted_scope=list(scope),
    )


# ─── days_active / proven ─────────────────────────────────────────────────────
def test_compute_days_active_counts_whole_days():
    assert compute_days_active("2026-04-01", "2026-04-30") == 29


def test_compute_days_active_null_safe():
    assert compute_days_active(None, "2026-04-30") is None
    assert compute_days_active("2026-04-01", None) is None


def test_compute_days_active_never_negative():
    assert compute_days_active("2026-05-01", "2026-04-01") == 0


def test_is_proven_threshold():
    assert is_proven(57) is True
    assert is_proven(56) is False
    assert is_proven(None) is False


# ─── new ──────────────────────────────────────────────────────────────────────
def test_new_ad_added_with_status_new():
    store: list[AdRecord] = []
    capture = _capture([_ad_payload("1")], captured_date="2026-06-08")
    result = merge_capture(store, capture, today="2026-06-08")

    assert len(result) == 1
    ad = result[0]
    assert ad.status == "new"
    assert ad.first_seen == "2026-06-08"
    assert ad.last_seen == "2026-06-08"
    assert ad.weeks_observed == 1
    assert ad.days_active == 68  # 2026-04-01 → 2026-06-08


# ─── running ──────────────────────────────────────────────────────────────────
def test_running_ad_bumps_counters_and_refreshes():
    store = merge_capture([], _capture([_ad_payload("1")], captured_date="2026-06-01"), today="2026-06-01")
    # Same ad next week, copy edited.
    week2 = _capture(
        [_ad_payload("1", primary_text="二重整形 新キャンペーン")],
        captured_date="2026-06-08",
    )
    result = merge_capture(store, week2, today="2026-06-08")

    ad = result[0]
    assert ad.status == "running"
    assert ad.first_seen == "2026-06-01"   # preserved
    assert ad.last_seen == "2026-06-08"    # advanced
    assert ad.weeks_observed == 2
    assert ad.primary_text == "二重整形 新キャンペーン"  # refreshed
    assert ad.days_active == 68


def test_running_same_day_recapture_does_not_double_count_weeks():
    store = merge_capture([], _capture([_ad_payload("1")], captured_date="2026-06-08"), today="2026-06-08")
    again = _capture([_ad_payload("1")], captured_date="2026-06-08")
    result = merge_capture(store, again, today="2026-06-08")
    assert result[0].weeks_observed == 1


# ─── killed ───────────────────────────────────────────────────────────────────
def test_ad_absent_from_in_scope_run_is_killed():
    store = merge_capture([], _capture([_ad_payload("1")], captured_date="2026-06-01"), today="2026-06-01")
    # Next week the niche is hunted again but ad "1" is gone.
    week2 = _capture([], captured_date="2026-06-08", scope=("futae",))
    result = merge_capture(store, week2, today="2026-06-08")

    ad = result[0]
    assert ad.status == "killed"
    assert ad.last_seen == "2026-06-01"  # frozen
    assert ad.days_active == 61          # anchored to last_seen, not today


def test_partial_hunt_does_not_false_kill_untouched_niche():
    # Two niches captured week 1.
    store = merge_capture(
        [],
        _capture(
            [_ad_payload("1", niche_id="futae"), _ad_payload("2", niche_id="kuma-tori")],
            captured_date="2026-06-01",
            scope=("futae", "kuma-tori"),
        ),
        today="2026-06-01",
    )
    # Week 2 only hunts futae, and ad "1" is gone. Ad "2" (kuma-tori) must NOT
    # be killed — its niche wasn't queried.
    week2 = _capture([], captured_date="2026-06-08", scope=("futae",))
    result = merge_capture(store, week2, today="2026-06-08")
    by_id = {r.library_id: r for r in result}

    assert by_id["1"].status == "killed"
    assert by_id["2"].status in ("new", "running")  # untouched, carried forward


def test_killed_ad_stays_killed_and_is_not_rekilled():
    store = merge_capture([], _capture([_ad_payload("1")], captured_date="2026-06-01"), today="2026-06-01")
    store = merge_capture(store, _capture([], captured_date="2026-06-08"), today="2026-06-08")
    # Third week, still gone.
    result = merge_capture(store, _capture([], captured_date="2026-06-15"), today="2026-06-15")
    ad = result[0]
    assert ad.status == "killed"
    assert ad.last_seen == "2026-06-01"


def test_killed_ad_can_resurrect_as_running():
    store = merge_capture([], _capture([_ad_payload("1")], captured_date="2026-06-01"), today="2026-06-01")
    store = merge_capture(store, _capture([], captured_date="2026-06-08"), today="2026-06-08")
    # Re-appears week 3.
    result = merge_capture(store, _capture([_ad_payload("1")], captured_date="2026-06-15"), today="2026-06-15")
    ad = result[0]
    assert ad.status == "running"
    assert ad.last_seen == "2026-06-15"
    assert ad.first_seen == "2026-06-01"


# ─── manual field preservation ────────────────────────────────────────────────
def test_manual_fields_preserved_across_merges():
    store = merge_capture([], _capture([_ad_payload("1")], captured_date="2026-06-01"), today="2026-06-01")
    store[0].hook_category = "before_after"
    store[0].notes = "strong hook, study this"

    result = merge_capture(store, _capture([_ad_payload("1")], captured_date="2026-06-08"), today="2026-06-08")
    ad = result[0]
    assert ad.hook_category == "before_after"
    assert ad.notes == "strong hook, study this"


# ─── longevity ranks ──────────────────────────────────────────────────────────
def test_longevity_ranks_per_niche():
    store = [
        AdRecord(library_id="a", niche_id="futae", page_name="x", ad_library_url="u", days_active=10),
        AdRecord(library_id="b", niche_id="futae", page_name="x", ad_library_url="u", days_active=90),
        AdRecord(library_id="c", niche_id="kuma-tori", page_name="x", ad_library_url="u", days_active=5),
    ]
    ranks = longevity_ranks(store)
    assert ranks["a"] == 50.0   # lower of two in futae
    assert ranks["b"] == 100.0  # top of futae
    assert ranks["c"] == 100.0  # only one in its niche


def test_longevity_ranks_skip_null_days():
    store = [AdRecord(library_id="a", niche_id="futae", page_name="x", ad_library_url="u", days_active=None)]
    assert longevity_ranks(store) == {}
