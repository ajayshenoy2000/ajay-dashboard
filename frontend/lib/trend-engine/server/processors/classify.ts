const CATEGORY_RULES: Record<string, string[]> = {
  "二重": ["二重", "埋没", "切開"],
  "クマ取り": ["クマ", "目の下", "脱脂"],
  "危ないクリニック": ["危ない", "失敗", "カウンセリング", "契約"],
  "準備": ["準備", "前日", "当日", "持ち物"],
  "ダウンタイム": ["ダウンタイム", "腫れ", "内出血", "仕事復帰"],
  "ゲスト": ["ゲスト", "対談"],
  "トレンド解説": ["SNS", "話題", "マンジャロ", "GLP-1", "韓国"],
};

export function classifyTopic(text: string): string {
  const lower = text.toLowerCase();
  for (const [category, terms] of Object.entries(CATEGORY_RULES)) {
    if (terms.some((t) => lower.includes(t.toLowerCase()))) return category;
  }
  return "美容医療全般";
}

export function medicalRelevance(text: string): number {
  const category = classifyTopic(text);
  if (["二重", "クマ取り", "ダウンタイム", "トレンド解説"].includes(category)) return 0.92;
  if (category === "美容医療全般") return 0.72;
  return 0.82;
}
