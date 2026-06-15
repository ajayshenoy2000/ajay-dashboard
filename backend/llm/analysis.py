from __future__ import annotations

from backend.db.models import SourceItem, Trend
from backend.llm.providers import complete, load_prompt, parse_json_block


def _x_signal_summary(sources: list[SourceItem]) -> str:
    """Build a compact X/Twitter signal block for the analysis prompt."""
    x_items = [s for s in sources if s.source == "x" and s.metadata.get("relevance") is not None]
    if not x_items:
        return ""

    total = len(x_items)
    sentiment_counts: dict[str, int] = {}
    for item in x_items:
        s = item.metadata.get("sentiment", "neutral")
        sentiment_counts[s] = sentiment_counts.get(s, 0) + 1

    dominant = max(sentiment_counts, key=lambda k: sentiment_counts[k]) if sentiment_counts else "neutral"
    dominant_pct = round(sentiment_counts.get(dominant, 0) / total * 100)

    # Pick representative sample tweets
    anxious = next((s.text[:120] for s in x_items if s.metadata.get("sentiment") == "anxious"), None)
    positive = next((s.text[:120] for s in x_items if s.metadata.get("sentiment") == "positive"), None)

    lines = [
        f"## X/Twitterシグナル",
        f"- 関連ツイート数: {total}件",
        f"- 主要センチメント: {dominant}（{dominant_pct}%）",
    ]
    if anxious:
        lines.append(f"- 不安ツイート例: 「{anxious}」")
    if positive:
        lines.append(f"- ポジティブツイート例: 「{positive}」")

    return "\n".join(lines)


def enrich_trends_with_analysis(trends: list[Trend], provider: str, limit: int = 5) -> None:
    """Rewrite summary / why_it_matters for the top trends using the analysis
    model. Mutates in place; on any failure the template text written by the
    service layer is kept."""
    if provider == "mock":
        return
    prompt_template = load_prompt("trend_analysis.md")
    for trend in trends[:limit]:
        snippets = "\n".join(
            f"- [{source.source}] {source.title} {source.text}"[:300]
            for source in trend.sources[:10]
        )
        x_summary = _x_signal_summary(trend.sources)
        x_block = f"\n\n{x_summary}" if x_summary else ""

        text = complete(
            provider,
            system="あなたは美容医療チャンネルの編集者です。日本語で簡潔に出力します。",
            prompt=f"{prompt_template}\n\nキーワード: {trend.keyword}\n\n収集データ:\n{snippets}{x_block}",
            max_tokens=1024,
        )
        if not text:
            return  # provider unavailable — skip the rest, keep templates
        data = parse_json_block(text)
        if not data:
            continue
        if data.get("title"):
            trend.title = str(data["title"])
        if data.get("summary"):
            trend.summary = str(data["summary"])
        if data.get("why_it_matters"):
            trend.why_it_matters = str(data["why_it_matters"])
