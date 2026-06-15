from datetime import datetime, timezone

from backend.db.models import SourceItem, YouTubeVideo
from backend.processors.score import score_trend


def test_score_prefers_medical_multisource_topic() -> None:
    sources = [
        SourceItem(
            id="1",
            source="x",
            title="マンジャロ 副作用",
            text="マンジャロの副作用と相談先が気になる",
            url="https://example.com/1",
            keyword="マンジャロ",
            published_at=datetime.now(timezone.utc),
            engagement=500,
        ),
        SourceItem(
            id="2",
            source="google_trends",
            title="GLP-1 ダイエット注射",
            text="GLP-1 ダイエット注射 相談",
            url="https://example.com/2",
            keyword="マンジャロ",
            published_at=datetime.now(timezone.utc),
            engagement=90,
        ),
    ]
    youtube = [
        YouTubeVideo(
            id="yt1",
            title="GLP-1ダイエットは危険？",
            description="マンジャロとリベルサスの注意点",
            published_at=datetime.now(timezone.utc),
            views=45000,
            likes=600,
            comments=80,
            category="トレンド解説",
        )
    ]

    score = score_trend("マンジャロ", sources, youtube)

    assert score.total > 70
    assert score.medical_relevance > 15
    assert score.safety_brand_fit > 0
