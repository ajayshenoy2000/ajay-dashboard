from __future__ import annotations

import asyncio
import logging
import math
import time
from datetime import datetime, timedelta, timezone

import httpx

from backend.config import settings
from backend.db.models import SourceItem

logger = logging.getLogger(__name__)

SEARCH_URL = "https://api.twitter.com/2/tweets/search/recent"

SPAM_PATTERNS = ["宣伝", "PR", "アフィリ", "広告", "セール", "キャンペーン", "クーポン"]
MAX_PER_KEYWORD = 300
MAX_PAGES = 3
MAX_CONCURRENT_KEYWORDS = 3
MAX_RETRIES = 3
CACHE_TTL_SECONDS = 300

_cache: dict[tuple, tuple[float, list[SourceItem]]] = {}


def _recent_only(items: list[SourceItem], hours: int) -> list[SourceItem]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    return [item for item in items if item.published_at >= cutoff]


def _is_likely_spam(author: dict) -> bool:
    metrics = author.get("public_metrics", {})
    followers = metrics.get("followers_count", 0)
    created_raw = author.get("created_at", "")
    if not created_raw:
        return False
    try:
        created = datetime.fromisoformat(created_raw.replace("Z", "+00:00"))
        age_days = (datetime.now(timezone.utc) - created).days
    except ValueError:
        return False
    return followers < 50 and age_days < 90


def _jaccard(a: str, b: str) -> float:
    sa = set(a.split())
    sb = set(b.split())
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def _score_tweet(tweet: dict, author: dict) -> float:
    metrics = tweet.get("public_metrics", {})
    engagement = sum(metrics.values())
    created_raw = tweet.get("created_at", "")
    age_hours = 24.0
    if created_raw:
        try:
            created = datetime.fromisoformat(created_raw.replace("Z", "+00:00"))
            age_hours = max((datetime.now(timezone.utc) - created).total_seconds() / 3600, 0.5)
        except ValueError:
            pass
    velocity = engagement / age_hours

    author_metrics = author.get("public_metrics", {})
    followers = author_metrics.get("followers_count", 0)
    authority = min(math.log10(followers + 1), 6) / 6

    thread_bonus = 0.15 if metrics.get("reply_count", 0) > 5 else 0
    spam_penalty = 0.5 if _is_likely_spam(author) else 0

    return (velocity * 0.5 + authority * 0.35 + thread_bonus) * (1 - spam_penalty)


async def _fetch_keyword(
    client: httpx.AsyncClient,
    keyword: str,
    start_time: datetime,
    sem: asyncio.Semaphore,
) -> list[SourceItem]:
    async with sem:
        keyword_items: list[SourceItem] = []
        next_token: str | None = None
        pages_fetched = 0

        while pages_fetched < MAX_PAGES and len(keyword_items) < MAX_PER_KEYWORD:
            params: dict = {
                "query": f"{keyword} lang:ja -is:retweet",
                "max_results": 100,
                "start_time": start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "tweet.fields": "text,created_at,public_metrics,author_id,entities,conversation_id,in_reply_to_user_id,lang",
                "expansions": "author_id",
                "user.fields": "public_metrics,verified,created_at",
            }
            if next_token:
                params["next_token"] = next_token

            response = None
            for attempt in range(MAX_RETRIES):
                response = await client.get(
                    SEARCH_URL,
                    headers={"Authorization": f"Bearer {settings.x_bearer_token}"},
                    params=params,
                )
                if response.status_code != 429:
                    break
                reset_header = response.headers.get("x-rate-limit-reset")
                if reset_header:
                    wait_seconds = max(float(reset_header) - time.time(), 1)
                else:
                    wait_seconds = 2 ** attempt
                wait_seconds = min(wait_seconds, 30)
                logger.warning(
                    "X API rate limited for keyword '%s' (attempt %d/%d); waiting %.1fs",
                    keyword, attempt + 1, MAX_RETRIES, wait_seconds,
                )
                await asyncio.sleep(wait_seconds)
            else:
                logger.warning("X API rate limited after retries for keyword '%s'; giving up", keyword)
                break

            if response.status_code == 429:
                break
            response.raise_for_status()

            payload = response.json()
            tweets = payload.get("data", [])
            if not tweets:
                break

            users = {u["id"]: u for u in payload.get("includes", {}).get("users", [])}

            seen_texts = [item.text for item in keyword_items]
            for tweet in tweets:
                text = tweet.get("text", "")

                if any(pat in text for pat in SPAM_PATTERNS):
                    continue

                if any(_jaccard(text, seen) > 0.85 for seen in seen_texts):
                    continue

                author = users.get(tweet.get("author_id", ""), {})
                if _is_likely_spam(author):
                    continue

                metrics = tweet.get("public_metrics", {})
                engagement = (
                    metrics.get("like_count", 0)
                    + metrics.get("retweet_count", 0)
                    + metrics.get("reply_count", 0)
                    + metrics.get("quote_count", 0)
                )
                published_at = datetime.now(timezone.utc)
                if tweet.get("created_at"):
                    try:
                        published_at = datetime.fromisoformat(tweet["created_at"].replace("Z", "+00:00"))
                    except ValueError:
                        pass

                x_score = _score_tweet(tweet, author)

                hashtags = [h["tag"] for h in tweet.get("entities", {}).get("hashtags", [])]
                author_metrics = author.get("public_metrics", {})

                seen_texts.append(text)
                keyword_items.append(
                    SourceItem(
                        id=f"x-{tweet['id']}",
                        source="x",
                        title="",
                        text=text,
                        url=f"https://x.com/i/status/{tweet['id']}",
                        keyword=keyword,
                        published_at=published_at,
                        engagement=engagement,
                        metadata={
                            "public_metrics": metrics,
                            "x_score": x_score,
                            "author_followers": author_metrics.get("followers_count", 0),
                            "author_verified": author.get("verified", False),
                            "hashtags": hashtags,
                            "has_replies": metrics.get("reply_count", 0) > 0,
                        },
                    )
                )
                if len(keyword_items) >= MAX_PER_KEYWORD:
                    break

            meta = payload.get("meta", {})
            next_token = meta.get("next_token")
            pages_fetched += 1
            if not next_token:
                break

        return keyword_items


async def collect_x_posts(keywords: list[str], hours: int = 24, region_code: str = "JP") -> list[SourceItem]:
    if not settings.x_bearer_token:
        return []

    cache_key = (tuple(sorted(keywords)), hours, region_code)
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[0] < CACHE_TTL_SECONDS:
        logger.info("X API cache hit for %d keyword(s)", len(keywords))
        return cached[1]

    start_time = datetime.now(timezone.utc) - timedelta(hours=min(hours, 167))
    sem = asyncio.Semaphore(MAX_CONCURRENT_KEYWORDS)

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            results = await asyncio.gather(
                *[_fetch_keyword(client, keyword, start_time, sem) for keyword in keywords]
            )
    except Exception:
        logger.exception("X API collection failed")
        return []

    items: list[SourceItem] = [item for sub in results for item in sub]
    result = _recent_only(items, hours)
    _cache[cache_key] = (time.time(), result)
    return result
