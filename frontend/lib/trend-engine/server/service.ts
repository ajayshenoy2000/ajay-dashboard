import type { Brief, SourceItem, Trend, YouTubeVideo } from "@/lib/types";
import { getDb } from "./db";
import { loadSettings, saveSettings, DEFAULT_KEYWORDS } from "./settings";
import { collectGoogleNews } from "./collectors/google-news";
import { collectGoogleTrends } from "./collectors/google-trends";
import { collectYoutubeHistory } from "./collectors/youtube";
import { collectXPosts } from "./collectors/x";
import { clusterByKeyword } from "./processors/cluster";
import { rejectionReasons } from "./processors/safety-filter";
import { scoreTrend } from "./processors/score";
import { computeChannelBaseline } from "./processors/channel-profile";
import { enrichTrendsWithAnalysis, expandKeywords } from "./llm/analysis";
import { generateBriefForTrend } from "./llm/brief-generator";
import { sampleTrends, sampleBrief, sampleSources } from "./sample-data";

export const TIME_WINDOWS: Record<string, number> = {
  "12h": 12, "24h": 24, "3d": 72, "7d": 168, "30d": 720, "60d": 1440, "90d": 2160,
};

const TITLE_TEMPLATES = [
  "{kw}って実際どうなの？医師目線で徹底解説",
  "今話題の{kw}、知らないと損するポイント",
  "{kw}のリスクと真実｜美容医療のプロが解説",
  "SNSで急増中の{kw}、その裏側を解説",
  "{kw}を検討する前に知っておきたいこと",
];

