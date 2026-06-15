from __future__ import annotations

from math import log10

from backend.config import SCORING_WEIGHTS
from backend.db.models import ScoreBreakdown, SourceItem, YouTubeVideo
from backend.processors.classify import classify_topic, medical_relevance
from backend.processors.safety_filter import rejection_reasons


CONVERSION_TERMS = ["相談", "施術", "ダウンタイム", "副作用", "失敗", "デザイン", "適応"]

_CROSS_SOURCE_WEIGHTS = {"x": 0.35, "google_trends": 0.30, "google_news": 0.25, "youtube": 0.10}


def _bounded(value: float, maximum: float) -> float:
    return max(0, min(maximum, value))


def cross_source_confidence(keyword: str, all_sources: list[SourceItem]) -> float:
    """0.0–1.0: fraction of source-type weights present for this keyword."""
    present = {item.source for item in all_sources if item.keyword == keyword}
    return sum(_CROSS_SOURCE_WEIGHTS.get(s, 0) for s in present)


def x_signal(x_items: list[SourceItem]) -> float:
    """0.0–1.0 composite X signal: volume + peak authority + anxiety boost."""
    if not x_items:
        return 0.0

    scores = [float(item.metadata.get("x_score", 0)) for item in x_items]
    volume_score = min(log10(len(scores) + 1) / 2, 1.0)
    peak_score = min(max(scores) / 100, 1.0) if scores else 0.0

    anxious = sum(1 for i in x_items if i.metadata.get("sentiment") == "anxious")
    anxiety_boost = (anxious / len(x_items)) * 0.3

    return (volume_score * 0.4 + peak_score * 0.6) * (1 + anxiety_boost)


def score_trend(
    keyword: str,
    sources: list[SourceItem],
    youtube_history: list[YouTubeVideo],
    all_sources: list[SourceItem] | None = None,
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

    # X-enriched trend momentum
    x_items = [s for s in sources if s.source == "x"]
    if x_items and any(s.metadata.get("x_score") is not None for s in x_items):
        xs = x_signal(x_items)
        momentum_raw = (xs + source_diversity * 0.12) * active_weights["trend_momentum"]
    else:
        momentum_raw = (log10(engagement + 10) / 3.0 + source_diversity * 0.12) * active_weights["trend_momentum"]

    trend_momentum = _bounded(momentum_raw, active_weights["trend_momentum"])

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

    # Cross-source confidence multiplier (0.7–1.0): applied to trend_momentum
    # since it's the most signal-driven component. Single-source topics get 0.7x.
    if all_sources:
        confidence = cross_source_confidence(keyword, all_sources)
        multiplier = 0.7 + 0.3 * confidence
        trend_momentum = _bounded(trend_momentum * multiplier, active_weights["trend_momentum"])

    return ScoreBreakdown(
        trend_momentum=trend_momentum,
        google_search_demand=google_search_demand,
        medical_relevance=medical,
        youtube_historical_fit=youtube_fit,
        conversion_potential=conversion,
        safety_brand_fit=safety,
    )
