from __future__ import annotations

import re
import unicodedata


URL_RE = re.compile(r"https?://\S+")
HANDLE_RE = re.compile(r"@\w+")
SPACE_RE = re.compile(r"\s+")


def normalize_japanese_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", text or "")
    normalized = URL_RE.sub("", normalized)
    normalized = HANDLE_RE.sub("", normalized)
    normalized = normalized.replace("#", "")
    normalized = SPACE_RE.sub(" ", normalized).strip()
    return normalized


def token_key(text: str) -> str:
    cleaned = normalize_japanese_text(text).lower()
    return re.sub(r"[^\wぁ-んァ-ン一-龥ー]", "", cleaned)
