from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from backend.collectors.google_news import collect_google_news
from backend.collectors.google_trends import collect_google_trends
from backend.collectors.x import collect_x_posts
from backend.collectors.youtube import collect_youtube_history
from backend.config import DEFAULT_KEYWORDS, settings
from backend.db.models import Trend, VideoBrief
from backend.db.supabase_client import get_client
from backend.llm.analysis import enrich_trends_with_analysis
from backend.llm.brief_generator import generate_riki_style_brief
from backend.processors.channel_profile import compute_channel_baseline
from backend.processors.cluster import cluster_by_keyword
from backend.processors.keyword_expansion import expand_keywords
from backend.processors.safety_filter import rejection_reasons
from backend.processors.score import score_trend
from backend.sample_data import sample_briefs, sample_trends

_user_keywords: list[str] | None = None
_custom_keywords: list[str] | None = None
_use_custom_keywords_only: bool = False

TIME_WINDOWS = {
    "12h": 12,
    "24h": 24,
    "3d": 72,
    "7d": 168,
    "30d": 720,
    "60d": 1440,
    "90d": 2160,
}
DEFAULT_SOURCES = ["x", "google_news", "google_trends", "youtube"]

# Channel baseline (computed when user sets YOUTUBE_CHANNEL_ID)
_channel_baseline: dict | None = None
_current_region_code: str = "JP"

# In-memory fallback state, used only when Supabase isn't configured
# (local dev without SUPABASE_URL/SUPABASE_SERVICE_KEY set).
_briefs: dict[str, VideoBrief] = {brief.id: brief for brief in sample_briefs}
_memory_trends: list[Trend] = []
for _trend in sample_trends:
    _trend.row_id = _trend.id
    _memory_trends.append(_trend)
_last_sources = [source for trend in sample_trends for source in trend.sources]
_last_search_meta: dict[str, Any] = {
    "mode": "sample",
    "timeWindow": "sample",
    "sources": DEFAULT_SOURCES,
    "analysisModelProvider": settings.analysis_model_provider,
    "briefModelProvider": settings.brief_model_provider,
    "hours": None,
}


def _hours_for_window(time_window: str) -> int:
    return TIME_WINDOWS.get(time_window, 24)


_TITLE_TEMPLATES = [
    "{kw}って実際どうなの？医師目線で徹底解説",
    "今話題の{kw}、知らないと損するポイント",
    "{kw}のリスクと真実｜美容医療のプロが解説",
    "SNSで急増中の{kw}、その裏側を解説",
    "{kw}を検討する前に知っておきたいこと",
]


def _fallback_title(keyword: str, sources: list) -> str:
    """Used when the analysis model doesn't produce a title (mock provider or
    failed call). Picks one of several templates by keyword so different
    trends don't all get the identical title, and prefers a real headline
    from the collected sources when one exists."""
    for source in sources:
        if source.title and source.title.strip() and source.title.strip() != keyword:
            return source.title.strip()[:60]
    template = _TITLE_TEMPLATES[hash(keyword) % len(_TITLE_TEMPLATES)]
    return template.format(kw=keyword)


def set_custom_keywords(keywords: list[str]) -> None:
    """Set custom keywords for searching."""
    global _custom_keywords
    _custom_keywords = keywords if keywords else None


def set_use_custom_keywords_only(enabled: bool) -> None:
    """Toggle whether to use only custom keywords (ignore presaved)."""
    global _use_custom_keywords_only
    _use_custom_keywords_only = enabled


def set_region_code(region_code: str) -> None:
    """Set the search region (default JP)."""
    global _current_region_code
    _current_region_code = region_code


def update_channel_baseline(channel_id: str) -> dict | None:
    """Compute and store channel baseline. Returns baseline dict or None if failed."""
    global _channel_baseline
    baseline = compute_channel_baseline(channel_id)
    _channel_baseline = baseline
    return baseline


def get_channel_baseline() -> dict | None:
    """Get the current channel baseline."""
    return _channel_baseline


