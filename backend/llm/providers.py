from __future__ import annotations

import json
import logging
import re
from pathlib import Path

from backend.config import settings

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).parent / "prompts"

ANTHROPIC_MODEL = "claude-opus-4-8"
OPENAI_MODEL = "gpt-4o"


def load_prompt(name: str) -> str:
    return (PROMPTS_DIR / name).read_text(encoding="utf-8")


def provider_available(provider: str) -> bool:
    if provider == "claude":
        return bool(settings.anthropic_api_key)
    if provider == "gpt":
        return bool(settings.openai_api_key)
    return False


def complete(provider: str, system: str, prompt: str, max_tokens: int = 4096) -> str | None:
    """One text completion via the selected provider. Returns None when the
    provider is "mock", its API key is missing, or the call fails — callers
    fall back to template output, matching the collectors' sample fallback."""
    if not provider_available(provider):
        return None
    try:
        if provider == "claude":
            return _complete_claude(system, prompt, max_tokens)
        if provider == "gpt":
            return _complete_gpt(system, prompt, max_tokens)
    except Exception:
        logger.exception("LLM call failed (provider=%s); falling back to template", provider)
    return None


def _complete_claude(system: str, prompt: str, max_tokens: int) -> str:
    import anthropic

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    response = client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return next((block.text for block in response.content if block.type == "text"), "")


def _complete_gpt(system: str, prompt: str, max_tokens: int) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=settings.openai_api_key)
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        max_completion_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    )
    return response.choices[0].message.content or ""


def parse_json_block(text: str) -> dict | None:
    """Extract the first JSON object from an LLM response (tolerates fences)."""
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        return None
