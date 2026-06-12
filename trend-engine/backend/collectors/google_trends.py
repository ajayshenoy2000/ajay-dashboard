from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha1

from backend.db.models import SourceItem
from backend.sample_data import sample_sources


def _trends_timeframe(hours: int) -> str:
    if hours <= 24:
        return "now 1-d"
    if hours <= 72:
        return "now 7-d"
    if hours <= 168:
        return "now 7-d"
    return "today 1-m"


def collect_google_trends(keywords: list[str], hours: int = 24, region_code: str = "JP") -> list[SourceItem]:
    try:
        from pytrends.request import TrendReq
    except Exception:
        return [item for item in sample_sources if item.source == "google_trends"]

    # Map region code to language and timezone
    locale_map = {
        "JP": ("ja-JP", 540),
        "US": ("en-US", -300),
        "GB": ("en-GB", 0),
        "IN": ("en-IN", 330),
        "DE": ("de-DE", 60),
        "FR": ("fr-FR", 60),
    }
    hl, tz = locale_map.get(region_code, ("en-US", -300))

    try:
        pytrends = TrendReq(hl=hl, tz=tz)
        pytrends.build_payload(keywords[:5], timeframe=_trends_timeframe(hours), geo=region_code)
        related = pytrends.related_queries()
    except Exception:
        return [item for item in sample_sources if item.source == "google_trends"]

    items: list[SourceItem] = []
    for keyword, data in related.items():
        top = data.get("top") if data else None
        if top is None:
            continue
        for _, row in top.head(5).iterrows():
            query = str(row.get("query", keyword))
            value = int(row.get("value", 0))
            items.append(
                SourceItem(
                    id=sha1(f"google_trends:{keyword}:{query}".encode()).hexdigest(),
                    source="google_trends",
                    title=query,
                    text=f"{keyword} related query: {query} during last {hours} hours",
                    url=f"https://trends.google.com/trends/explore?geo=JP&q={keyword}&date={_trends_timeframe(hours).replace(' ', '%20')}",
                    keyword=keyword,
                    published_at=datetime.now(timezone.utc),
                    engagement=value,
                )
            )
    return items
