from __future__ import annotations

from datetime import datetime, timedelta, timezone

from backend.collectors._youtube_helpers import _videos_from_ids, _youtube_get
from backend.db.models import YouTubeVideo
from backend.processors.channel_profile import score_video_anomaly
from backend.sample_data import sample_youtube


def _recent_only(videos: list[YouTubeVideo], hours: int | None) -> list[YouTubeVideo]:
    if hours is None:
        return videos
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    return [video for video in videos if video.published_at >= cutoff]


def _search_keyword(
    keyword: str,
    order: str,
    published_after: str | None,
    region_code: str = "JP",
    language_code: str = "ja",
) -> list[str]:
    search_payload = _youtube_get(
        "search",
        {
            "part": "snippet",
            "q": keyword,
            "type": "video",
            "maxResults": 25,
            "order": order,
            "publishedAfter": published_after,
            "regionCode": region_code,
            "relevanceLanguage": language_code,
        },
    )
    return [
        item["id"]["videoId"]
        for item in search_payload.get("items", [])
        if "videoId" in item.get("id", {})
    ]


def collect_youtube_history(
    keywords: list[str] | None = None,
    hours: int | None = None,
    channel_baseline: dict | None = None,
    region_code: str = "JP",
    language_code: str = "ja",
) -> list[YouTubeVideo]:
    """Search public YouTube for videos related to the trend keywords.

    Implements Approach 3 (Two-Tier):
    1. Search YouTube for keywords (relevance + viewCount orders)
    2. Filter by time window (hours parameter)
    3. Score each video by anomaly relative to channel baseline or search median
    4. Return top ~200, sorted by anomaly_score

    Args:
        keywords: up to 8 keywords to search
        hours: time window (e.g. 24 for last 24h, None = no filter)
        channel_baseline: dict with baseline_views, baseline_engagement_rate (from channel_profile.py)
        region_code: YouTube region code (default "JP")
        language_code: YouTube language code (default "ja")
    """
    if not settings.youtube_api_key or not keywords:
        return _recent_only(sample_youtube, hours)

    video_ids: list[str] = []
    seen_ids: set[str] = set()

    # Search with both orders for broad coverage
    for keyword in keywords[:8]:
        for order, published_after in (("relevance", None), ("viewCount", None)):
            try:
                ids = _search_keyword(keyword, order, published_after, region_code, language_code)
            except Exception:
                continue
            for video_id in ids:
                if video_id not in seen_ids:
                    seen_ids.add(video_id)
                    video_ids.append(video_id)

    if not video_ids:
        return _recent_only(sample_youtube, hours)

    try:
        videos = _videos_from_ids(video_ids)
    except Exception:
        return _recent_only(sample_youtube, hours)

    # CRITICAL: Filter by time window FIRST
    videos = _recent_only(videos, hours)
    if not videos:
        return []

    # Score by anomaly (Approach 3: creator baseline or fallback to median)
    if channel_baseline:
        # Use provided baseline (known creator)
        scored = [
            (video, score_video_anomaly(video, channel_baseline, hours or 0)["anomaly_score"])
            for video in videos
        ]
    else:
        # Fallback: use search results median as baseline
        if videos:
            view_counts = [v.views for v in videos if v.views > 0]
            median_views = sorted(view_counts)[len(view_counts) // 2] if view_counts else 1
            engagement_rates = [
                (v.likes + v.comments) / v.views if v.views > 0 else 0 for v in videos
            ]
            median_engagement = sorted(engagement_rates)[len(engagement_rates) // 2] if engagement_rates else 0

            fallback_baseline = {
                "baseline_views": median_views,
                "baseline_engagement_rate": median_engagement,
            }
            scored = [
                (video, score_video_anomaly(video, fallback_baseline, hours or 0)["anomaly_score"])
                for video in videos
            ]
        else:
            scored = [(video, 0) for video in videos]

    # Sort by anomaly score descending
    scored.sort(key=lambda x: x[1], reverse=True)

    # Return top 200
    return [video for video, _ in scored[:200]]
