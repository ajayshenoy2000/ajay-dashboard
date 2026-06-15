"""Shared YouTube API helpers (avoids circular imports)."""

from __future__ import annotations

from datetime import datetime
from urllib.parse import urlencode
import isodate
import urllib.request
import json

from backend.config import settings
from backend.db.models import YouTubeVideo
from backend.processors.classify import classify_topic


def _youtube_get(path: str, params: dict[str, str | int | None]) -> dict:
    clean_params = {key: value for key, value in params.items() if value is not None}
    query = urlencode({**clean_params, "key": settings.youtube_api_key})
    url = f"https://www.googleapis.com/youtube/v3/{path}?{query}"
    with urllib.request.urlopen(url, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


def _parse_youtube_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _parse_duration_seconds(value: str | None) -> float | None:
    if not value:
        return None
    try:
        return float(isodate.parse_duration(value).total_seconds())
    except Exception:
        return None


def _videos_from_ids(video_ids: list[str]) -> list[YouTubeVideo]:
    videos: list[YouTubeVideo] = []
    for batch_start in range(0, len(video_ids), 50):
        batch = video_ids[batch_start : batch_start + 50]
        videos_payload = _youtube_get(
            "videos",
            {"part": "snippet,statistics,contentDetails", "id": ",".join(batch)},
        )
        for item in videos_payload.get("items", []):
            snippet = item.get("snippet", {})
            statistics = item.get("statistics", {})
            content_details = item.get("contentDetails", {})
            title = snippet.get("title", "")
            description = snippet.get("description", "")
            published_at = _parse_youtube_datetime(
                snippet.get("publishedAt", datetime.now().isoformat())
            )
            videos.append(
                YouTubeVideo(
                    id=item.get("id", ""),
                    title=title,
                    description=description,
                    published_at=published_at,
                    views=int(statistics.get("viewCount", 0)),
                    likes=int(statistics.get("likeCount", 0)),
                    comments=int(statistics.get("commentCount", 0)),
                    avg_view_duration_seconds=_parse_duration_seconds(content_details.get("duration")),
                    category=classify_topic(f"{title} {description}"),
                )
            )
    return videos
