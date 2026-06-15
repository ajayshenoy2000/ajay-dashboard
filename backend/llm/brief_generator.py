from __future__ import annotations

from backend.config import settings
from backend.db.models import Trend, VideoBrief
from backend.llm.providers import complete, load_prompt, parse_json_block


def generate_riki_style_brief(trend: Trend, provider: str | None = None) -> VideoBrief:
    """Brief via the selected model provider ("gpt" / "claude"), falling back
    to the deterministic template when the provider is "mock", unconfigured,
    or returns something unusable."""
    provider = provider or settings.brief_model_provider
    template = _template_brief(trend)
    if provider == "mock":
        return template

    data = _llm_brief(trend, provider)
    if not data:
        return template
    return VideoBrief(
        id=template.id,
        trend_id=trend.id,
        title_options=_str_list(data.get("title_options")) or template.title_options,
        hook=str(data.get("hook") or template.hook),
        conclusion=str(data.get("conclusion") or template.conclusion),
        outline=_str_list(data.get("outline")) or template.outline,
        talking_points=_str_list(data.get("talking_points")) or template.talking_points,
        risks_to_mention=_str_list(data.get("risks_to_mention")) or template.risks_to_mention,
        cta=str(data.get("cta") or template.cta),
    )


def _llm_brief(trend: Trend, provider: str) -> dict | None:
    snippets = "\n".join(
        f"- [{source.source}] {source.title} {source.text}"[:300]
        for source in trend.sources[:10]
    )
    text = complete(
        provider,
        system=load_prompt("riki_style.md"),
        prompt=(
            f"{load_prompt('video_brief.md')}\n\n"
            f"## トレンド\n"
            f"キーワード: {trend.keyword}\n"
            f"タイトル: {trend.title}\n"
            f"概要: {trend.summary}\n"
            f"重要な理由: {trend.why_it_matters}\n"
            f"収集データ:\n{snippets or '(なし)'}"
        ),
    )
    return parse_json_block(text) if text else None


def _str_list(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    return []


def _template_brief(trend: Trend) -> VideoBrief:
    risk_text = trend.safety_notes or ["個人差があること", "自己判断を避けること"]
    title_core = trend.title.replace("？", "")
    return VideoBrief(
        id=f"brief-{trend.id}",
        trend_id=trend.id,
        title_options=[
            trend.title,
            f"{trend.keyword}で後悔しないために知ってほしいこと",
            f"SNSで話題の{trend.keyword}、医師目線で解説します",
        ],
        hook=f"SNSで{trend.keyword}が話題ですが、結論から言うと、{trend.keyword}は人によって向き不向きがあります。ただし注意点があります。",
        conclusion="大事なのは流行に合わせることではなく、ご自身の状態や目的に合っているかを確認することです。",
        outline=[
            f"{title_core}という疑問を紹介",
            "結論を先に伝え、過度に怖がらせない",
            "なぜ話題になっているのかを整理",
            "よくある誤解とリスクを具体的に説明",
            "相談時に確認してほしいポイントで締める",
        ],
        talking_points=[
            trend.summary,
            trend.why_it_matters or "患者さんの不安を整理しやすいテーマです。",
            "不安になりすぎなくて大丈夫ですが、自己判断は避けてください。",
            "ご自身に合っているかが一番大事です。",
        ],
        risks_to_mention=risk_text,
        cta="気になる方は、カウンセリングでご自身に合っているかを一緒に確認しましょう。",
    )
