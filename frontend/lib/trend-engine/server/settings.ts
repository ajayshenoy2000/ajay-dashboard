import { getDb } from "./db";
import type { KeywordBank } from "@/lib/types";

export const DEFAULT_KEYWORDS = [
  "二重整形", "埋没", "クマ取り", "美容整形", "美容医療", "涙袋", "ヒアルロン酸",
  "ボトックス", "マンジャロ", "GLP-1", "リベルサス", "ダイエット注射",
  "中顔面短縮", "人中短縮", "韓国メイク", "韓国アイドル顔",
];

export const DEFAULT_WEIGHTS = {
  trend_momentum: 25,
  google_search_demand: 20,
  medical_relevance: 20,
  youtube_historical_fit: 20,
  conversion_potential: 10,
  safety_brand_fit: 5,
};

export const DEFAULT_KEYWORD_BANK: KeywordBank = {
  id: "japanese-aesthetic-core",
  name: "Japanese Aesthetic Core",
  keywords: DEFAULT_KEYWORDS,
};

export type TrendSettings = {
  keywords: string[];
  customKeywords: string[] | null;
  useCustomOnly: boolean;
  scoringWeights: Record<string, number>;
  keywordBanks: KeywordBank[];
  activeKeywordBankId: string;
  channelBaseline: Record<string, unknown> | null;
  channelId: string;
  regionCode: string;
  lastSources: unknown[];
  lastSearchMeta: Record<string, unknown>;
};

// trend_settings is a one-row-per-user table (single-user app, no org layer —
// see Phase 2 of the overhaul plan). `id` stays the table's primary key for
// legacy-schema reasons, but `user_id` (unique) is the real key every read/
// write goes through here.
export async function loadSettings(userId: string): Promise<TrendSettings> {
  const db = getDb();
  if (!db) return defaultSettings();

  const { data } = await db.from("trend_settings").select("*").eq("user_id", userId).limit(1);
  if (!data?.length) {
    await db.from("trend_settings").upsert({ id: userId, user_id: userId }, { onConflict: "user_id" });
    return defaultSettings();
  }

  const row = data[0];
  const meta = row.last_search_meta ?? defaultSearchMeta();
  const storedBanks = row.keyword_banks ?? meta.keywordBanks;
  const keywordBanks = Array.isArray(storedBanks) && storedBanks.length
    ? storedBanks as KeywordBank[]
    : [{ ...DEFAULT_KEYWORD_BANK, keywords: row.keywords?.length ? row.keywords : DEFAULT_KEYWORDS }];
  return {
    keywords: row.keywords?.length ? row.keywords : DEFAULT_KEYWORDS,
    customKeywords: row.custom_keywords?.length ? row.custom_keywords : null,
    useCustomOnly: Boolean(row.use_custom_only),
    scoringWeights: row.scoring_weights ?? DEFAULT_WEIGHTS,
    keywordBanks,
    activeKeywordBankId: row.active_keyword_bank_id ?? meta.activeKeywordBankId ?? keywordBanks[0].id,
    channelBaseline: row.channel_baseline ?? null,
    channelId: row.channel_id ?? meta.channelId ?? process.env.YOUTUBE_CHANNEL_ID ?? "",
    regionCode: row.region_code ?? "JP",
    lastSources: (row.last_sources as unknown[] | null) ?? [],
    lastSearchMeta: meta,
  };
}

export async function saveSettings(userId: string, patch: Partial<TrendSettings>): Promise<void> {
  const db = getDb();
  if (!db) return;

  const row: Record<string, unknown> = { id: userId, user_id: userId, updated_at: new Date().toISOString() };
  if ("keywords" in patch) row.keywords = patch.keywords;
  if ("customKeywords" in patch) row.custom_keywords = patch.customKeywords ?? [];
  if ("useCustomOnly" in patch) row.use_custom_only = patch.useCustomOnly;
  if ("scoringWeights" in patch) row.scoring_weights = patch.scoringWeights;
  if ("channelBaseline" in patch) row.channel_baseline = patch.channelBaseline;
  if ("regionCode" in patch) row.region_code = patch.regionCode;
  if ("lastSources" in patch) row.last_sources = patch.lastSources;
  if ("lastSearchMeta" in patch) row.last_search_meta = patch.lastSearchMeta;

  const { error } = await db.from("trend_settings").upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(`trend_settings upsert failed: ${error.message} (code=${error.code})`);
}

function defaultSettings(): TrendSettings {
  return {
    keywords: DEFAULT_KEYWORDS,
    customKeywords: null,
    useCustomOnly: false,
    scoringWeights: DEFAULT_WEIGHTS,
    keywordBanks: [DEFAULT_KEYWORD_BANK],
    activeKeywordBankId: DEFAULT_KEYWORD_BANK.id,
    channelBaseline: null,
    channelId: process.env.YOUTUBE_CHANNEL_ID ?? "",
    regionCode: "JP",
    lastSources: [],
    lastSearchMeta: defaultSearchMeta(),
  };
}

function defaultSearchMeta(): Record<string, unknown> {
  return {
    mode: "sample",
    timeWindow: "sample",
    sources: ["x", "google_news", "google_trends", "youtube"],
  };
}
