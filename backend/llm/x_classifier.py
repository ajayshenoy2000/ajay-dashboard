from __future__ import annotations

import json
import logging
import re

from backend.config import settings
from backend.db.models import SourceItem
from backend.llm.providers import ANTHROPIC_HAIKU_MODEL

logger = logging.getLogger(__name__)

CHUNK_SIZE = 20
RELEVANCE_THRESHOLD = 0.4

_SYSTEM = (
    "You are a content classifier for a Japanese cosmetic medicine trend engine. "
    "For each tweet in the input array, classify it and return a JSON array with one object per tweet. "
    'Each object must have exactly these keys: "relevance" (float 0.0–1.0), '
    '"sentiment" (one of: positive, negative, neutral, anxious), "topic" (short label in Japanese). '
    "Relevance: 1.0 = directly discusses a cosmetic or medical procedure, outcome, concern, risk, or consultation. "
    "0.0 = completely unrelated (product ads, pure fashion, celebrity gossip). "
    "Output ONLY the JSON array, no markdown fences, no extra text."
)


def _call_haiku(tweets: list[str]) -> list[dict]:
    """Call Haiku with a batch of tweet texts. Returns list of classification dicts."""
    if not settings.anthropic_api_key:
        return []
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        numbered = "\n".join(f"{i+1}. {t[:280]}" for i, t in enumerate(tweets))
        response = client.messages.create(
            model=ANTHROPIC_HAIKU_MODEL,
            max_tokens=1024,
            system=_SYSTEM,
            messages=[{"role": "user", "content": f"Classify these {len(tweets)} tweets:\n\n{numbered}"}],
        )
        text = next((block.text for block in response.content if block.type == "text"), "")
        match = re.search(r"\[.*\]", text, re.DOTALL)
        if not match:
            return []
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, list) else []
    except Exception:
        logger.exception("Haiku X classifier call failed")
        return []


def classify_and_filter(items: list[SourceItem]) -> list[SourceItem]:
    """Run Haiku relevance + sentiment classification on X items.
    Drops items with relevance < RELEVANCE_THRESHOLD and attaches
    sentiment/relevance/topic to item.metadata. Returns the filtered list."""
    if not items:
        return []

    results: list[SourceItem] = []
    for chunk_start in range(0, len(items), CHUNK_SIZE):
        chunk = items[chunk_start : chunk_start + CHUNK_SIZE]
        texts = [item.text for item in chunk]
        classifications = _call_haiku(texts)

        for i, item in enumerate(chunk):
            if i < len(classifications):
                cls = classifications[i]
                relevance = float(cls.get("relevance", 0))
                sentiment = str(cls.get("sentiment", "neutral"))
                topic = str(cls.get("topic", ""))
            else:
                # Haiku returned fewer results than expected — keep item, mark unknown
                relevance = 1.0
                sentiment = "neutral"
                topic = ""

            if relevance < RELEVANCE_THRESHOLD:
                continue

            item.metadata["relevance"] = relevance
            item.metadata["sentiment"] = sentiment
            item.metadata["topic"] = topic
            results.append(item)

    logger.info("X classifier: %d → %d items after relevance filter", len(items), len(results))
    return results
