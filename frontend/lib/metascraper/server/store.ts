import type { AppConfig } from "../types";
import type { CapturePayload, StoredAd } from "./diff";
import { getDb } from "./db";
import seedJson from "./niches.seed.json";

const CONFIG_TABLE = "metascraper_config";
const ADS_TABLE = "metascraper_ads";
const CAPTURES_TABLE = "metascraper_captures";

export function loadSeedConfig(): AppConfig {
  return seedJson as AppConfig;
}

// ─── Config ─────────────────────────────────────────────────────────────────
// One-row-per-user (single-user app, no org layer — see Phase 2 of the
// overhaul plan). `id` stays the table's primary key for legacy-schema
// reasons; `user_id` (unique) is the real key.

export async function loadConfig(userId: string): Promise<AppConfig> {
  const db = getDb();
  if (!db) return loadSeedConfig();
  const { data } = await db.from(CONFIG_TABLE).select("payload").eq("user_id", userId).limit(1);
  if (data && data.length > 0) return data[0].payload as AppConfig;
  const seed = loadSeedConfig();
  await saveConfig(userId, seed);
  return seed;
}

export async function saveConfig(userId: string, config: AppConfig): Promise<AppConfig> {
  const db = getDb();
  if (db) {
    const { error } = await db
      .from(CONFIG_TABLE)
      .upsert({ id: userId, user_id: userId, payload: config }, { onConflict: "user_id" });
    if (error) throw new Error(`metascraper_config upsert failed: ${error.message}`);
  }
  return config;
}

export async function resetConfig(userId: string): Promise<AppConfig> {
  return saveConfig(userId, loadSeedConfig());
}

// ─── Ads ────────────────────────────────────────────────────────────────────

export async function loadAds(userId: string): Promise<StoredAd[]> {
  const db = getDb();
  if (!db) return [];
  const { data } = await db.from(ADS_TABLE).select("payload").eq("user_id", userId);
  return (data ?? []).map((r) => r.payload as StoredAd);
}

export async function saveAds(userId: string, ads: StoredAd[]): Promise<void> {
  const db = getDb();
  if (!db || ads.length === 0) return;
  const rows = ads.map((a) => ({ library_id: a.library_id, user_id: userId, payload: a }));
  // Batch in chunks of 50 to stay within PostgREST payload limits
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await db.from(ADS_TABLE).upsert(rows.slice(i, i + 50));
    if (error) throw new Error(`metascraper_ads upsert: ${error.message} (code=${error.code})`);
  }
}

export async function updateAd(userId: string, ad: StoredAd): Promise<void> {
  await saveAds(userId, [ad]);
}

// ─── Captures ────────────────────────────────────────────────────────────────

export async function recordCapture(
  userId: string,
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
  const { error } = await db
    .from(CAPTURES_TABLE)
    .upsert({ captured_date: capture.captured_date, user_id: userId, payload });
  if (error) throw new Error(`metascraper_captures upsert: ${error.message} (code=${error.code})`);
}

export async function listCaptures(userId: string): Promise<Record<string, unknown>[]> {
  const db = getDb();
  if (!db) return [];
  const { data } = await db.from(CAPTURES_TABLE).select("payload").eq("user_id", userId);
  const items = (data ?? []).map((r) => r.payload as Record<string, unknown>);
  return items.sort((a, b) =>
    String(b.captured_date ?? "").localeCompare(String(a.captured_date ?? "")),
  );
}

export async function previousCaptureDate(userId: string, before: string): Promise<string | null> {
  const captures = await listCaptures(userId);
  const dates = captures
    .map((c) => String(c.captured_date ?? ""))
    .filter((d) => d < before);
  return dates.length ? dates[0] : null;
}
