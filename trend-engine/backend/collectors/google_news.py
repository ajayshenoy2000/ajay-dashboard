from __future__ import annotations

from datetime import datetime, timedelta, timezone
from hashlib import sha1
from urllib.parse import quote
from xml.etree import ElementTree
import urllib.request

from backend.db.models import SourceItem
from backend.sample_data import sample_sources


def _recent_only(items: list[SourceItem], hours: int) -> list[SourceItem]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    return [item for item in items if item.published_at >= cutoff]


def _google_news_when(hours: int) -> str:
    if hours <= 12:
        return "12h"
    if hours <= 24:
        return "1d"
    if hours <= 72:
        return "3d"
    if hours <= 168:
        return "7d"
    return "30d"


def _fetch_rss(url: str, keyword: str, id_prefix: str, engagement: int, limit: int) -> list[SourceItem]:
    items: list[SourceItem] = []
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(request, timeout=8) as response:
            root = ElementTree.fromstring(response.read())
        for entry in root.findall(".//item")[:limit]:
            title = entry.findtext("title") or keyword
            link = entry.findtext("link") or url
            published = entry.findtext("pubDate")
            published_at = datetime.now(timezone.utc)
            if published:
                try:
                    published_at = datetime.strptime(published, "%a, %d %b %Y %H:%M:%S %Z").replace(tzinfo=timezone.utc)
                except ValueError:
                    pass
            item_id = sha1(f"{id_prefix}:{keyword}:{title}".encode()).hexdigest()
            items.append(
                SourceItem(
                    id=item_id,
                    source="google_news",
                    title=title,
                    text=entry.findtext("description") or title,
                    url=link,
                    keyword=keyword,
                    published_at=published_at,
                    engagement=engagement,
                )
            )
    except Exception:
        pass
    return items


def _region_to_locale(region_code: str = "JP") -> tuple[str, str, str]:
    """Map region_code to (hl for Google, ceid for Google, setlang for Bing)."""
    mapping = {
        "JP": ("ja", "JP:ja", "ja-JP"),
        "US": ("en", "US:en", "en-US"),
        "GB": ("en", "GB:en", "en-GB"),
        "IN": ("en", "IN:en", "en-IN"),
        "DE": ("de", "DE:de", "de-DE"),
        "FR": ("fr", "FR:fr", "fr-FR"),
    }
    hl, ceid, setlang = mapping.get(region_code, ("en", "US:en", "en-US"))
    return hl, ceid, setlang


def collect_google_news(
    keywords: list[str],
    limit_per_keyword: int = 5,
    hours: int = 24,
    region_code: str = "JP",
) -> list[SourceItem]:
    items: list[SourceItem] = []
    when = _google_news_when(hours)
    hl, ceid, setlang = _region_to_locale(region_code)
    gl = region_code
    cc = region_code

    for keyword in keywords:
        gnews_url = f"https://news.google.com/rss/search?q={quote(f'{keyword} when:{when}')}&hl={hl}&gl={gl}&ceid={ceid}"
        items.extend(_fetch_rss(gnews_url, keyword, "google_news", 25, limit_per_keyword))

        bing_url = f"https://www.bing.com/news/search?q={quote(keyword)}&format=RSS&setlang={setlang}&cc={cc}"
        items.extend(_fetch_rss(bing_url, keyword, "bing_news", 20, limit_per_keyword))
    recent_items = _recent_only(items, hours)
    fallback = _recent_only([item for item in sample_sources if item.source == "google_news"], hours)
    return recent_items or fallback
