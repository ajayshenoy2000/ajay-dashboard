import type { AppConfig } from "../types";
import type { CapturePayload, StoredAd } from "./diff";
import { getDb } from "./db";
import seedJson from "./niches.seed.json";

const CONFIG_TABLE = "metascraper_config";
const ADS_TABLE = "metascraper_ads";
const CAPTURES_TABLE = "metascraper_captures";
const CONFIG_ID = "config";

export function loadSeedConfig(): AppConfig {
  return seedJson as AppConfig;
}

// ─── Config ─────────────────────────────────────────────────────────────────

export async function loadConfig(): Promise<AppConfig> {
  const db = getDb();
  if (!db) return loadSeedConfig();
  const { data } = await db.from(CONFIG_TABLE).select("payload").eq("id", CONFIG_ID).limit(1);
  if (data && data.length > 0) return data[0].payload as AppConfig;
  const seed = loadSeedConfig();
  await saveConfig(seed);
  return seed;
}

export async function saveConfig(config: AppConfig): Promise<AppConfig> {
  const db = getDb();
  if (db) await db.from(CONFIG_TABLE).upsert({ id: CONFIG_ID, payload: config });
  return config;
}

export async function resetConfig(): Promise<AppConfig> {
  return saveConfig(loadSeedConfig());
}

// ─── Ads ────────────────────────────────────────────────────────────────────

export async function loadAds(): Promise<StoredAd[]> {
  const db = getDb();
  if (!db) return [];
  const { data } = await db.from(ADS_TABLE).select("payload");
  return (data ?? []).map((r) => r.payload as StoredAd);
}

export async function saveAds(ads: StoredAd[]): Promise<void> {
  const db = getDb();
  if (!db || ads.length === 0) return;
  await db
    .from(ADS_TABLE)
    .upsert(ads.map((a) => ({ library_id: a.library_id, payload: a })));
}

export async function updateAd(ad: StoredAd): Promise<void> {
  await saveAds([ad]);
}

// ─── Captures ────────────────────────────────────────────────────────────────

export async function recordCapture(
  capture: CapturePayload,
  summary: Record<string, unknown>,
): Promise<void> {
  const db = getDb();
  if (!db) return;
  const payload = {
    captured_date: capture.captured_date,
    country: capture.country,
    hunted_scope: capture.hunted_scope,
    ad_count: capture.ads.length,
    ...summary,
  };
  await db
    .from(CAPTURES_TABLE)
    .upsert({ captured_date: capture.captured_date, payload });
}

export async function listCaptures(): Promise<Record<string, unknown>[]> {
  const db = getDb();
  if (!db) return [];
  const { data } = await db.from(CAPTURES_TABLE).select("payload");
  const items = (data ?? []).map((r) => r.payload as Record<string, unknown>);
  return items.sort((a, b) =>
    String(b.captured_date ?? "").localeCompare(String(a.captured_date ?? "")),
  );
}

export async function previousCaptureDate(before: string): Promise<string | null> {
  const captures = await listCaptures();
  const dates = captures
    .map((c) => String(c.captured_date ?? ""))
    .filter((d) => d < before);
  return dates.length ? dates[0] : null;
}
