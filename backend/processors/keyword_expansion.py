from __future__ import annotations

from backend.llm.providers import complete, load_prompt, parse_json_block


def expand_keywords(base_keywords: list[str], provider: str, max_extra: int = 10) -> list[str]:
    """Use the analysis model to add related search keywords to the base list,
    so each search pulls from a wider, less repetitive set of queries.
    Returns base_keywords unchanged if the provider is unavailable/mock or
    the call fails."""
    prompt_template = load_prompt("keyword_expansion.md")
    text = complete(
        provider,
        system="あなたは日本の美容医療トレンドリサーチャーです。日本語のみで出力します。",
        prompt=prompt_template.format(seed="\n".join(f"- {keyword}" for keyword in base_keywords)),
        max_tokens=512,
    )
    if not text:
        return base_keywords

    data = parse_json_block(text)
    if not data or not isinstance(data.get("keywords"), list):
        return base_keywords

    seen = set(base_keywords)
    merged = list(base_keywords)
    for raw in data["keywords"]:
        keyword = str(raw).strip()
        if not keyword or keyword in seen:
            continue
        seen.add(keyword)
        merged.append(keyword)
        if len(merged) >= len(base_keywords) + max_extra:
            break
    return merged
