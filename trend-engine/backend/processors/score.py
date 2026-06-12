from __future__ import annotations

from math import log10

from backend.config import SCORING_WEIGHTS
from backend.db.models import ScoreBreakdown, SourceItem, YouTubeVideo
from backend.processors.classify import classify_topic, medical_relevance
from backend.processors.safety_filter import rejection_reasons


CONVERSION_TERMS = ["相談", "施術", "ダウンタイム", "副作用", "失敗", "デザイン", "適応"]


def _bounded(value: float, maximum: float) -> float:
    return max(0, min(maximum, value))


def score_trend(
    keyword: str,
    sources: list[SourceItem],
    youtube_history: list[YouTubeVideo],
    weights: dict[str, int] | None = None,
) -> ScoreBreakdown:
    active_weights = weights or SCORING_WEIGHTS
    text = " ".join([keyword] + [source.title + " " + source.text for source in sources])
    engagement = sum(source.engagement for source in sources)
    source_diversity = len({source.source for source in sources})
    google_signal = sum(1 for source in sources if source.source in {"google_news", "google_trends"})
    related_youtube = [video for video in youtube_history if keyword.lower() in (video.title + video.description).lower()]
    if not related_youtube:
        category = classify_topic(text)
        related_youtube = [video for video in youtube_history if video.category == category]

    trend_momentum = _bounded(
        (log10(engagement + 10) / 3.0 + source_diversity * 0.12) * active_weights["trend_momentum"],
        active_weights["trend_momentum"],
    )
    google_search_demand = _bounded(
        (google_signal / max(1, len(sources)) + (1 if any(source.source == "google_trends" for source in sources) else 0.35))
        / 1.6
        * active_weights["google_search_demand"],
        active_weights["google_search_demand"],
    )
    medical = medical_relevance(text) * active_weights["medical_relevance"]
    youtube_fit = _bounded(
        (sum(video.views for video in related_youtube) / 50000 + len(related_youtube) * 0.15)
        * active_weights["youtube_historical_fit"],
        active_weights["youtube_historical_fit"],
    )
    conversion = _bounded(
        sum(1 for term in CONVERSION_TERMS if term in text) / len(CONVERSION_TERMS) * active_weights["conversion_potential"],
        active_weights["conversion_potential"],
    )
    safety_penalty = len(rejection_reasons(text)) * 2.5
    safety = _bounded(active_weights["safety_brand_fit"] - safety_penalty, active_weights["safety_brand_fit"])

    return ScoreBreakdown(
        trend_momentum=trend_momentum,
        google_search_demand=google_search_demand,
        medical_relevance=medical,
        youtube_historical_fit=youtube_fit,
        conversion_potential=conversion,
        safety_brand_fit=safety,
    )
