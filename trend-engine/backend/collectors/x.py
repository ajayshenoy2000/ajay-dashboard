from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import httpx

from backend.config import settings
from backend.db.models import SourceItem

logger = logging.getLogger(__name__)

SEARCH_URL = "https://api.twitter.com/2/tweets/search/recent"


def _recent_only(items: list[SourceItem], hours: int) -> list[SourceItem]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    return [item for item in items if item.published_at >= cutoff]


def collect_x_posts(keywords: list[str], hours: int = 24, region_code: str = "JP") -> list[SourceItem]:
    if not settings.x_bearer_token:
        # No API key configured: return nothing rather than the same canned
        # sample posts every run (was making every search look identical).
        return []

    # X recent search covers the last 7 days; clamp start_time accordingly.
    start_time = datetime.now(timezone.utc) - timedelta(hours=min(hours, 167))
    items: list[SourceItem] = []
    try:
        with httpx.Client(timeout=20) as client:
            for keyword in keywords:
                response = client.get(
                    SEARCH_URL,
                    headers={"Authorization": f"Bearer {settings.x_bearer_token}"},
                    params={
                        "query": f"{keyword} lang:ja -is:retweet",
                        "max_results": 25,
                        "start_time": start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "tweet.fields": "created_at,public_metrics",
                    },
                )
                if response.status_code == 429:
                    logger.warning("X API rate limited; stopping at %d items", len(items))
                    break
                response.raise_for_status()
                for tweet in response.json().get("data", []):
                    metrics = tweet.get("public_metrics", {})
                    engagement = (
                        metrics.get("like_count", 0)
                        + metrics.get("retweet_count", 0)
                        + metrics.get("reply_count", 0)
                        + metrics.get("quote_count", 0)
                    )
                    published_at = datetime.now(timezone.utc)
                    if tweet.get("created_at"):
                        published_at = datetime.fromisoformat(tweet["created_at"].replace("Z", "+00:00"))
                    items.append(
                        SourceItem(
                            id=f"x-{tweet['id']}",
                            source="x",
                            title="",
                            text=tweet.get("text", ""),
                            url=f"https://x.com/i/status/{tweet['id']}",
                            keyword=keyword,
                            published_at=published_at,
                            engagement=engagement,
                            metadata={"public_metrics": metrics},
                        )
                    )
    except Exception:
        logger.exception("X API collection failed")
        return items
    return _recent_only(items, hours)
