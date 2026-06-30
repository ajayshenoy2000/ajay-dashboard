import type {
  AdRecord,
  AppConfig,
  Capture,
  ConfigResponse,
  DiffSinceLast,
  Health,
  Summary,
} from "./types";

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`MetaScraper API failed: ${path} (${res.status})`);
      return fallback;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`MetaScraper API error: ${path}`, err);
    return fallback;
  }
}

export function getConfig() {
  return getJson<ConfigResponse | null>("/api/metascraper/config", null);
}

export async function saveConfig(config: AppConfig): Promise<AppConfig> {
  const res = await fetch("/api/metascraper/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config }),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to save config");
  return (await res.json()).config as AppConfig;
}

export async function resetConfig(): Promise<AppConfig> {
  const res = await fetch("/api/metascraper/config/reset", { method: "POST" });
  if (!res.ok) throw new Error("Failed to reset config");
  return (await res.json()).config as AppConfig;
}

export function getAds() {
  return getJson<AdRecord[]>("/api/metascraper/ads", []);
}

export function getSummary() {
  return getJson<Summary | null>("/api/metascraper/summary", null);
}

export function getDiffSinceLast() {
  return getJson<DiffSinceLast | null>("/api/metascraper/diff-since-last", null);
}

export function getHealth() {
  return getJson<Health | null>("/api/metascraper/health", null);
}

export function getCaptures() {
  return getJson<Capture[]>("/api/metascraper/captures", []);
}

export async function importCapture(capture: unknown): Promise<unknown> {
  const res = await fetch("/api/metascraper/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(capture),
  });
  if (!res.ok) throw new Error((await res.text()) || "Import failed");
  return res.json();
}

export async function patchAd(
  libraryId: string,
  patch: { hook_category?: string | null; notes?: string | null },
): Promise<AdRecord> {
  const res = await fetch(`/api/metascraper/ads/${libraryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to update ad");
  return (await res.json()) as AdRecord;
}
