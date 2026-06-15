from __future__ import annotations

from datetime import datetime, timedelta, timezone

from backend.collectors._youtube_helpers import _videos_from_ids, _youtube_get
from backend.db.models import YouTubeVideo


def compute_channel_baseline(channel_id: str) -> dict | None:
    """Fetch a channel's recent upload history and compute engagement baseline.

    Returns: {
        'channel_id': str,
        'baseline_views': float,      # median views per video
        'baseline_engagement_rate': float,  # (likes + comments) / views
        'baseline_engagement_score': float,  # median likes + comments
        'computed_at': str (ISO datetime)
    }
    or None if fetch fails.
    """
    try:
        channels_payload = _youtube_get("channels", {"part": "contentDetails", "id": channel_id})
        items = channels_payload.get("items", [])
        if not items:
            return None

        uploads_playlist_id = items[0].get("contentDetails", {}).get("relatedPlaylists", {}).get("uploads")
        if not uploads_playlist_id:
            return None

        video_ids: list[str] = []
        page_token: str | None = None

        # Fetch up to 200 videos
        for _ in range(4):
            playlist_payload = _youtube_get(
                "playlistItems",
                {
                    "part": "contentDetails",
                    "playlistId": uploads_playlist_id,
                    "maxResults": 50,
                    "pageToken": page_token,
                },
            )
            for item in playlist_payload.get("items", []):
                video_id = item.get("contentDetails", {}).get("videoId")
                if video_id:
                    video_ids.append(video_id)
            page_token = playlist_payload.get("nextPageToken")
            if not page_token:
                break

        if not video_ids:
            return None

        videos = _videos_from_ids(video_ids)
        if not videos:
            return None

        # Compute baseline metrics
        view_counts = [v.views for v in videos if v.views > 0]
        engagement_scores = [v.likes + v.comments for v in videos if v.views > 0]
        engagement_rates = [
            (v.likes + v.comments) / v.views if v.views > 0 else 0
            for v in videos
        ]

        if not view_counts:
            return None

        baseline_views = sorted(view_counts)[len(view_counts) // 2]  # median
        baseline_engagement_score = sorted(engagement_scores)[len(engagement_scores) // 2] if engagement_scores else 0
        baseline_engagement_rate = sorted(engagement_rates)[len(engagement_rates) // 2] if engagement_rates else 0

        return {
            "channel_id": channel_id,
            "baseline_views": baseline_views,
            "baseline_engagement_rate": baseline_engagement_rate,
            "baseline_engagement_score": baseline_engagement_score,
            "computed_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception:
        return None


def score_video_anomaly(video: YouTubeVideo, baseline: dict | None, time_window_hours: int) -> dict:
    """Score a single video's trendiness relative to a baseline.

    Returns: {
        'views_anomaly': float,      # (views - baseline) / baseline
        'engagement_anomaly': float,  # (engagement_rate - baseline) / baseline
        'recency_weight': float,      # 1.0 + (1 - age_ratio) * 0.3
        'anomaly_score': float        # final trend strength
    }
    """
    # Compute recency weight
    if time_window_hours > 0:
        time_window_days = time_window_hours / 24
        age_hours = (datetime.now(timezone.utc) - video.published_at).total_seconds() / 3600
        age_days = age_hours / 24
        age_ratio = min(1.0, age_days / time_window_days)  # clamp to [0, 1]
        recency_weight = 1.0 + (1.0 - age_ratio) * 0.3
    else:
        recency_weight = 1.0

    if not baseline or baseline.get("baseline_views", 0) == 0:
        # Fallback: no baseline available
        return {
            "views_anomaly": 0,
            "engagement_anomaly": 0,
            "recency_weight": recency_weight,
            "anomaly_score": 0,
        }

    # Compute engagement metrics
    engagement_rate = (video.likes + video.comments) / video.views if video.views > 0 else 0

    # Compute anomalies
    views_anomaly = (video.views - baseline["baseline_views"]) / baseline["baseline_views"]
    baseline_engagement = baseline.get("baseline_engagement_rate", 0)
    if baseline_engagement > 0:
        engagement_anomaly = (engagement_rate - baseline_engagement) / baseline_engagement
    else:
        engagement_anomaly = engagement_rate if engagement_rate > 0 else 0

    # Final score: equal weight on views + engagement, multiplied by recency
    anomaly_score = (views_anomaly * 0.5 + engagement_anomaly * 0.5) * recency_weight

    return {
        "views_anomaly": views_anomaly,
        "engagement_anomaly": engagement_anomaly,
        "recency_weight": recency_weight,
        "anomaly_score": anomaly_score,
    }
