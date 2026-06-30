import type { YouTubeVideo } from "@/lib/types";
import { classifyTopic } from "../processors/classify";
import { scoreVideoAnomaly } from "../processors/channel-profile";

export async function youtubeGet(path: string, params: Record<string, string | number | undefined>): Promise<Record<string, unknown>> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY not set");
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) clean[k] = String(v);
  }
  const qs = new URLSearchParams({ ...clean, key: apiKey }).toString();
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${qs}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`YouTube API ${res.status}: ${path}`);
  return res.json();
}

function parseDurationSeconds(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return undefined;
  return (parseInt(m[1] ?? "0") * 3600) + (parseInt(m[2] ?? "0") * 60) + parseInt(m[3] ?? "0");
}

export async function videosFromIds(videoIds: string[]): Promise<YouTubeVideo[]> {
  const videos: YouTubeVideo[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    try {
      const payload = await youtubeGet("videos", {
        part: "snippet,statistics,contentDetails",
        id: batch.join(","),
      });
      for (const item of (payload.items as Record<string, unknown>[]) ?? []) {
        const snippet = (item.snippet as Record<string, unknown>) ?? {};
        const stats = (item.statistics as Record<string, unknown>) ?? {};
        const cd = (item.contentDetails as Record<string, unknown>) ?? {};
        const title = String(snippet.title ?? "");
        const description = String(snippet.description ?? "").slice(0, 500);
        videos.push({
          id: String(item.id ?? ""),
          title,
          description,
          publishedAt: String(snippet.publishedAt ?? new Date().toISOString()),
          views: parseInt(String(stats.viewCount ?? "0")),
          likes: parseInt(String(stats.likeCount ?? "0")),
          comments: parseInt(String(stats.commentCount ?? "0")),
          avgViewDurationSeconds: parseDurationSeconds(String(cd.duration ?? "")),
          category: classifyTopic(`${title} ${description}`),
        });
      }
    } catch {
      // batch failure — skip
    }
  }
  return videos;
}

async function searchKeyword(
  keyword: string,
  order: "relevance" | "viewCount",
  regionCode: string,
  languageCode: string,
): Promise<string[]> {
  try {
    const payload = await youtubeGet("search", {
      part: "snippet",
      q: keyword,
      type: "video",
      maxResults: 25,
      order,
      regionCode,
      relevanceLanguage: languageCode,
    });
    return ((payload.items as Record<string, unknown>[]) ?? [])
      .map((item) => (item.id as Record<string, unknown>)?.videoId as string)
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function collectYoutubeHistory(
  keywords: string[],
  hours?: number,
  channelBaseline?: Record<string, unknown> | null,
  regionCode = "JP",
  languageCode = "ja",
): Promise<YouTubeVideo[]> {
  if (!process.env.YOUTUBE_API_KEY || !keywords.length) return [];

  const seen = new Set<string>();
  const videoIds: string[] = [];

  const searches = keywords.slice(0, 8).flatMap((kw) => [
    searchKeyword(kw, "relevance", regionCode, languageCode),
    searchKeyword(kw, "viewCount", regionCode, languageCode),
  ]);
  const searchResults = await Promise.all(searches);
  for (const ids of searchResults) {
    for (const id of ids) {
      if (!seen.has(id)) { seen.add(id); videoIds.push(id); }
    }
  }
  if (!videoIds.length) return [];

  let videos = await videosFromIds(videoIds);

  if (hours) {
    const cutoff = Date.now() - hours * 3_600_000;
    videos = videos.filter((v) => new Date(v.publishedAt).getTime() >= cutoff);
  }
  if (!videos.length) return [];

  const baseline = channelBaseline ?? (() => {
    const viewCounts = videos.filter((v) => v.views > 0).map((v) => v.views);
    const engRates = videos.filter((v) => v.views > 0).map((v) => (v.likes + v.comments) / v.views);
    const sorted = (arr: number[]) => [...arr].sort((a, b) => a - b);
    const median = (arr: number[]) => arr[Math.floor(arr.length / 2)] ?? 0;
    return viewCounts.length ? {
      baseline_views: median(sorted(viewCounts)),
      baseline_engagement_rate: median(sorted(engRates)),
    } : null;
  })();

  const scored = videos.map((v) => ({
    video: v,
    score: baseline ? scoreVideoAnomaly(v, baseline, hours ?? 0).anomaly_score : 0,
  }));
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 200).map(({ video, score }) => ({ ...video, anomalyScore: score } as YouTubeVideo & { anomalyScore: number }));
}
