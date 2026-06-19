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

// Slow-changing data (settings, sources) doesn't need to be re-fetched on
// every navigation — short revalidation windows cut redundant backend calls
// without staling out mutation flows (POSTs aren't cached by this).
async function getJsonRevalidated<T>(path: string, fallback: T, revalidateSeconds: number): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${path}`, { next: { revalidate: revalidateSeconds } });
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
  return getJsonRevalidated<SourceItem[]>("/api/sources", sampleSources, 60);
}

export function getSettings() {
  return getJsonRevalidated<AppSettings>("/api/settings", {
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
  }, 30);
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

export interface Reminder {
  id: string;
  text: string;
  done: boolean;
}

export interface RemindersHealth {
  available: boolean;
  list: string;
  platform: string;
}

export async function getRemindersHealth(): Promise<RemindersHealth> {
  try {
    const response = await fetch(`${API_BASE}/api/reminders/health`, { cache: "no-store" });
    if (!response.ok) return { available: false, list: "Dashboard", platform: "unknown" };
    return (await response.json()) as RemindersHealth;
  } catch {
    return { available: false, list: "Dashboard", platform: "unknown" };
  }
}

export async function getReminders(includeCompleted = false): Promise<{ reminders: Reminder[]; available: boolean }> {
  try {
    const url = `${API_BASE}/api/reminders${includeCompleted ? "?include_completed=true" : ""}`;
    const response = await fetch(url, { cache: "no-store" });
    if (response.status === 503) return { reminders: [], available: false };
    if (!response.ok) return { reminders: [], available: true };
    return { reminders: (await response.json()) as Reminder[], available: true };
  } catch {
    return { reminders: [], available: true };
  }
}

export async function createReminder(text: string): Promise<Reminder> {
  const response = await fetch(`${API_BASE}/api/reminders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to create reminder");
  }
  return (await response.json()) as Reminder;
}

export async function completeReminder(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/reminders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done: true })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to complete reminder");
  }
}

export async function deleteReminder(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/reminders/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to delete reminder");
  }
}

export async function getRemindersList(): Promise<string> {
  try {
    const response = await fetch(`${API_BASE}/api/reminders/list`, { cache: "no-store" });
    if (!response.ok) return "Dashboard";
    return ((await response.json()) as { list: string }).list;
  } catch {
    return "Dashboard";
  }
}

export async function setRemindersList(list: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/reminders/list`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ list })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to update reminders list");
  }
  return ((await response.json()) as { list: string }).list;
}

export async function getAvailableLists(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE}/api/reminders/lists`, { cache: "no-store" });
    if (!response.ok) return [];
    return (await response.json()) as string[];
  } catch {
    return [];
  }
}
