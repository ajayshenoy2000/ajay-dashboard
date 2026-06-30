import type { SourceItem } from "@/lib/types";
import { createHash } from "crypto";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const googleTrends = require("google-trends-api");

function trendsTimeframe(hours: number): string {
  if (hours <= 24) return "now 1-d";
  if (hours <= 168) return "now 7-d";
  return "today 1-m";
}

export async function collectGoogleTrends(
  keywords: string[],
  hours = 24,
  regionCode = "JP",
): Promise<SourceItem[]> {
  const items: SourceItem[] = [];
  const timeframe = trendsTimeframe(hours);
  const keyword = keywords[0]; // query one keyword at a time to stay within limits

  for (const kw of keywords.slice(0, 5)) {
    try {
      const raw = await googleTrends.relatedQueries({ keyword: kw, geo: regionCode, hl: regionCode === "JP" ? "ja" : "en", startTime: new Date(Date.now() - hours * 3_600_000) });
      const parsed = JSON.parse(raw);
      const topItems: Array<{ query: string; value: number }> =
        parsed?.default?.rankedList?.[0]?.rankedKeyword ?? [];
      const risingItems: Array<{ query: string; value: number }> =
        parsed?.default?.rankedList?.[1]?.rankedKeyword ?? [];

      for (const { isRising, list } of [
        { isRising: false, list: topItems.slice(0, 5) },
        { isRising: true, list: risingItems.slice(0, 5) },
      ]) {
        for (const { query, value } of list) {
          items.push({
            id: createHash("sha1")
              .update(`google_trends:${kw}:${query}:${isRising ? "rising" : "top"}`)
              .digest("hex"),
            source: "google_trends",
            title: query,
            text: `${kw} ${isRising ? "rising" : "top"} query: ${query}`,
            url: `https://trends.google.com/trends/explore?geo=${regionCode}&q=${encodeURIComponent(kw)}&date=${encodeURIComponent(timeframe)}`,
            keyword: kw,
            publishedAt: new Date().toISOString(),
            engagement: value,
            metadata: { rising: isRising },
          });
        }
      }
    } catch {
      // Google Trends can be rate-limited or unavailable; skip silently
    }
  }
  return items;
}
