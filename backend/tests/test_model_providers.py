from backend.api import service
from backend.llm.brief_generator import generate_riki_style_brief
from backend.llm.providers import parse_json_block, provider_available


def _sample_trend():
    return service.get_top_trends()[0]


def test_mock_provider_returns_template_brief() -> None:
    brief = generate_riki_style_brief(_sample_trend(), provider="mock")
    assert brief.title_options
    assert brief.outline
    assert "結論" in brief.hook or brief.hook


def test_unconfigured_provider_falls_back_to_template() -> None:
    # No ANTHROPIC/OPENAI keys in the test environment → template fallback,
    # never an exception.
    for provider in ("gpt", "claude"):
        if provider_available(provider):
            continue  # key present locally; live call not exercised in tests
        brief = generate_riki_style_brief(_sample_trend(), provider=provider)
        assert brief.title_options
        assert brief.cta


def test_parse_json_block_tolerates_fences() -> None:
    text = "```json\n{\"hook\": \"テスト\", \"outline\": [\"a\"]}\n```"
    data = parse_json_block(text)
    assert data == {"hook": "テスト", "outline": ["a"]}
    assert parse_json_block("no json here") is None


def test_brief_provider_follows_last_search_meta() -> None:
    service._last_search_meta["briefModelProvider"] = "claude"
    assert service._brief_provider() == "claude"
    service._last_search_meta["briefModelProvider"] = "gpt"
    assert service._brief_provider() == "gpt"
