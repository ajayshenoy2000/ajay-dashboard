from __future__ import annotations


CATEGORY_RULES = {
    "二重": ["二重", "埋没", "切開"],
    "クマ取り": ["クマ", "目の下", "脱脂"],
    "危ないクリニック": ["危ない", "失敗", "カウンセリング", "契約"],
    "準備": ["準備", "前日", "当日", "持ち物"],
    "ダウンタイム": ["ダウンタイム", "腫れ", "内出血", "仕事復帰"],
    "ゲスト": ["ゲスト", "対談"],
    "トレンド解説": ["SNS", "話題", "マンジャロ", "GLP-1", "韓国"],
}


def classify_topic(text: str) -> str:
    for category, terms in CATEGORY_RULES.items():
        if any(term.lower() in text.lower() for term in terms):
            return category
    return "美容医療全般"


def medical_relevance(text: str) -> float:
    category = classify_topic(text)
    if category in {"二重", "クマ取り", "ダウンタイム", "トレンド解説"}:
        return 0.92
    if category == "美容医療全般":
        return 0.72
    return 0.82