function fallbackTitle(keyword: string, sources: SourceItem[]): string {
  for (const s of sources) {
    if (s.title && s.title.trim() && s.title.trim() !== keyword) return s.title.slice(0, 60);
  }
  const tpl = TITLE_TEMPLATES[Math.abs([...keyword].reduce((h, c) => h * 31 + c.charCodeAt(0), 0)) % TITLE_TEMPLATES.length];
  return tpl.replace("{kw}", keyword);
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

function trendFromRow(row: Record<string, unknown>): Trend {
  const payload = row.payload as Record<string, unknown>;
  return { ...payload, rowId: row.row_id, createdAt: row.created_at, status: row.status } as unknown as Trend;
}

async function latestBatchId(db: NonNullable<ReturnType<typeof getDb>>): Promise<string | null> {
  const { data } = await db.from("search_batches").select("id").order("created_at", { ascending: false }).limit(1);
  return data?.[0]?.id ?? null;
}

async function attachBriefFlags(db: NonNullable<ReturnType<typeof getDb>>, trends: Trend[]): Promise<void> {
  const rowIds = trends.map((t) => t.rowId).filter(Boolean) as string[];
  if (!rowIds.length) return;
  const { data } = await db.from("briefs").select("trend_row_id").in("trend_row_id", rowIds);
  const haveBrief = new Set((data ?? []).map((r) => r.trend_row_id));
  for (const t of trends) t.hasBrief = haveBrief.has(t.rowId ?? "");
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getTopTrends(limit = 20): Promise<Trend[]> {
  const db = getDb();
  if (!db) return sampleTrends;
  const batchId = await latestBatchId(db);
  if (!batchId) return [];
  const { data } = await db.from("trends").select("*").eq("batch_id", batchId);
  const trends = (data ?? []).map(trendFromRow);
  await attachBriefFlags(db, trends);
  return trends.sort((a, b) => (b.score?.total ?? 0) - (a.score?.total ?? 0)).slice(0, limit);
}

export async function getTrendHistory(limit = 100): Promise<Trend[]> {
  const db = getDb();
  if (!db) return [];
  const batchId = await latestBatchId(db);
  let q = db.from("trends").select("*").order("created_at", { ascending: false }).limit(limit);
  if (batchId) q = q.neq("batch_id", batchId);
  const { data } = await q;
  const trends = (data ?? []).map(trendFromRow);
  await attachBriefFlags(db, trends);
  return trends;
}

export async function getRecordThisWeek(limit = 5): Promise<Trend[]> {
  const trends = await getTopTrends();
  return trends.filter((t) => (t.score?.medicalRelevance ?? 0) >= 14 && (t.score?.safetyBrandFit ?? 0) >= 3).slice(0, limit);
}

export async function getVideoOpportunities(limit = 10): Promise<Trend[]> {
  const trends = await getTopTrends();
  return trends.filter((t) => (t.score?.youtubeHistoricalFit ?? 0) >= 10 || (t.score?.conversionPotential ?? 0) >= 5).slice(0, limit);
}

export async function getTrend(rowId: string): Promise<Trend | null> {
  const db = getDb();
  if (!db) return sampleTrends.find((t) => t.id === rowId) ?? null;
  const { data } = await db.from("trends").select("*").eq("row_id", rowId).limit(1);
  if (!data?.length) return null;
  const trend = trendFromRow(data[0]);
  await attachBriefFlags(db, [trend]);
  return trend;
}

export async function deleteTrend(rowId: string): Promise<void> {
  const db = getDb();
  if (db) await db.from("trends").delete().eq("row_id", rowId);
}

export async function getBrief(briefId: string): Promise<Brief | null> {
  const db = getDb();
  if (!db) return sampleBrief;
  const { data } = await db.from("briefs").select("*").eq("id", briefId).limit(1);
  if (data?.length) return data[0].payload as Brief;
  const rowId = briefId.replace(/^brief-/, "");
  return generateAndSaveBrief(rowId);
}

export async function getBriefs(): Promise<Brief[]> {
  const db = getDb();
  if (!db) return [sampleBrief];
  const { data } = await db.from("briefs").select("*").order("created_at", { ascending: false });
  return (data ?? []).map((r) => r.payload as Brief);
}

export async function deleteBrief(briefId: string): Promise<void> {
  const db = getDb();
  if (db) await db.from("briefs").delete().eq("id", briefId);
}

export async function clearTrendHistory(olderThanHours: number): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const cutoff = new Date(Date.now() - olderThanHours * 3_600_000).toISOString();
  const batchId = await latestBatchId(db);
  let q = db.from("trends").delete().lt("created_at", cutoff);
  if (batchId) q = q.neq("batch_id", batchId);
  const { data } = await q;
  return (data as unknown as unknown[])?.length ?? 0;
}

export async function generateAndSaveBrief(rowId: string): Promise<Brief | null> {
  const briefId = `brief-${rowId}`;
  const db = getDb();
  if (db) {
    const { data: existing } = await db.from("briefs").select("*").eq("id", briefId).limit(1);
    if (existing?.length) return existing[0].payload as Brief;
  }

  const trend = await getTrend(rowId);
  if (!trend) return null;

  const settings = await loadSettings();
  const provider = (settings.lastSearchMeta.briefModelProvider as "claude" | "gpt") ?? "claude";
  const brief = await generateBriefForTrend(trend, provider);

  if (db) {
    await db.from("briefs").insert({ id: briefId, trend_row_id: rowId, trend_id: trend.id, payload: brief });
    await db.from("trends").update({ payload: { ...trend, hasBrief: true } }).eq("row_id", rowId);
  }
  return brief;
}

export async function getSources(): Promise<SourceItem[]> {
  const settings = await loadSettings();
  return settings.lastSources as SourceItem[];
}

export async function getAppSettings(): Promise<Record<string, unknown>> {
  const settings = await loadSettings();
  return {
    keywords: settings.keywords,
    scoringWeights: settings.scoringWeights,
    channelId: process.env.YOUTUBE_CHANNEL_ID ?? "",
    modelProvider: "live",
    analysisModelProvider: "gpt",
    briefModelProvider: "claude",
    lastSearch: settings.lastSearchMeta,
    apiKeys: {
      youtube: Boolean(process.env.YOUTUBE_API_KEY),
      x: Boolean(process.env.X_BEARER_TOKEN),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
    },
  };
}

export async function getCustomKeywords(): Promise<{ customKeywords: string[] | null; useCustomOnly: boolean }> {
  const s = await loadSettings();
  return { customKeywords: s.customKeywords, useCustomOnly: s.useCustomOnly };
}

export async function setCustomKeywords(keywords: string[], useCustomOnly: boolean): Promise<void> {
  await saveSettings({ customKeywords: keywords.length ? keywords : null, useCustomOnly });
}

export async function getRegionCode(): Promise<string> {
  return (await loadSettings()).regionCode;
}

export async function setRegionCode(regionCode: string): Promise<void> {
  await saveSettings({ regionCode });
}

export async function getChannelBaseline(): Promise<Record<string, unknown> | null> {
  return (await loadSettings()).channelBaseline;
}

export async function updateChannelId(channelId: string): Promise<Record<string, unknown> | null> {
  const baseline = await computeChannelBaseline(channelId);
  if (baseline) await saveSettings({ channelBaseline: baseline });
  return baseline;
}

export async function setTopicStatus(rowId: string, status: string): Promise<Trend | null> {
  const trend = await getTrend(rowId);
  if (!trend) return null;
  const db = getDb();
  if (db) await db.from("trends").update({ status, payload: { ...trend, status } }).eq("row_id", rowId);
  return { ...trend, status } as Trend;
}

// ─── Main search ─────────────────────────────────────────────────────────────

export async function runSearch(opts: {
  sources: string[];
  timeWindow: string;
  analysisModelProvider: "claude" | "gpt";
  briefModelProvider: "claude" | "gpt";
  regionCode?: string;
  checkForChannelFit?: boolean;
}): Promise<{ trends: Trend[]; recordThisWeek: Trend[]; meta: Record<string, unknown> }> {
  const settings = await loadSettings();
  const hours = TIME_WINDOWS[opts.timeWindow] ?? 24;
  const region = opts.regionCode ?? settings.regionCode;

  // Determine keyword set
  let keywords = settings.useCustomOnly
    ? (settings.customKeywords ?? [])
    : (settings.customKeywords ?? settings.keywords ?? DEFAULT_KEYWORDS);

  // Optional: expand keywords with LLM
  keywords = await expandKeywords(keywords, opts.analysisModelProvider).catch(() => keywords);

  const baseline = opts.checkForChannelFit ? settings.channelBaseline : null;

  // Collect from all enabled sources in parallel
  const [newsItems, trendsItems, ytVideos, xItems] = await Promise.all([
    opts.sources.includes("google_news") ? collectGoogleNews(keywords, 5, hours, region) : Promise.resolve([] as SourceItem[]),
    opts.sources.includes("google_trends") ? collectGoogleTrends(keywords, hours, region) : Promise.resolve([] as SourceItem[]),
    opts.sources.includes("youtube") ? collectYoutubeHistory(keywords, hours, baseline, region) : Promise.resolve([] as YouTubeVideo[]),
    opts.sources.includes("x") ? collectXPosts(keywords, hours) : Promise.resolve([] as SourceItem[]),
  ]);

  const allItems: SourceItem[] = [...xItems, ...newsItems, ...trendsItems];

  // Cluster → score → filter
  const trendObjects: Trend[] = [];
  for (const [keyword, sources] of Object.entries(clusterByKeyword(allItems))) {
    const text = sources.map((s) => `${s.title} ${s.text}`).join(" ");
    if (rejectionReasons(text).length) continue;
    const score = scoreTrend(keyword, sources, ytVideos, allItems, settings.scoringWeights);
    trendObjects.push({
      id: keyword.toLowerCase().replace(/\s+/g, "-"),
      rowId: null,
      createdAt: null,
      hasBrief: false,
      title: fallbackTitle(keyword, sources),
      keyword,
      summary: `直近${opts.timeWindow}の${keyword}に関する投稿・ニュース・検索シグナルがまとまって伸びています。`,
      clusterTerms: [...new Set(sources.map((s) => s.keyword))].sort(),
      score,
      sources,
      youtubeHistory: ytVideos,
      status: "new",
      whyItMatters: "医師が不安、誤解、リスクを整理する価値があるテーマです。",
      safetyNotes: ["断定的な効能表現を避ける", "適応と個人差を明確に伝える"],
    });
  }

  const ranked = trendObjects.sort((a, b) => (b.score?.total ?? 0) - (a.score?.total ?? 0));

  // Enrich top trends with LLM titles/summaries
  await enrichTrendsWithAnalysis(
    ranked as Parameters<typeof enrichTrendsWithAnalysis>[0],
    opts.analysisModelProvider,
  ).catch(() => {});

  // Persist to Supabase
  const db = getDb();
  const meta: Record<string, unknown> = {
    mode: "live",
    timeWindow: opts.timeWindow,
    sources: opts.sources,
    analysisModelProvider: opts.analysisModelProvider,
    briefModelProvider: opts.briefModelProvider,
    hours,
    keywordsUsed: keywords,
    xAvailable: Boolean(process.env.X_BEARER_TOKEN),
    sourcesAvailable: {
      x: Boolean(process.env.X_BEARER_TOKEN),
      google_news: true,
      google_trends: true,
      youtube: Boolean(process.env.YOUTUBE_API_KEY),
    },
  };

  if (db && ranked.length) {
    const { data: batch } = await db.from("search_batches").insert({ meta }).select("id").single();
    if (batch?.id) {
      const rows = ranked.map((t) => ({ trend_id: t.id, batch_id: batch.id, status: t.status, payload: t }));
      const { data: inserted } = await db.from("trends").insert(rows).select("row_id, created_at");
      for (let i = 0; i < ranked.length && i < (inserted ?? []).length; i++) {
        ranked[i].rowId = inserted![i].row_id;
        ranked[i].createdAt = inserted![i].created_at;
      }
    }
  }

  await saveSettings({ lastSources: allItems, lastSearchMeta: meta });

  const recordThisWeek = ranked
    .filter((t) => (t.score?.medicalRelevance ?? 0) >= 14 && (t.score?.safetyBrandFit ?? 0) >= 3)
    .slice(0, 5);

  return { trends: ranked, recordThisWeek, meta };
}
