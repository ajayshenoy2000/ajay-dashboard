import type { YouTubeVideo } from "@/lib/types";
import { youtubeGet, videosFromIds } from "../collectors/youtube";

export async function computeChannelBaseline(channelId: string): Promise<Record<string, unknown> | null> {
  try {
    const channelsPayload = await youtubeGet("channels", { part: "contentDetails", id: channelId });
    const items = (channelsPayload.items as Record<string, unknown>[]) ?? [];
    if (!items.length) return null;
    const uploadsPlaylistId = ((items[0]?.contentDetails as Record<string, unknown>)?.relatedPlaylists as Record<string, unknown>)?.uploads as string | undefined;
    if (!uploadsPlaylistId) return null;

    const videoIds: string[] = [];
    let pageToken: string | undefined;
    for (let i = 0; i < 4; i++) {
      const payload = await youtubeGet("playlistItems", {
        part: "contentDetails",
        playlistId: uploadsPlaylistId,
        maxResults: 50,
        ...(pageToken ? { pageToken } : {}),
      });
      for (const item of (payload.items as Record<string, unknown>[]) ?? []) {
        const vid = ((item?.contentDetails as Record<string, unknown>)?.videoId) as string | undefined;
        if (vid) videoIds.push(vid);
      }
      pageToken = payload.nextPageToken as string | undefined;
      if (!pageToken) break;
    }
    if (!videoIds.length) return null;

    const videos = await videosFromIds(videoIds);
    if (!videos.length) return null;

    const viewCounts = videos.filter((v) => v.views > 0).map((v) => v.views);
    const engagementRates = videos
      .filter((v) => v.views > 0)
      .map((v) => (v.likes + v.comments) / v.views);
    const engagementScores = videos.filter((v) => v.views > 0).map((v) => v.likes + v.comments);

    if (!viewCounts.length) return null;

    const median = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };

    return {
      channel_id: channelId,
      baseline_views: median(viewCounts),
      baseline_engagement_rate: median(engagementRates),
      baseline_engagement_score: median(engagementScores),
      computed_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function scoreVideoAnomaly(
  video: YouTubeVideo,
  baseline: Record<string, unknown> | null,
  timeWindowHours: number,
): { views_anomaly: number; engagement_anomaly: number; recency_weight: number; anomaly_score: number } {
  let recencyWeight = 1.0;
  if (timeWindowHours > 0) {
    const ageHours = (Date.now() - new Date(video.publishedAt).getTime()) / 3_600_000;
    const ageRatio = Math.min(1.0, ageHours / timeWindowHours);
    recencyWeight = 1.0 + (1.0 - ageRatio) * 0.3;
  }

  const baselineViews = baseline ? Number(baseline.baseline_views ?? 0) : 0;
  if (!baseline || baselineViews === 0) {
    return { views_anomaly: 0, engagement_anomaly: 0, recency_weight: recencyWeight, anomaly_score: 0 };
  }

  const engRate = video.views > 0 ? (video.likes + video.comments) / video.views : 0;
  const viewsAnomaly = (video.views - baselineViews) / baselineViews;
  const baseEngRate = Number(baseline.baseline_engagement_rate ?? 0);
  const engAnomaly = baseEngRate > 0 ? (engRate - baseEngRate) / baseEngRate : engRate;
  const anomalyScore = (viewsAnomaly * 0.5 + engAnomaly * 0.5) * recencyWeight;

  return {
    views_anomaly: viewsAnomaly,
    engagement_anomaly: engAnomaly,
    recency_weight: recencyWeight,
    anomaly_score: anomalyScore,
  };
}
