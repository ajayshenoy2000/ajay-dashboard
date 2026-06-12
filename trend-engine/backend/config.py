from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env")


DEFAULT_KEYWORDS = [
    "二重整形",
    "埋没",
    "クマ取り",
    "美容整形",
    "美容医療",
    "涙袋",
    "ヒアルロン酸",
    "ボトックス",
    "マンジャロ",
    "GLP-1",
    "リベルサス",
    "ダイエット注射",
    "中顔面短縮",
    "人中短縮",
    "韓国メイク",
    "韓国アイドル顔",
]


SCORING_WEIGHTS = {
    "trend_momentum": 25,
    "google_search_demand": 20,
    "medical_relevance": 20,
    "youtube_historical_fit": 20,
    "conversion_potential": 10,
    "safety_brand_fit": 5,
}


@dataclass(frozen=True)
class Settings:
    youtube_api_key: str | None = os.getenv("YOUTUBE_API_KEY")
    youtube_channel_id: str | None = os.getenv("YOUTUBE_CHANNEL_ID")
    x_bearer_token: str | None = os.getenv("X_BEARER_TOKEN")
    anthropic_api_key: str | None = os.getenv("ANTHROPIC_API_KEY")
    openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
    model_provider: str = os.getenv("MODEL_PROVIDER", "mock")
    analysis_model_provider: str = os.getenv("ANALYSIS_MODEL_PROVIDER", "gpt")
    brief_model_provider: str = os.getenv("BRIEF_MODEL_PROVIDER", "claude")
    cors_origin: str = os.getenv("CORS_ORIGIN", "http://localhost:3000")
    supabase_url: str | None = os.getenv("SUPABASE_URL")
    supabase_service_key: str | None = os.getenv("SUPABASE_SERVICE_KEY")


settings = Settings()
