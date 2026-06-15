from __future__ import annotations

from backend.db.models import Trend
from backend.llm.providers import complete, load_prompt, parse_json_block


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
        text = complete(
            provider,
            system="あなたは美容医療チャンネルの編集者です。日本語で簡潔に出力します。",
            prompt=f"{prompt_template}\n\nキーワード: {trend.keyword}\n\n収集データ:\n{snippets}",
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
