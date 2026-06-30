import type { SourceItem } from "@/lib/types";
import { createHash } from "crypto";

function googleNewsWhen(hours: number): string {
  if (hours <= 12) return "12h";
  if (hours <= 24) return "1d";
  if (hours <= 72) return "3d";
  if (hours <= 168) return "7d";
  return "30d";
}

function regionToLocale(regionCode: string): { hl: string; ceid: string; gl: string } {
  const map: Record<string, { hl: string; ceid: string; gl: string }> = {
    JP: { hl: "ja", ceid: "JP:ja", gl: "JP" },
    US: { hl: "en", ceid: "US:en", gl: "US" },
    GB: { hl: "en", ceid: "GB:en", gl: "GB" },
    IN: { hl: "en", ceid: "IN:en", gl: "IN" },
    DE: { hl: "de", ceid: "DE:de", gl: "DE" },
    FR: { hl: "fr", ceid: "FR:fr", gl: "FR" },
  };
  return map[regionCode] ?? map["US"];
}

async function fetchRss(
  url: string,
  keyword: string,
  idPrefix: string,
  engagement: number,
  limit: number,
): Promise<SourceItem[]> {
  const items: SourceItem[] = [];
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return items;
    const xml = await res.text();

    const itemMatches = [...xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/g)];
    for (const match of itemMatches.slice(0, limit)) {
      const itemXml = match[1];
      const title = (itemXml.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>/) ??
        itemXml.match(/<title[^>]*>(.*?)<\/title>/))?.[1] ?? keyword;
      const link = (itemXml.match(/<link[^>]*>(.*?)<\/link>/) ??
        itemXml.match(/<link>(.*?)<\/link>/))?.[1] ?? url;
      const pubDate = (itemXml.match(/<pubDate[^>]*>(.*?)<\/pubDate>/))?.[1];
      const description = (itemXml.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>/) ??
        itemXml.match(/<description[^>]*>(.*?)<\/description>/))?.[1] ?? title;

      let publishedAt = new Date().toISOString();
      if (pubDate) {
        try { publishedAt = new Date(pubDate).toISOString(); } catch { /* keep now */ }
      }
      const id = createHash("sha1").update(`${idPrefix}:${keyword}:${title}`).digest("hex");
      items.push({
        id,
        source: "google_news",
        title: title.replace(/<[^>]+>/g, "").trim(),
        text: (description || title).replace(/<[^>]+>/g, "").slice(0, 400),
        url: link.trim(),
        keyword,
        publishedAt,
        engagement,
        metadata: {},
      });
    }
  } catch {
    // network/parse failure — caller gets partial results
  }
  return items;
}

function recentOnly(items: SourceItem[], hours: number): SourceItem[] {
  const cutoff = Date.now() - hours * 3_600_000;
  return items.filter((item) => new Date(item.publishedAt).getTime() >= cutoff);
}

export async function collectGoogleNews(
  keywords: string[],
  limitPerKeyword = 5,
  hours = 24,
  regionCode = "JP",
): Promise<SourceItem[]> {
  const when = googleNewsWhen(hours);
  const { hl, ceid, gl } = regionToLocale(regionCode);

  const fetches = keywords.flatMap((keyword) => [
    fetchRss(
      `https://news.google.com/rss/search?q=${encodeURIComponent(`${keyword} when:${when}`)}&hl=${hl}&gl=${gl}&ceid=${ceid}`,
      keyword, "google_news", 25, limitPerKeyword,
    ),
    fetchRss(
      `https://www.bing.com/news/search?q=${encodeURIComponent(keyword)}&format=RSS&setlang=${hl}-${gl}&cc=${gl}`,
      keyword, "bing_news", 20, limitPerKeyword,
    ),
  ]);

  const results = await Promise.allSettled(fetches);
  const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  return recentOnly(all, hours);
}
