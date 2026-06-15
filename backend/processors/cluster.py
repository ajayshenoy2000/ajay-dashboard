from __future__ import annotations

from collections import defaultdict

from backend.db.models import SourceItem
from backend.processors.clean_text import token_key


def dedupe_sources(items: list[SourceItem]) -> list[SourceItem]:
    seen: set[str] = set()
    unique: list[SourceItem] = []
    for item in items:
        key = token_key(f"{item.keyword}:{item.title}:{item.text}")[:120]
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique


def cluster_by_keyword(items: list[SourceItem]) -> dict[str, list[SourceItem]]:
    clusters: dict[str, list[SourceItem]] = defaultdict(list)
    for item in dedupe_sources(items):
        clusters[item.keyword].append(item)
    return dict(clusters)
