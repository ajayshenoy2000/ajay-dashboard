export function normalizeJapaneseText(text: string): string {
  let s = (text || "").normalize("NFKC");
  s = s.replace(/https?:\/\/\S+/g, "");
  s = s.replace(/@\w+/g, "");
  s = s.replace(/#/g, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export function tokenKey(text: string): string {
  return normalizeJapaneseText(text)
    .toLowerCase()
    .replace(/[^\wぁ-んァ-ン一-龥ー]/g, "");
}
