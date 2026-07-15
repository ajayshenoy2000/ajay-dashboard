import type { AppConfig } from "../types";
import type { CapturePayload, StoredAd } from "./diff";
import { isProven, longevityRanks, mergeCapture } from "./diff";
import { isConfigured, syncToSheet } from "./sheets";
import * as store from "./store";

const GROUP_LABELS: Record<string, string> = {
  surgical: "外科・整形系",
  injectable: "注入・注射系",
  skin: "美容皮膚科・肌治療",
  hair_removal: "脱毛",
  body: "痩身・ダイエット",
  hair_loss: "毛髪治療",
  mens: "メンズ",
  other: "その他・トレンド",
};

const HOOK_CATEGORIES = [
  "before_after", "price", "testimonial", "doctor_trust", "campaign", "other",
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function adView(ad: StoredAd, rank: number | undefined) {
  return { ...ad, proven: isProven(ad.days_active), longevity_rank: rank ?? null };
}

// ─── Config ──────────────────────────────────────────────────────────────────

export async function getConfig(userId: string) {
  const config = await store.loadConfig(userId);
  return { config, groupLabels: GROUP_LABELS, hookCategories: HOOK_CATEGORIES };
}

export async function putConfig(userId: string, data: AppConfig) {
  const config = await store.saveConfig(userId, data);
  return { config };
}

export async function resetConfig(userId: string) {
  const config = await store.resetConfig(userId);
  return { config };
}

// ─── Ingest ──────────────────────────────────────────────────────────────────

export async function ingestCapture(userId: string, capture: CapturePayload) {
  const today = todayIso();
  const before = await store.loadAds(userId);
  const beforeById = new Map(before.map((a) => [a.library_id, a]));

  const merged = mergeCapture(before, capture, today);
  await store.saveAds(userId, merged);

  const newIds = merged
    .filter((a) => a.status === "new" && !beforeById.has(a.library_id))
    .map((a) => a.library_id);
  const killedIds = merged
    .filter(
      (a) =>
        a.status === "killed" &&
        beforeById.has(a.library_id) &&
        beforeById.get(a.library_id)!.status !== "killed",
    )
    .map((a) => a.library_id);

  const summary = {
    ingested: capture.ads.length,
    store_size: merged.length,
    new: newIds.length,
    killed_this_run: killedIds.length,
    running: merged.filter((a) => a.status === "running").length,
  };

  await store.recordCapture(userId, capture, summary);
  const sheet = await syncToSheet(merged);
  return { ...summary, sheet };
}

// ─── Dashboard reads ─────────────────────────────────────────────────────────

export async function getAdsView(userId: string) {
  const ads = await store.loadAds(userId);
  const ranks = longevityRanks(ads);
  const view = ads.map((a) => adView(a, ranks.get(a.library_id)));
  view.sort(
    (a, b) =>
      (b.days_active != null ? 1 : 0) - (a.days_active != null ? 1 : 0) ||
      (b.days_active ?? 0) - (a.days_active ?? 0),
  );
  return view;
}

export async function getSummary(userId: string) {
  const [ads, config] = await Promise.all([store.loadAds(userId), store.loadConfig(userId)]);
  const labelOf = Object.fromEntries(config.niches.map((n) => [n.id, n.label_jp]));
  const groupOf = Object.fromEntries(config.niches.map((n) => [n.id, n.group]));

  const perNiche: Record<string, {
    niche_id: string; label_jp: string; group: string; group_label: string;
    active: number; killed: number; new: number;
    longest_days: number | null; longest_ad: unknown | null;
  }> = {};

  for (const ad of ads) {
    const bucket = (perNiche[ad.niche_id] ??= {
      niche_id: ad.niche_id,
      label_jp: labelOf[ad.niche_id] ?? ad.niche_id,
      group: groupOf[ad.niche_id] ?? "other",
      group_label: GROUP_LABELS[groupOf[ad.niche_id] ?? "other"] ?? "その他",
      active: 0, killed: 0, new: 0,
      longest_days: null, longest_ad: null,
    });
    if (ad.status === "killed") bucket.killed++;
    else bucket.active++;
    if (ad.status === "new") bucket.new++;
    if (ad.days_active != null && (bucket.longest_days == null || ad.days_active > bucket.longest_days)) {
      bucket.longest_days = ad.days_active;
      bucket.longest_ad = { library_id: ad.library_id, page_name: ad.page_name, ad_library_url: ad.ad_library_url };
    }
  }

  const captures = await store.listCaptures(userId);
  return {
    totals: {
      tracked: ads.length,
      active: ads.filter((a) => a.status !== "killed").length,
      killed: ads.filter((a) => a.status === "killed").length,
      proven: ads.filter((a) => isProven(a.days_active)).length,
    },
    niches: Object.values(perNiche).sort((a, b) => b.active - a.active),
    last_capture: (captures[0]?.captured_date as string) ?? null,
  };
}

export async function getDiffSinceLast(userId: string) {
  const captures = await store.listCaptures(userId);
  if (!captures.length) return { since: null, current: null, new: [], killed: [] };

  const currentDate = captures[0].captured_date as string;
  const prevDate = await store.previousCaptureDate(userId, currentDate);
  const ads = await store.loadAds(userId);
  const ranks = longevityRanks(ads);

  return {
    since: prevDate,
    current: currentDate,
    new: ads.filter((a) => a.first_seen === currentDate).map((a) => adView(a, ranks.get(a.library_id))),
    killed: ads
      .filter((a) => a.status === "killed" && prevDate != null && a.last_seen === prevDate)
      .map((a) => adView(a, ranks.get(a.library_id))),
  };
}

export async function patchAd(
  userId: string,
  libraryId: string,
  patch: { hook_category?: string | null; notes?: string | null },
) {
  const ads = await store.loadAds(userId);
  const target = ads.find((a) => a.library_id === libraryId);
  if (!target) return null;
  if ("hook_category" in patch) target.hook_category = patch.hook_category ?? null;
  if ("notes" in patch) target.notes = patch.notes ?? null;
  await store.updateAd(userId, target);
  const ranks = longevityRanks(ads);
  return adView(target, ranks.get(libraryId));
}

export async function getCaptures(userId: string) {
  return store.listCaptures(userId);
}

export async function getHealth(userId: string) {
  const [ads, captures] = await Promise.all([store.loadAds(userId), store.listCaptures(userId)]);
  return {
    ingest_token_set: Boolean(process.env.METASCRAPER_INGEST_TOKEN),
    sheet_configured: isConfigured(),
    store_size: ads.length,
    last_capture: (captures[0]?.captured_date as string) ?? null,
  };
}
