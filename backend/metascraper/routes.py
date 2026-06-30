"""MetaScraper API (§7/§9). Mounted under /api/metascraper.

The capture endpoint is the auto-fed ingest target: Claude-in-Chrome POSTs the
extraction JSON here, the diff engine runs server-side, the store + sheet update.
"""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from backend.config import settings
from backend.metascraper import service
from backend.metascraper.models import GROUP_LABELS, HOOK_CATEGORIES, CaptureFile

router = APIRouter(prefix="/api/metascraper")


# ─── Config ───────────────────────────────────────────────────────────────────
@router.get("/config")
def get_config() -> dict:
    return {
        "config": service.get_config().as_dict(),
        "groupLabels": GROUP_LABELS,
        "hookCategories": HOOK_CATEGORIES,
    }


class ConfigPayload(BaseModel):
    config: dict


@router.put("/config")
def put_config(payload: ConfigPayload) -> dict:
    if "niches" not in payload.config or "global" not in payload.config:
        raise HTTPException(status_code=400, detail="config must include 'global' and 'niches'")
    return {"config": service.save_config(payload.config).as_dict()}


@router.post("/config/reset")
def reset_config() -> dict:
    return {"config": service.reset_config().as_dict()}


# ─── Ingest (token-guarded) ───────────────────────────────────────────────────
class CapturePayload(BaseModel):
    captured_date: str
    country: str = "JP"
    ads: list[dict] = []
    hunted_scope: list[str] = []


def _check_token(provided: str | None) -> None:
    """Bearer-token guard. If METASCRAPER_INGEST_TOKEN is unset (local dev),
    the endpoint is open; once set (prod), the token is required."""
    expected = settings.metascraper_ingest_token
    if not expected:
        return
    token = provided
    if token and token.lower().startswith("bearer "):
        token = token[7:]
    if token != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing ingest token")


@router.post("/capture")
def ingest(
    payload: CapturePayload,
    authorization: str | None = Header(default=None),
    x_ingest_token: str | None = Header(default=None),
) -> dict:
    _check_token(authorization or x_ingest_token)
    if not payload.captured_date:
        raise HTTPException(status_code=400, detail="captured_date is required")
    capture = CaptureFile.from_dict(payload.model_dump())
    try:
        return service.ingest_capture(capture)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Ingest failed: {exc}")


# ─── Dashboard reads ──────────────────────────────────────────────────────────
@router.get("/ads")
def list_ads() -> list[dict]:
    return service.get_ads_view()


@router.get("/summary")
def summary() -> dict:
    return service.get_summary()


@router.get("/diff-since-last")
def diff_since_last() -> dict:
    return service.get_diff_since_last()


@router.get("/captures")
def captures() -> list[dict]:
    from backend.metascraper import store

    return store.list_captures()


class AdPatch(BaseModel):
    hook_category: str | None = None
    notes: str | None = None


@router.patch("/ads/{library_id}")
def patch_ad(library_id: str, payload: AdPatch) -> dict:
    updated = service.patch_ad(library_id, payload.hook_category, payload.notes)
    if updated is None:
        raise HTTPException(status_code=404, detail="Ad not found")
    return updated


@router.get("/health")
def health() -> dict:
    return service.health()
