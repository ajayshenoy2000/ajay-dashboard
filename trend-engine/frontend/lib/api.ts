import { sampleBrief, sampleSources, sampleTrends } from "./sampleData";
import type { AppSettings, Brief, SearchNowRequest, SearchNowResponse, SourceItem, Trend } from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (!response.ok) {
      console.warn(`API request failed: ${path} (${response.status})`);
      return fallback;
    }
    const data = await response.json();
    return data as T;
  } catch (error) {
    console.warn(`API request error: ${path}`, error);
    return fallback;
  }
}

export function getTopTrends() {
  return getJson<Trend[]>("/api/top-trends", sampleTrends);
}

export function getTrendHistory() {
  return getJson<Trend[]>("/api/trend-history", []);
}

export function getRecordThisWeek() {
  return getJson<Trend[]>("/api/record-this-week", sampleTrends.slice(0, 2));
}

export function getVideoOpportunities() {
  return getJson<Trend[]>("/api/video-opportunities", sampleTrends.slice(0, 2));
}

export function getTrend(id: string) {
  const fallback = sampleTrends.find((trend) => trend.id === id) ?? sampleTrends[0];
  return getJson<Trend>(`/api/trends/${id}`, fallback);
}

export function getBrief(id: string) {
  return getJson<Brief>(`/api/briefs/${id}`, sampleBrief);
}

export function getBriefs() {
  return getJson<Brief[]>("/api/briefs", [sampleBrief]);
}

export function getSources() {
  return getJson<SourceItem[]>("/api/sources", sampleSources);
}

export function getSettings() {
  return getJson<AppSettings>("/api/settings", {
    keywords: ["二重整形", "埋没", "クマ取り", "美容医療", "涙袋", "ヒアルロン酸", "ボトックス", "マンジャロ", "GLP-1"],
    scoringWeights: {
      trend_momentum: 25,
      google_search_demand: 20,
      medical_relevance: 20,
      youtube_historical_fit: 20,
      conversion_potential: 10,
      safety_brand_fit: 5
    },
    channelId: "",
    modelProvider: "mock",
    analysisModelProvider: "gpt",
    briefModelProvider: "claude",
    lastSearch: {
      mode: "sample",
      timeWindow: "sample",
      sources: ["x", "google_news", "google_trends", "youtube"],
      analysisModelProvider: "gpt",
      briefModelProvider: "claude"
    },
    apiKeys: {
      youtube: false,
      x: false,
      anthropic: false,
      openai: false
    }
  });
}

export async function searchNow(payload: SearchNowRequest): Promise<SearchNowResponse> {
  const response = await fetch(`${API_BASE}/api/search-now`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Search failed");
  }
  return (await response.json()) as SearchNowResponse;
}

export async function generateBrief(rowId: string): Promise<Brief> {
  const response = await fetch(`${API_BASE}/api/generate-brief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rowId })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Brief generation failed");
  }
  return (await response.json()) as Brief;
}

export async function deleteTrend(rowId: string): Promise<void> {
  if (!rowId) throw new Error("Trend ID is required");
  const response = await fetch(`${API_BASE}/api/trends/${rowId}`, { method: "DELETE" });
  if (!response.ok) {
    const message = await response.text();
    console.error("Delete trend error:", message);
    throw new Error(message || "Failed to delete trend");
  }
}

export async function deleteBrief(briefId: string): Promise<void> {
  if (!briefId) throw new Error("Brief ID is required");
  const response = await fetch(`${API_BASE}/api/briefs/${briefId}`, { method: "DELETE" });
  if (!response.ok) {
    const message = await response.text();
    console.error("Delete brief error:", message);
    throw new Error(message || "Failed to delete brief");
  }
}

export async function clearTrendHistory(olderThanHours: number): Promise<{ deletedCount: number }> {
  const response = await fetch(`${API_BASE}/api/clear-history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ olderThanHours })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Clear history failed");
  }
  return (await response.json()) as { deletedCount: number };
}

export async function setCustomKeywords(keywords: string[], useCustomOnly: boolean): Promise<void> {
  const response = await fetch(`${API_BASE}/api/custom-keywords`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords, useCustomOnly })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to set custom keywords");
  }
}

export async function getCustomKeywords(): Promise<{ customKeywords: string[] | null; useCustomOnly: boolean }> {
  return getJson(`/api/custom-keywords`, { customKeywords: null, useCustomOnly: false });
}

export async function updateChannelId(channelId: string): Promise<{ success: boolean; baseline: any }> {
  const response = await fetch(`${API_BASE}/api/update-channel-id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelId })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Channel ID update failed");
  }
  return (await response.json()) as { success: boolean; baseline: any };
}

export async function getChannelBaseline(): Promise<{ baseline: any }> {
  return getJson(`/api/channel-baseline`, { baseline: null });
}

export async function getRegionCode(): Promise<{ regionCode: string }> {
  return getJson(`/api/region-code`, { regionCode: "JP" });
}

export async function setRegionCode(regionCode: string): Promise<{ regionCode: string }> {
  const response = await fetch(`${API_BASE}/api/region-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ regionCode })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Region update failed");
  }
  return (await response.json()) as { regionCode: string };
}