def collect_and_rank_trends(
    use_live_sources: bool = False,
    enabled_sources: list[str] | None = None,
    time_window: str = "24h",
    analysis_model_provider: str | None = None,
    brief_model_provider: str | None = None,
    region_code: str | None = None,
    check_for_channel_fit: bool = False,
) -> list[Trend]:
    global _last_sources, _last_search_meta, _memory_trends, _current_region_code
    sources_to_use = enabled_sources or DEFAULT_SOURCES
    analysis_model = analysis_model_provider or settings.analysis_model_provider
    brief_model = brief_model_provider or settings.brief_model_provider
    hours = _hours_for_window(time_window)

    # Determine keywords: custom-only, custom+presaved, or presaved only
    if _use_custom_keywords_only:
        keywords_to_use = _custom_keywords or []
    else:
        keywords_to_use = _custom_keywords or _user_keywords or DEFAULT_KEYWORDS

    region_to_use = region_code or _current_region_code

    if not use_live_sources:
        trends = list(sample_trends)
        _last_sources = [source for trend in trends for source in trend.sources]
    else:
        keywords_to_use = expand_keywords(keywords_to_use, analysis_model)
        items = []
        if "x" in sources_to_use:
            items.extend(collect_x_posts(keywords_to_use, hours=hours, region_code=region_to_use))
        if "google_news" in sources_to_use:
            items.extend(collect_google_news(keywords_to_use, hours=hours, region_code=region_to_use))
        if "google_trends" in sources_to_use:
            items.extend(collect_google_trends(keywords_to_use, hours=hours, region_code=region_to_use))

        youtube_history = (
            collect_youtube_history(
                keywords=keywords_to_use,
                hours=hours,
                channel_baseline=_channel_baseline if check_for_channel_fit else None,
                region_code=region_to_use,
            )
            if "youtube" in sources_to_use
            else []
        )
        _last_sources = items
        trends = []
        for keyword, sources in cluster_by_keyword(items).items():
            text = " ".join(source.title + " " + source.text for source in sources)
            reasons = rejection_reasons(text)
            if reasons:
                continue
            score = score_trend(keyword, sources, youtube_history)
            trends.append(
                Trend(
                    id=keyword.lower().replace(" ", "-"),
                    title=_fallback_title(keyword, sources),
                    keyword=keyword,
                    summary=f"直近{time_window}の{keyword}に関する投稿・ニュース・検索シグナルがまとまって伸びています。",
                    cluster_terms=sorted({source.keyword for source in sources}),
                    score=score,
                    sources=sources,
                    youtube_history=youtube_history,
                    why_it_matters="医師が不安、誤解、リスクを整理する価値があるテーマです。",
                    safety_notes=["断定的な効能表現を避ける", "適応と個人差を明確に伝える"],
                )
            )

    _last_search_meta = {
        "mode": "live" if use_live_sources else "sample",
        "timeWindow": time_window,
        "sources": sources_to_use,
        "analysisModelProvider": analysis_model,
        "briefModelProvider": brief_model,
        "hours": hours if use_live_sources else None,
        "keywordsUsed": keywords_to_use,
        "xAvailable": bool(settings.x_bearer_token),
    }
    ranked = sorted(trends, key=lambda trend: trend.score.total, reverse=True)
    if use_live_sources:
        # Analysis model rewrites title / summary / why_it_matters for the
        # top trends; the template text above is kept when the provider is
        # mock/unavailable.
        enrich_trends_with_analysis(ranked, analysis_model)

    if not use_live_sources:
        for trend in ranked:
            trend.row_id = trend.id
        _memory_trends = ranked
    else:
        _persist_search(ranked)

    return ranked


def _persist_search(ranked: list[Trend]) -> None:
    """Save a freshly-ranked search as a new batch. With Supabase configured,
    every trend row is kept forever (Trend History); without it, falls back
    to replacing the in-memory "current" list for local dev."""
    client = get_client()
    if not client:
        for trend in ranked:
            trend.row_id = trend.id
        global _memory_trends
        _memory_trends = ranked
        return

    batch = client.table("search_batches").insert({"meta": _last_search_meta}).execute()
    batch_id = batch.data[0]["id"]
    if not ranked:
        return
    rows = [
        {
            "trend_id": trend.id,
            "batch_id": batch_id,
            "status": trend.status,
            "payload": trend.as_dict(),
        }
        for trend in ranked
    ]
    inserted = client.table("trends").insert(rows).execute()
    for trend, row in zip(ranked, inserted.data):
        trend.row_id = row["row_id"]
        trend.created_at = row["created_at"]


def _latest_batch_id(client) -> str | None:
    result = client.table("search_batches").select("id").order("created_at", desc=True).limit(1).execute()
    return result.data[0]["id"] if result.data else None


