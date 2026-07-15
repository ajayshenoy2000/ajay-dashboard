import type { SourceItem } from "@/lib/types";
import { parseJsonBlock, PROMPTS } from "./providers";
import { callGateway } from "@/lib/ai/gateway";

export interface TrendForAnalysis {
  keyword: string;
  title: string;
  summary: string;
  whyItMatters: string;
  sources: SourceItem[];
}

export async function enrichTrendsWithAnalysis(
  trends: TrendForAnalysis[],
  userId?: string,
  limit = 5,
): Promise<void> {
  for (const trend of trends.slice(0, limit)) {
    const snippets = trend.sources
      .slice(0, 10)
      .map((s) => `- [${s.source}] ${s.title} ${s.text}`.slice(0, 300))
      .join("\n");

    let text: string;
    try {
      const res = await callGateway("trend-analysis", {
        system: "あなたは美容医療チャンネルの編集者です。日本語で簡潔に出力します。",
        prompt: `${PROMPTS.TREND_ANALYSIS}\n\nキーワード: ${trend.keyword}\n\n収集データ:\n${snippets}`,
        maxTokens: 1024,
        userId,
      });
      text = res.text;
    } catch {
      return;
    }
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
  userId?: string,
  maxExtra = 10,
): Promise<string[]> {
  const seed = baseKeywords.map((k) => `- ${k}`).join("\n");
  let text: string;
  try {
    const res = await callGateway("keyword-expansion", {
      system: "あなたは日本の美容医療トレンドリサーチャーです。日本語のみで出力します。",
      prompt: PROMPTS.KEYWORD_EXPANSION.replace("{seed}", seed),
      maxTokens: 512,
      userId,
    });
    text = res.text;
  } catch {
    return baseKeywords;
  }
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
