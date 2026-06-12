from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal


SourceType = Literal["x", "google_news", "google_trends", "youtube", "manual"]


@dataclass
class SourceItem:
    id: str
    source: SourceType
    title: str
    text: str
    url: str
    keyword: str
    published_at: datetime
    engagement: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "SourceItem":
        return cls(
            id=data["id"],
            source=data["source"],
            title=data["title"],
            text=data["text"],
            url=data["url"],
            keyword=data["keyword"],
            published_at=datetime.fromisoformat(data["publishedAt"]),
            engagement=data.get("engagement", 0),
            metadata=data.get("metadata", {}),
        )


@dataclass
class YouTubeVideo:
    id: str
    title: str
    description: str
    published_at: datetime
    views: int
    likes: int
    comments: int
    impressions: int | None = None
    ctr: float | None = None
    avg_view_duration_seconds: float | None = None
    avg_percentage_viewed: float | None = None
    subscribers_gained: int | None = None
    category: str = "美容医療全般"

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "YouTubeVideo":
        return cls(
            id=data["id"],
            title=data["title"],
            description=data["description"],
            published_at=datetime.fromisoformat(data["publishedAt"]),
            views=data.get("views", 0),
            likes=data.get("likes", 0),
            comments=data.get("comments", 0),
            impressions=data.get("impressions"),
            ctr=data.get("ctr"),
            avg_view_duration_seconds=data.get("avgViewDurationSeconds"),
            avg_percentage_viewed=data.get("avgPercentageViewed"),
            subscribers_gained=data.get("subscribersGained"),
            category=data.get("category", "美容医療全般"),
        )


@dataclass
class ScoreBreakdown:
    trend_momentum: float
    google_search_demand: float
    medical_relevance: float
    youtube_historical_fit: float
    conversion_potential: float
    safety_brand_fit: float

    @property
    def total(self) -> float:
        return round(
            self.trend_momentum
            + self.google_search_demand
            + self.medical_relevance
            + self.youtube_historical_fit
            + self.conversion_potential
            + self.safety_brand_fit,
            2,
        )

    def as_dict(self) -> dict[str, float]:
        return {
            "trendMomentum": round(self.trend_momentum, 2),
            "googleSearchDemand": round(self.google_search_demand, 2),
            "medicalRelevance": round(self.medical_relevance, 2),
            "youtubeHistoricalFit": round(self.youtube_historical_fit, 2),
            "conversionPotential": round(self.conversion_potential, 2),
            "safetyBrandFit": round(self.safety_brand_fit, 2),
            "total": self.total,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ScoreBreakdown":
        return cls(
            trend_momentum=data.get("trendMomentum", 0),
            google_search_demand=data.get("googleSearchDemand", 0),
            medical_relevance=data.get("medicalRelevance", 0),
            youtube_historical_fit=data.get("youtubeHistoricalFit", 0),
            conversion_potential=data.get("conversionPotential", 0),
            safety_brand_fit=data.get("safetyBrandFit", 0),
        )


@dataclass
class Trend:
    id: str
    title: str
    keyword: str
    summary: str
    cluster_terms: list[str]
    score: ScoreBreakdown
    sources: list[SourceItem]
    youtube_history: list[YouTubeVideo] = field(default_factory=list)
    status: Literal["new", "approved", "rejected"] = "new"
    why_it_matters: str = ""
    safety_notes: list[str] = field(default_factory=list)
    row_id: str | None = None
    created_at: str | None = None
    has_brief: bool = False

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "rowId": self.row_id,
            "createdAt": self.created_at,
            "hasBrief": self.has_brief,
            "title": self.title,
            "keyword": self.keyword,
            "summary": self.summary,
            "clusterTerms": self.cluster_terms,
            "score": self.score.as_dict(),
            "sources": [
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
                for source in self.sources
            ],
            "youtubeHistory": [
                {
                    "id": video.id,
                    "title": video.title,
                    "description": video.description,
                    "publishedAt": video.published_at.isoformat(),
                    "views": video.views,
                    "likes": video.likes,
                    "comments": video.comments,
                    "impressions": video.impressions,
                    "ctr": video.ctr,
                    "avgViewDurationSeconds": video.avg_view_duration_seconds,
                    "avgPercentageViewed": video.avg_percentage_viewed,
                    "subscribersGained": video.subscribers_gained,
                    "category": video.category,
                }
                for video in self.youtube_history
            ],
            "status": self.status,
            "whyItMatters": self.why_it_matters,
            "safetyNotes": self.safety_notes,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Trend":
        return cls(
            id=data["id"],
            title=data["title"],
            keyword=data["keyword"],
            summary=data["summary"],
            cluster_terms=data.get("clusterTerms", []),
            score=ScoreBreakdown.from_dict(data.get("score", {})),
            sources=[SourceItem.from_dict(item) for item in data.get("sources", [])],
            youtube_history=[YouTubeVideo.from_dict(item) for item in data.get("youtubeHistory", [])],
            status=data.get("status", "new"),
            why_it_matters=data.get("whyItMatters", ""),
            safety_notes=data.get("safetyNotes", []),
            row_id=data.get("rowId"),
            created_at=data.get("createdAt"),
            has_brief=data.get("hasBrief", False),
        )


@dataclass
class VideoBrief:
    id: str
    trend_id: str
    title_options: list[str]
    hook: str
    conclusion: str
    outline: list[str]
    talking_points: list[str]
    risks_to_mention: list[str]
    cta: str
    duration_minutes: str = "3-5"

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "trendId": self.trend_id,
            "titleOptions": self.title_options,
            "hook": self.hook,
            "conclusion": self.conclusion,
            "outline": self.outline,
            "talkingPoints": self.talking_points,
            "risksToMention": self.risks_to_mention,
            "cta": self.cta,
            "durationMinutes": self.duration_minutes,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "VideoBrief":
        return cls(
            id=data["id"],
            trend_id=data["trendId"],
            title_options=data.get("titleOptions", []),
            hook=data.get("hook", ""),
            conclusion=data.get("conclusion", ""),
            outline=data.get("outline", []),
            talking_points=data.get("talkingPoints", []),
            risks_to_mention=data.get("risksToMention", []),
            cta=data.get("cta", ""),
            duration_minutes=data.get("durationMinutes", "3-5"),
        )
