import type { SourceItem } from "@/lib/types";
import { complete, parseJsonBlock, PROMPTS } from "./providers";

export interface TrendForAnalysis {
  keyword: string;
  title: string;
  summary: string;
  whyItMatters: string;
  sources: SourceItem[];
}

export async function enrichTrendsWithAnalysis(
  trends: TrendForAnalysis[],
  provider: "claude" | "gpt",
  limit = 5,
): Promise<void> {
  if (!provider) return;
  for (const trend of trends.slice(0, limit)) {
    const snippets = trend.sources
      .slice(0, 10)
      .map((s) => `- [${s.source}] ${s.title} ${s.text}`.slice(0, 300))
      .join("\n");

    const text = await complete(
      provider,
      "あなたは美容医療チャンネルの編集者です。日本語で簡潔に出力します。",
      `${PROMPTS.TREND_ANALYSIS}\n\nキーワード: ${trend.keyword}\n\n収集データ:\n${snippets}`,
      1024,
    );
    if (!text) return;
    const data = parseJsonBlock(text);
    if (!data) continue;
    if (data.title) trend.title = String(data.title);
    if (data.summary) trend.summary = String(data.summary);
    if (data.why_it_matters) trend.whyItMatters = String(data.why_it_matters);
  }
}

export async function expandKeywords(
  baseKeywords: string[],
  provider: "claude" | "gpt",
  maxExtra = 10,
): Promise<string[]> {
  const seed = baseKeywords.map((k) => `- ${k}`).join("\n");
  const text = await complete(
    provider,
    "あなたは日本の美容医療トレンドリサーチャーです。日本語のみで出力します。",
    PROMPTS.KEYWORD_EXPANSION.replace("{seed}", seed),
    512,
  );
  if (!text) return baseKeywords;
  const data = parseJsonBlock(text);
  if (!data || !Array.isArray(data.keywords)) return baseKeywords;

  const seen = new Set(baseKeywords);
  const merged = [...baseKeywords];
  for (const kw of data.keywords as unknown[]) {
    const s = String(kw).trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    merged.push(s);
    if (merged.length >= baseKeywords.length + maxExtra) break;
  }
  return merged;
}
