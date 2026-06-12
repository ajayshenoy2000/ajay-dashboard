from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import router
from backend.config import settings
from backend.db.database import init_db


app = FastAPI(
    title="L'or Clinic Trend Intelligence API",
    description="Japanese beauty trend scoring and りき先生-style video brief generation.",
    version="0.1.0",
)

_allowed_origins = {"http://localhost:3000", "http://127.0.0.1:3000"}
if settings.cors_origin:
    _allowed_origins.add(settings.cors_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(_allowed_origins),
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()


app.include_router(router)
