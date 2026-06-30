"""Data contract for the MetaScraper sub-app (§3 of the build plan).

Everything here is snake_case to match the extraction schema that
Claude-in-Chrome emits verbatim (§7). That diverges from the trend-engine
camelCase convention on purpose — keeping the keys identical to the hunt
command's output schema makes the extraction self-describing and removes a
translation layer between the browser agent and the store.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

AdStatus = Literal["new", "running", "killed"]
MediaType = Literal["image", "video", "carousel", "unknown"]
NicheMode = Literal["keyword", "competitors", "both"]

# Display labels for the 8 niche groups (UI headers).
GROUP_LABELS: dict[str, str] = {
    "surgical": "外科・整形系",
    "injectable": "注入・注射系",
    "skin": "美容皮膚科・肌治療",
    "hair_removal": "脱毛",
    "body": "痩身・ダイエット",
    "hair_loss": "毛髪治療",
    "mens": "メンズ",
    "other": "その他・トレンド",
}

GROUP_ORDER = list(GROUP_LABELS.keys())

HOOK_CATEGORIES = [
    "before_after",
    "price",
    "testimonial",
    "doctor_trust",
    "campaign",
    "other",
]

_VALID_MEDIA_TYPES = {"image", "video", "carousel", "unknown"}

# Fields the diff engine manages — never set by the capture payload, and
# (for the manual ones) never overwritten on merge.
MANAGED_FIELDS = ("first_seen", "last_seen", "days_active", "weeks_observed", "status")
MANUAL_FIELDS = ("hook_category", "notes")


# ─── Config shapes (§3.2) ─────────────────────────────────────────────────────
@dataclass
class Competitor:
    name: str
    url: str
    page_id: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {"name": self.name, "url": self.url, "page_id": self.page_id}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Competitor":
        return cls(
            name=str(data.get("name", "")).strip(),
            url=str(data.get("url", "")).strip(),
            page_id=(data.get("page_id") or None),
        )


@dataclass
class GlobalConfig:
    country: str = "JP"
    platforms: list[str] = field(default_factory=lambda: ["FACEBOOK", "INSTAGRAM"])
    media_type: str = "all"  # "all" | MediaType
    capture_depth: int = 20

    def as_dict(self) -> dict[str, Any]:
        return {
            "country": self.country,
            "platforms": list(self.platforms),
            "media_type": self.media_type,
            "capture_depth": self.capture_depth,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "GlobalConfig":
        return cls(
            country=data.get("country", "JP"),
            platforms=list(data.get("platforms", ["FACEBOOK", "INSTAGRAM"])),
            media_type=data.get("media_type", "all"),
            capture_depth=int(data.get("capture_depth", 20)),
        )


@dataclass
class Niche:
    id: str
    group: str
    label_jp: str
    enabled: bool = False
    mode: NicheMode = "both"
    keywords: list[str] = field(default_factory=list)
    competitors: list[Competitor] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "group": self.group,
            "label_jp": self.label_jp,
            "enabled": self.enabled,
            "mode": self.mode,
            "keywords": list(self.keywords),
            "competitors": [c.as_dict() for c in self.competitors],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Niche":
        return cls(
            id=data["id"],
            group=data.get("group", "other"),
            label_jp=data.get("label_jp", data["id"]),
            enabled=bool(data.get("enabled", False)),
            mode=data.get("mode", "both"),
            keywords=list(data.get("keywords", [])),
            competitors=[Competitor.from_dict(c) for c in data.get("competitors", [])],
        )


@dataclass
class AppConfig:
    global_config: GlobalConfig = field(default_factory=GlobalConfig)
    niches: list[Niche] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "global": self.global_config.as_dict(),
            "niches": [n.as_dict() for n in self.niches],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "AppConfig":
        return cls(
            global_config=GlobalConfig.from_dict(data.get("global", {})),
            niches=[Niche.from_dict(n) for n in data.get("niches", [])],
        )

    def niche_by_id(self, niche_id: str) -> Niche | None:
        return next((n for n in self.niches if n.id == niche_id), None)

    def enabled_niches(self) -> list[Niche]:
        return [n for n in self.niches if n.enabled]


# ─── Ad record (§3.1) ─────────────────────────────────────────────────────────
def normalize_media_type(value: Any) -> str:
    return value if value in _VALID_MEDIA_TYPES else "unknown"


@dataclass
class AdRecord:
    # Captured fields (present in the extraction payload).
    library_id: str
    niche_id: str
    page_name: str
    ad_library_url: str
    page_id: str | None = None
    primary_text: str = ""
    headline: str | None = None
    description: str | None = None
    cta_label: str | None = None
    media_type: str = "unknown"
    platforms: list[str] = field(default_factory=list)
    started_running_date: str | None = None  # ISO date
    landing_url: str | None = None
    media_url: str | None = None

    # Managed by the store + diff engine.
    first_seen: str = ""        # ISO date
    last_seen: str = ""         # ISO date
    days_active: int | None = None
    weeks_observed: int = 0
    status: AdStatus = "new"

    # Manual — preserved across every merge.
    hook_category: str | None = None
    notes: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "library_id": self.library_id,
            "niche_id": self.niche_id,
            "page_name": self.page_name,
            "page_id": self.page_id,
            "primary_text": self.primary_text,
            "headline": self.headline,
            "description": self.description,
            "cta_label": self.cta_label,
            "media_type": self.media_type,
            "platforms": list(self.platforms),
            "started_running_date": self.started_running_date,
            "ad_library_url": self.ad_library_url,
            "landing_url": self.landing_url,
            "media_url": self.media_url,
            "first_seen": self.first_seen,
            "last_seen": self.last_seen,
            "days_active": self.days_active,
            "weeks_observed": self.weeks_observed,
            "status": self.status,
            "hook_category": self.hook_category,
            "notes": self.notes,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "AdRecord":
        return cls(
            library_id=str(data["library_id"]),
            niche_id=data.get("niche_id", ""),
            page_name=data.get("page_name", ""),
            ad_library_url=data.get("ad_library_url")
            or f"https://www.facebook.com/ads/library/?id={data['library_id']}",
            page_id=data.get("page_id"),
            primary_text=data.get("primary_text", "") or "",
            headline=data.get("headline"),
            description=data.get("description"),
            cta_label=data.get("cta_label"),
            media_type=normalize_media_type(data.get("media_type")),
            platforms=list(data.get("platforms", [])),
            started_running_date=data.get("started_running_date"),
            landing_url=data.get("landing_url"),
            media_url=data.get("media_url"),
            first_seen=data.get("first_seen", ""),
            last_seen=data.get("last_seen", ""),
            days_active=data.get("days_active"),
            weeks_observed=int(data.get("weeks_observed", 0)),
            status=data.get("status", "new"),
            hook_category=data.get("hook_category"),
            notes=data.get("notes"),
        )


# ─── Capture file (§3.3) ──────────────────────────────────────────────────────
@dataclass
class CaptureFile:
    captured_date: str        # ISO date of the hunt
    country: str
    ads: list[dict[str, Any]] = field(default_factory=list)
    # niche_ids + competitor identifiers actually queried this run; bounds the
    # "killed" sweep so a partial hunt never false-kills untouched niches (§8).
    hunted_scope: list[str] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "CaptureFile":
        return cls(
            captured_date=data["captured_date"],
            country=data.get("country", "JP"),
            ads=list(data.get("ads", [])),
            hunted_scope=list(data.get("hunted_scope", [])),
        )
