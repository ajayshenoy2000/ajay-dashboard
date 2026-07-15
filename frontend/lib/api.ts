import { sampleBrief, sampleSources, sampleTrends } from "./trend-engine/server/sample-data";
import type { AppSettings, Brief, KeywordBank, SearchNowRequest, SearchNowResponse, SourceItem, Trend } from "./types";
import { authFetch } from "./authFetch";

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await authFetch(path, { cache: "no-store" });
    if (!response.ok) {
      console.warn(`API request failed: ${path} (${response.status})`);
      return fallback;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.warn(`API request error: ${path}`, error);
    return fallback;
  }
}

// Note: no longer passes Next.js `next: { revalidate }` — that option only
// applies to server-side fetch caching, and every call here now carries a
// per-user Authorization header, so a shared/revalidated cache would risk
// serving one user's data to another. All callers are client components
// anyway (this option was already a no-op for them), so this is a no-op
// behavior change, not a regression.
async function getJsonRevalidated<T>(path: string, fallback: T, _revalidateSeconds: number): Promise<T> {
  return getJson(path, fallback);
}

export function getTopTrends() {
  return getJson<Trend[]>("/api/top-trends", sampleTrends);
}

export function getTrendHistory() {
  return getJson<Trend[]>("/api/trend-history", []);
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
  return getJsonRevalidated<SourceItem[]>("/api/sources", sampleSources, 60);
}

export function getSettings() {
  return getJsonRevalidated<AppSettings>(
    "/api/settings",
    {
      keywords: ["二重整形", "埋没", "クマ取り", "美容医療", "涙袋", "ヒアルロン酸", "ボトックス", "マンジャロ", "GLP-1"],
      keywordBanks: [{ id: "japanese-aesthetic-core", name: "Japanese Aesthetic Core", keywords: ["二重整形", "埋没", "クマ取り", "美容医療", "涙袋", "ヒアルロン酸", "ボトックス", "マンジャロ", "GLP-1"] }],
      activeKeywordBankId: "japanese-aesthetic-core",
      scoringWeights: {
        trend_momentum: 25,
        google_search_demand: 20,
        medical_relevance: 20,
        youtube_historical_fit: 20,
        conversion_potential: 10,
        safety_brand_fit: 5,
      },
      channelId: "",
      modelProvider: "mock",
      lastSearch: {
        mode: "sample",
        timeWindow: "sample",
        sources: ["x", "google_news", "google_trends", "youtube"],
      },
      apiKeys: { youtube: false, x: false, openrouter: false },
    },
    30,
  );
}

export async function saveKeywordBanks(keywordBanks: KeywordBank[], activeKeywordBankId: string): Promise<AppSettings> {
  const response = await authFetch("/api/keyword-banks", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywordBanks, activeKeywordBankId }),
  });
  if (!response.ok) throw new Error((await response.text()) || "Failed to save keyword banks");
  return response.json() as Promise<AppSettings>;
}

export async function searchNow(payload: SearchNowRequest): Promise<SearchNowResponse> {
  const response = await authFetch("/api/search-now", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error((await response.text()) || "Search failed");
  return (await response.json()) as SearchNowResponse;
}

export async function generateBrief(rowId: string): Promise<Brief> {
  const response = await authFetch("/api/generate-brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rowId }),
  });
  if (!response.ok) throw new Error((await response.text()) || "Brief generation failed");
  return (await response.json()) as Brief;
}

export async function deleteTrend(rowId: string): Promise<void> {
  if (!rowId) throw new Error("Trend ID is required");
  const response = await authFetch(`/api/trends/${rowId}`, { method: "DELETE" });
  if (!response.ok) throw new Error((await response.text()) || "Failed to delete trend");
}

export async function deleteBrief(briefId: string): Promise<void> {
  if (!briefId) throw new Error("Brief ID is required");
  const response = await authFetch(`/api/briefs/${briefId}`, { method: "DELETE" });
  if (!response.ok) throw new Error((await response.text()) || "Failed to delete brief");
}

export async function clearTrendHistory(olderThanHours: number): Promise<{ deletedCount: number }> {
  const response = await authFetch("/api/clear-history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ olderThanHours }),
  });
  if (!response.ok) throw new Error((await response.text()) || "Clear history failed");
  return (await response.json()) as { deletedCount: number };
}

export async function setCustomKeywords(keywords: string[], useCustomOnly: boolean): Promise<void> {
  const response = await authFetch("/api/custom-keywords", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords, useCustomOnly }),
  });
  if (!response.ok) throw new Error((await response.text()) || "Failed to set custom keywords");
}

export async function getCustomKeywords(): Promise<{ customKeywords: string[] | null; useCustomOnly: boolean }> {
  return getJson("/api/custom-keywords", { customKeywords: null, useCustomOnly: false });
}

export async function updateChannelId(channelId: string): Promise<{ success: boolean; baseline: unknown }> {
  const response = await authFetch("/api/update-channel-id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelId }),
  });
  if (!response.ok) throw new Error((await response.text()) || "Channel ID update failed");
  return (await response.json()) as { success: boolean; baseline: unknown };
}

export async function getChannelBaseline(): Promise<{ baseline: unknown }> {
  return getJson("/api/channel-baseline", { baseline: null });
}

export async function getRegionCode(): Promise<{ regionCode: string }> {
  return getJson("/api/region-code", { regionCode: "JP" });
}

export async function setRegionCode(regionCode: string): Promise<{ regionCode: string }> {
  const response = await authFetch("/api/region-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ regionCode }),
  });
  if (!response.ok) throw new Error((await response.text()) || "Region update failed");
  return (await response.json()) as { regionCode: string };
}
