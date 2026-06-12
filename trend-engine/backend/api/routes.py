from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.api import service
from backend.config import DEFAULT_KEYWORDS, SCORING_WEIGHTS, settings

router = APIRouter(prefix="/api")


class BriefRequest(BaseModel):
    rowId: str


class ClearHistoryRequest(BaseModel):
    olderThanHours: int


class SearchNowRequest(BaseModel):
    sources: list[str] = ["x", "google_news", "google_trends", "youtube"]
    timeWindow: str = "24h"
    analysisModelProvider: str = "gpt"
    briefModelProvider: str = "claude"
    regionCode: str = "JP"
    checkForChannelFit: bool = False


class CustomKeywordsRequest(BaseModel):
    keywords: list[str]
    useCustomOnly: bool = False


class UpdateChannelIdRequest(BaseModel):
    channelId: str


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/top-trends")
def top_trends() -> list[dict]:
    return [trend.as_dict() for trend in service.get_top_trends()]


@router.get("/record-this-week")
def record_this_week() -> list[dict]:
    return [trend.as_dict() for trend in service.get_record_this_week()]


@router.get("/video-opportunities")
def video_opportunities() -> list[dict]:
    return [trend.as_dict() for trend in service.get_video_opportunities()]


@router.get("/trend-history")
def trend_history() -> list[dict]:
    return [trend.as_dict() for trend in service.get_trend_history()]


@router.get("/trends/{row_id}")
def trend_detail(row_id: str) -> dict:
    trend = service.get_trend(row_id)
    if not trend:
        raise HTTPException(status_code=404, detail="Trend not found")
    return trend.as_dict()


@router.delete("/trends/{row_id}")
def delete_trend(row_id: str) -> dict:
    service.delete_trend(row_id)
    return {"deleted": row_id}


@router.post("/clear-history")
def clear_history(payload: ClearHistoryRequest) -> dict:
    deleted = service.clear_trend_history(payload.olderThanHours)
    return {"deletedCount": deleted}


@router.get("/briefs")
def briefs() -> list[dict]:
    return [brief.as_dict() for brief in service.get_briefs()]


@router.get("/briefs/{brief_id}")
def brief_detail(brief_id: str) -> dict:
    brief = service.get_brief(brief_id)
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")
    return brief.as_dict()


@router.delete("/briefs/{brief_id}")
def delete_brief(brief_id: str) -> dict:
    service.delete_brief(brief_id)
    return {"deleted": brief_id}


@router.post("/generate-brief")
def generate_brief(payload: BriefRequest) -> dict:
    brief = service.generate_brief_for_trend(payload.rowId)
    if not brief:
        raise HTTPException(status_code=404, detail="Trend not found")
    return brief.as_dict()


@router.post("/search-now")
def search_now(payload: SearchNowRequest) -> dict:
    allowed_sources = {"x", "google_news", "google_trends", "youtube"}
    selected_sources = [source for source in payload.sources if source in allowed_sources]
    if not selected_sources:
        raise HTTPException(status_code=400, detail="At least one source must be enabled")
    if payload.timeWindow not in service.TIME_WINDOWS:
        raise HTTPException(status_code=400, detail="Unsupported time window")
    if payload.analysisModelProvider not in {"gpt", "claude"}:
        raise HTTPException(status_code=400, detail="Unsupported analysis model provider")
    if payload.briefModelProvider not in {"gpt", "claude"}:
        raise HTTPException(status_code=400, detail="Unsupported brief model provider")
    return service.run_on_demand_search(
        enabled_sources=selected_sources,
        time_window=payload.timeWindow,
        analysis_model_provider=payload.analysisModelProvider,
        brief_model_provider=payload.briefModelProvider,
        region_code=payload.regionCode,
        check_for_channel_fit=payload.checkForChannelFit,
    )


@router.post("/approve-topic/{row_id}")
def approve_topic(row_id: str) -> dict:
    trend = service.set_topic_status(row_id, "approved")
    if not trend:
        raise HTTPException(status_code=404, detail="Trend not found")
    return trend.as_dict()


