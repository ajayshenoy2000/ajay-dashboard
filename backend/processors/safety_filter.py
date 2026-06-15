from __future__ import annotations

from backend.processors.clean_text import normalize_japanese_text


REJECT_PATTERNS = [
    "整形してる",
    "整形疑惑",
    "暴露",
    "炎上",
    "不倫",
    "ゴシップ",
    "絶対痩せる",
    "必ず治る",
    "副作用なし",
]

MEDICAL_SIGNALS = [
    "美容医療",
    "整形",
    "埋没",
    "クマ取り",
    "ヒアルロン酸",
    "ボトックス",
    "GLP-1",
    "マンジャロ",
    "リベルサス",
    "ダイエット注射",
    "副作用",
    "ダウンタイム",
    "リスク",
    "相談",
    "施術",
    "解剖",
]


def rejection_reasons(text: str) -> list[str]:
    cleaned = normalize_japanese_text(text)
    reasons: list[str] = []
    for pattern in REJECT_PATTERNS:
        if pattern.lower() in cleaned.lower():
            reasons.append(f"Unsafe or off-brand phrase: {pattern}")
    if not any(signal.lower() in cleaned.lower() for signal in MEDICAL_SIGNALS):
        reasons.append("No clear medical or consultation angle")
    return reasons


def is_allowed_topic(text: str) -> bool:
    return not rejection_reasons(text)
