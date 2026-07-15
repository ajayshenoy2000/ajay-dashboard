import type { Brief, Trend } from "@/lib/types";
import { parseJsonBlock, PROMPTS } from "./providers";
import { callGateway } from "@/lib/ai/gateway";

function strList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return (value as unknown[]).map(String).filter((s) => s.trim());
}

function templateBrief(trend: Trend): Brief {
  const risks = trend.safetyNotes.length ? trend.safetyNotes : ["個人差があること", "自己判断を避けること"];
  const core = trend.title.replace("？", "");
  return {
    id: `brief-${trend.rowId ?? trend.id}`,
    trendId: trend.id,
    durationMinutes: "3-5",
    titleOptions: [
      trend.title,
      `${trend.keyword}で後悔しないために知ってほしいこと`,
      `SNSで話題の${trend.keyword}、医師目線で解説します`,
    ],
    hook: `SNSで${trend.keyword}が話題ですが、結論から言うと、${trend.keyword}は人によって向き不向きがあります。ただし注意点があります。`,
    conclusion: "大事なのは流行に合わせることではなく、ご自身の状態や目的に合っているかを確認することです。",
    outline: [
      `${core}という疑問を紹介`,
      "結論を先に伝え、過度に怖がらせない",
      "なぜ話題になっているのかを整理",
      "よくある誤解とリスクを具体的に説明",
      "相談時に確認してほしいポイントで締める",
    ],
    talkingPoints: [
      trend.summary,
      trend.whyItMatters || "患者さんの不安を整理しやすいテーマです。",
      "不安になりすぎなくて大丈夫ですが、自己判断は避けてください。",
      "ご自身に合っているかが一番大事です。",
    ],
    risksToMention: risks,
    cta: "気になる方は、カウンセリングでご自身に合っているかを一緒に確認しましょう。",
  };
}

export async function generateBriefForTrend(trend: Trend, userId?: string): Promise<Brief> {
  const fallback = templateBrief(trend);
  const snippets = trend.sources
    .slice(0, 10)
    .map((s) => `- [${s.source}] ${s.title} ${s.text}`.slice(0, 300))
    .join("\n");

  let text: string;
  try {
    const res = await callGateway("brief-generation", {
      system: PROMPTS.RIKI_STYLE,
      prompt: `${PROMPTS.VIDEO_BRIEF}\n\n## トレンド\nキーワード: ${trend.keyword}\nタイトル: ${trend.title}\n概要: ${trend.summary}\n重要な理由: ${trend.whyItMatters}\n収集データ:\n${snippets || "(なし)"}`,
      userId,
    });
    text = res.text;
  } catch {
    return fallback;
  }
  if (!text) return fallback;
  const data = parseJsonBlock(text);
  if (!data) return fallback;

  return {
    id: fallback.id,
    trendId: trend.id,
    durationMinutes: "3-5",
    titleOptions: strList(data.title_options).length ? strList(data.title_options) : fallback.titleOptions,
    hook: String(data.hook || fallback.hook),
    conclusion: String(data.conclusion || fallback.conclusion),
    outline: strList(data.outline).length ? strList(data.outline) : fallback.outline,
    talkingPoints: strList(data.talking_points).length ? strList(data.talking_points) : fallback.talkingPoints,
    risksToMention: strList(data.risks_to_mention).length ? strList(data.risks_to_mention) : fallback.risksToMention,
    cta: String(data.cta || fallback.cta),
  };
}
