import { normalizeJapaneseText } from "./text";

const REJECT_PATTERNS = [
  "整形してる", "整形疑惑", "暴露", "炎上", "不倫", "ゴシップ",
  "絶対痩せる", "必ず治る", "副作用なし",
];

const MEDICAL_SIGNALS = [
  "美容医療", "整形", "埋没", "クマ取り", "ヒアルロン酸", "ボトックス",
  "GLP-1", "マンジャロ", "リベルサス", "ダイエット注射", "副作用",
  "ダウンタイム", "リスク", "相談", "施術", "解剖",
];

export function rejectionReasons(text: string): string[] {
  const cleaned = normalizeJapaneseText(text).toLowerCase();
  const reasons: string[] = [];
  for (const pattern of REJECT_PATTERNS) {
    if (cleaned.includes(pattern.toLowerCase())) {
      reasons.push(`Unsafe or off-brand phrase: ${pattern}`);
    }
  }
  if (!MEDICAL_SIGNALS.some((s) => cleaned.includes(s.toLowerCase()))) {
    reasons.push("No clear medical or consultation angle");
  }
  return reasons;
}

export function isAllowedTopic(text: string): boolean {
  return rejectionReasons(text).length === 0;
}