def _attach_brief_flags(client, trends: list[Trend]) -> None:
    row_ids = [trend.row_id for trend in trends if trend.row_id]
    if not row_ids:
        return
    rows = client.table("briefs").select("trend_row_id").in_("trend_row_id", row_ids).execute()
    have_brief = {row["trend_row_id"] for row in rows.data}
    for trend in trends:
        trend.has_brief = trend.row_id in have_brief


def run_on_demand_search(
    enabled_sources: list[str],
    time_window: str,
    analysis_model_provider: str,
    brief_model_provider: str,
    region_code: str | None = None,
    check_for_channel_fit: bool = False,
) -> dict[str, Any]:
    ranked = collect_and_rank_trends(
        use_live_sources=True,
        enabled_sources=enabled_sources,
        time_window=time_window,
        analysis_model_provider=analysis_model_provider,
        brief_model_provider=brief_model_provider,
        region_code=region_code,
        check_for_channel_fit=check_for_channel_fit,
    )
    return {
        "trends": [trend.as_dict() for trend in ranked],
        "recordThisWeek": [trend.as_dict() for trend in get_record_this_week()],
        "meta": _last_search_meta,
    }


def get_top_trends(limit: int = 20) -> list[Trend]:
    """Trends from the most recent search batch only — the Home tab."""
    client = get_client()
    if client:
        batch_id = _latest_batch_id(client)
        if not batch_id:
            return []
        rows = client.table("trends").select("*").eq("batch_id", batch_id).execute()
        trends = [Trend.from_dict(row["payload"] | {"rowId": row["row_id"], "createdAt": row["created_at"], "status": row["status"]}) for row in rows.data]
        _attach_brief_flags(client, trends)
        return sorted(trends, key=lambda trend: trend.score.total, reverse=True)[:limit]

    trends = _memory_trends if _memory_trends else collect_and_rank_trends()
    return sorted(trends, key=lambda trend: trend.score.total, reverse=True)[:limit]


def get_trend_history(limit: int = 100) -> list[Trend]:
    """All trends from earlier search batches — the Trend History tab."""
    client = get_client()
    if not client:
        return []
    batch_id = _latest_batch_id(client)
    query = client.table("trends").select("*").order("created_at", desc=True).limit(limit)
    if batch_id:
        query = query.neq("batch_id", batch_id)
    rows = query.execute()
    trends = [Trend.from_dict(row["payload"] | {"rowId": row["row_id"], "createdAt": row["created_at"], "status": row["status"]}) for row in rows.data]
    _attach_brief_flags(client, trends)
    return trends


def get_record_this_week(limit: int = 5) -> list[Trend]:
    return [
        trend
        for trend in get_top_trends()
        if trend.score.medical_relevance >= 14 and trend.score.safety_brand_fit >= 3
    ][:limit]


def get_video_opportunities(limit: int = 10) -> list[Trend]:
    return [
        trend
        for trend in get_top_trends()
        if trend.score.youtube_historical_fit >= 10 or trend.score.conversion_potential >= 5
    ][:limit]


def get_trend(row_id: str) -> Trend | None:
    client = get_client()
    if client:
        row = client.table("trends").select("*").eq("row_id", row_id).limit(1).execute()
        if not row.data:
            return None
        trend = Trend.from_dict(row.data[0]["payload"] | {"rowId": row.data[0]["row_id"], "createdAt": row.data[0]["created_at"], "status": row.data[0]["status"]})
        _attach_brief_flags(client, [trend])
        return trend

    return next((trend for trend in _memory_trends if trend.row_id == row_id or trend.id == row_id), None)


def get_brief(brief_id: str) -> VideoBrief | None:
    client = get_client()
    if client:
        row = client.table("briefs").select("*").eq("id", brief_id).limit(1).execute()
        if row.data:
            return VideoBrief.from_dict(row.data[0]["payload"])
        row_id = brief_id.removeprefix("brief-")
        return generate_brief_for_trend(row_id)

    if brief_id in _briefs:
        return _briefs[brief_id]
    row_id = brief_id.removeprefix("brief-")
    return generate_brief_for_trend(row_id)