@router.post("/reject-topic/{row_id}")
def reject_topic(row_id: str) -> dict:
    trend = service.set_topic_status(row_id, "rejected")
    if not trend:
        raise HTTPException(status_code=404, detail="Trend not found")
    return trend.as_dict()


@router.get("/sources")
def sources() -> list[dict]:
    return [
        {
            "id": source.id,
            "source": source.source,
            "title": source.title,
            "text": source.text,
            "url": source.url,
            "keyword": source.keyword,
            "publishedAt": source.published_at.isoformat(),
            "engagement": source.engagement,
            "metadata": source.metadata,
        }
        for source in service.get_sources()
    ]


@router.get("/settings")
def app_settings() -> dict:
    return {
        "keywords": service.get_keywords(),
        "scoringWeights": SCORING_WEIGHTS,
        "channelId": settings.youtube_channel_id or "",
        "modelProvider": settings.model_provider,
        "analysisModelProvider": settings.analysis_model_provider,
        "briefModelProvider": settings.brief_model_provider,
        "lastSearch": service.get_search_meta(),
        "apiKeys": {
            "youtube": bool(settings.youtube_api_key),
            "x": bool(settings.x_bearer_token),
            "anthropic": bool(settings.anthropic_api_key),
            "openai": bool(settings.openai_api_key),
        },
    }


class UpdateKeywordsRequest(BaseModel):
    keywords: list[str]


@router.post("/keywords")
def update_keywords(payload: UpdateKeywordsRequest) -> dict:
    if not payload.keywords or not all(isinstance(k, str) and k.strip() for k in payload.keywords):
        raise HTTPException(status_code=400, detail="Keywords must be non-empty strings")
    updated = service.set_keywords(payload.keywords)
    return {"keywords": updated}


@router.post("/custom-keywords")
def update_custom_keywords(payload: CustomKeywordsRequest) -> dict:
    """Set custom keywords and toggle between custom-only vs custom+presaved."""
    if payload.keywords and not all(isinstance(k, str) and k.strip() for k in payload.keywords):
        raise HTTPException(status_code=400, detail="Keywords must be non-empty strings")
    service.set_custom_keywords(payload.keywords)
    service.set_use_custom_keywords_only(payload.useCustomOnly)
    return {"customKeywords": service.get_custom_keywords(), "useCustomOnly": service.get_use_custom_keywords_only()}


@router.get("/custom-keywords")
def get_custom_keywords() -> dict:
    """Retrieve current custom keywords and toggle state."""
    return {"customKeywords": service.get_custom_keywords(), "useCustomOnly": service.get_use_custom_keywords_only()}


@router.post("/update-channel-id")
def update_channel_id(payload: UpdateChannelIdRequest) -> dict:
    """Compute and store channel baseline. Runs synchronously (blocks)."""
    if not payload.channelId or not payload.channelId.strip():
        raise HTTPException(status_code=400, detail="Channel ID must be non-empty")
    try:
        baseline = service.update_channel_baseline(payload.channelId)
        if not baseline:
            raise HTTPException(status_code=400, detail="Failed to fetch channel data (invalid channel or API error)")
        return {
            "success": True,
            "baseline": baseline,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Channel analysis failed: {str(e)}")


@router.get("/channel-baseline")
def get_channel_baseline() -> dict:
    """Get the current channel baseline."""
    baseline = service.get_channel_baseline()
    if not baseline:
        return {"baseline": None}
    return {"baseline": baseline}


@router.get("/region-code")
def get_region() -> dict:
    """Get the current search region code."""
    return {"regionCode": service.get_region_code()}


@router.post("/region-code")
def set_region(data: dict) -> dict:
    """Set the search region code."""
    region = data.get("regionCode", "JP")
    service.set_region_code(region)
    return {"regionCode": service.get_region_code()}
