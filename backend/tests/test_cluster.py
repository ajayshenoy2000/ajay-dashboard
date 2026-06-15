from datetime import datetime, timezone

from backend.db.models import SourceItem
from backend.processors.cluster import dedupe_sources, cluster_by_keyword


def make_item(item_id: str, keyword: str, title: str) -> SourceItem:
    return SourceItem(
        id=item_id,
        source="x",
        title=title,
        text="クマ取り ダウンタイム 相談",
        url=f"https://example.com/{item_id}",
        keyword=keyword,
        published_at=datetime.now(timezone.utc),
        engagement=1,
    )


def test_dedupe_sources_removes_similar_items() -> None:
    items = [
        make_item("1", "クマ取り", "クマ取り ダウンタイム"),
        make_item("2", "クマ取り", "クマ取り ダウンタイム"),
    ]

    assert len(dedupe_sources(items)) == 1


def test_cluster_by_keyword() -> None:
    clusters = cluster_by_keyword([
        make_item("1", "クマ取り", "A"),
        make_item("2", "涙袋", "B"),
    ])

    assert set(clusters) == {"クマ取り", "涙袋"}