def generate_brief_for_trend(row_id: str) -> VideoBrief | None:
    """Generate (or return the existing) brief for a trend row. Briefs are
    only created when this is called explicitly — never automatically."""
    import logging
    logger = logging.getLogger(__name__)

    brief_id = f"brief-{row_id}"
    client = get_client()

    if client:
        existing = client.table("briefs").select("*").eq("id", brief_id).limit(1).execute()
        if existing.data:
            return VideoBrief.from_dict(existing.data[0]["payload"])
    elif brief_id in _briefs:
        return _briefs[brief_id]

    trend = get_trend(row_id)
    if not trend:
        logger.error(f"Trend not found for row_id: {row_id}")
        return None

    try:
        brief = generate_riki_style_brief(trend, provider=_brief_provider())
        brief.id = brief_id
        brief.trend_id = trend.id
    except Exception as e:
        logger.error(f"Failed to generate brief content for {row_id}: {e}")
        raise Exception(f"Brief generation failed: {str(e)}")

    if client:
        try:
            # Insert brief
            brief_payload = brief.as_dict()
            result = client.table("briefs").insert(
                {
                    "id": brief_id,
                    "trend_row_id": row_id,
                    "trend_id": trend.id,
                    "payload": brief_payload,
                }
            ).execute()
            if not result.data:
                raise Exception("Brief insert returned no data")
            logger.info(f"Brief saved successfully: {brief_id}")

            # Update trend's has_brief flag
            try:
                trend.has_brief = True
                update_result = client.table("trends").update({"payload": trend.as_dict()}).eq("row_id", row_id).execute()
                if not update_result.data:
                    logger.warning(f"Trend has_brief flag update returned no data for {row_id}")
                else:
                    logger.info(f"Trend has_brief flag updated for {row_id}")
            except Exception as e:
                logger.error(f"Failed to update trend has_brief flag for {row_id}: {e}")
                # Don't raise - brief was saved successfully
        except Exception as e:
            logger.error(f"Failed to save brief {brief_id}: {e}")
            raise Exception(f"Failed to save brief to database: {str(e)}")
    else:
        _briefs[brief_id] = brief
        logger.info(f"Brief saved to memory: {brief_id}")

    return brief


def get_briefs() -> list[VideoBrief]:
    client = get_client()
    if client:
        rows = client.table("briefs").select("*").order("created_at", desc=True).execute()
        return [VideoBrief.from_dict(row["payload"]) for row in rows.data]
    return list(_briefs.values())


def delete_trend(row_id: str) -> bool:
    client = get_client()
    if client:
        client.table("trends").delete().eq("row_id", row_id).execute()
        return True
    global _memory_trends
    before = len(_memory_trends)
    _memory_trends = [trend for trend in _memory_trends if trend.row_id != row_id]
    return len(_memory_trends) < before


def delete_brief(brief_id: str) -> bool:
    client = get_client()
    if client:
        client.table("briefs").delete().eq("id", brief_id).execute()
        return True
    return _briefs.pop(brief_id, None) is not None


def clear_trend_history(older_than_hours: int) -> int:
    """Delete trend rows older than the given window, excluding the current
    (latest) batch so Home never empties out. Briefs are never touched."""
    client = get_client()
    if not client:
        return 0
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=older_than_hours)).isoformat()
    batch_id = _latest_batch_id(client)
    query = client.table("trends").delete().lt("created_at", cutoff)
    if batch_id:
        query = query.neq("batch_id", batch_id)
    result = query.execute()
    return len(result.data)


def _brief_provider() -> str:
    return str(_last_search_meta.get("briefModelProvider") or settings.brief_model_provider)


def get_sources() -> list:
    return _last_sources


def get_search_meta() -> dict[str, Any]:
    return _last_search_meta


def set_topic_status(row_id: str, status: str) -> Trend | None:
    trend = get_trend(row_id)
    if not trend:
        return None
    trend.status = status  # type: ignore[assignment]
    client = get_client()
    if client:
        client.table("trends").update({"status": status, "payload": trend.as_dict()}).eq("row_id", row_id).execute()
    return trend


def get_keywords() -> list[str]:
    return _user_keywords or DEFAULT_KEYWORDS


def set_keywords(keywords: list[str]) -> list[str]:
    global _user_keywords
    _user_keywords = keywords if keywords else None
    return get_keywords()


def get_custom_keywords() -> list[str] | None:
    return _custom_keywords


def get_use_custom_keywords_only() -> bool:
    return _use_custom_keywords_only


def get_region_code() -> str:
    return _current_region_code
