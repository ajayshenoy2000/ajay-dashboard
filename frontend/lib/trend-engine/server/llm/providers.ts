export function parseJsonBlock(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const PROMPTS = {
  KEYWORD_EXPANSION: `あなたは日本の美容医療トレンドリサーチャーです。日本語のみで出力します。

Generate 8-12 ADDITIONAL Japanese search keywords or short phrases that real patients, social media users, or news outlets would currently search/post about, related to these seeds. Include:
- specific procedure names and brand/drug names
- common slang or abbreviations used on SNS
- adjacent trending topics (new treatments, controversies, viral terms)

Do not repeat the seed keywords. Do not include English-only terms unless they are commonly used as-is in Japanese (e.g. "GLP-1").

Respond with ONLY a single JSON object (no markdown fences, no extra text) with exactly one key:
- "keywords": an array of Japanese strings.

Seed keywords:
{seed}`,

  TREND_ANALYSIS: `You will be given a keyword, collected source data, and an optional X/Twitter signal summary.
Use the X signal (tweet count, dominant sentiment, sample tweets) to make the title, summary, and why_it_matters vivid and specific — quote real patient language where it adds colour.

Analyze this Japanese beauty/cosmetic-medicine trend candidate for:
1. patient anxiety
2. misinformation
3. cosmetic procedure misunderstanding
4. medical risk or side effects
5. consultation relevance
6. anatomy or design explanation

Reject celebrity speculation, influencer drama, pure makeup/fashion, unsafe medical claims, and topics where doctor commentary adds no unique value.

Respond with ONLY a single JSON object (no markdown fences, no extra text) with exactly these three keys:
- "title": a short, punchy Japanese YouTube video title (under 40 characters) that is SPECIFIC to this exact trend and the data below — do not produce a generic template title, and do not reuse the same phrasing across different keywords.
- "summary": a 1-2 sentence Japanese summary of why this topic is trending right now, based on the collected data below.
- "why_it_matters": a 1 sentence Japanese explanation of why a doctor (りき先生) should address this topic on the channel.`,

  VIDEO_BRIEF: `Create a 3-5 minute Japanese talking-segment brief for the trend below.

Structure: Hook → Conclusion → Reason → Common misunderstanding → Doctor advice → Reassurance → Soft CTA

Output ONLY a JSON object with this exact shape (all values in Japanese):

{
  "title_options": ["タイトル案1", "タイトル案2", "タイトル案3"],
  "hook": "冒頭15秒。視聴者の不安・疑問を言語化する",
  "conclusion": "結論。「結論から言うと、〇〇です。ただし注意点があります。」の型",
  "outline": ["構成ステップ1", "構成ステップ2", "...(5-6項目)"],
  "talking_points": ["話すべき要点(4-6個)"],
  "risks_to_mention": ["必ず言及するリスク・注意点(2-4個)"],
  "cta": "押し付けないソフトなCTA(カウンセリングへの自然な誘導)"
}

Rules:
- 断定的・誇大表現(絶対/100%/誰でも)は禁止
- 売り込まない。リスクは正直に
- 「不安になりすぎなくて大丈夫です」のトーンで安心感を与える`,

  RIKI_STYLE: `りき先生の話し方:
- calm, direct, reassuring
- doctor-like but not stiff
- patient-first, risk-aware, not salesy
- avoid fear-based claims and absolute promises

Reusable phrases:
- 結論から言うと、〇〇です。ただし注意点があります。
- 不安になりすぎなくて大丈夫です。
- ご自身のお目元に合っているかが大事です。`,
};
