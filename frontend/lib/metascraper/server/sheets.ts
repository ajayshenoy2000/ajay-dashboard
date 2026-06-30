import type { StoredAd } from "./diff";
import { isProven, longevityRanks } from "./diff";

const SHEET_COLUMNS = [
  "library_id", "status", "page_name", "niche_id", "days_active",
  "weeks_observed", "started_running_date", "first_seen", "last_seen",
  "media_type", "platforms", "cta_label", "hook_category", "proven",
  "longevity_rank", "ad_library_url", "landing_url", "media_url",
  "primary_text", "headline", "notes",
];

export function isConfigured(): boolean {
  return Boolean(process.env.METASCRAPER_SHEET_WEBHOOK_URL);
}

function rowFor(ad: StoredAd, rank: number | undefined): Record<string, unknown> {
  return {
    library_id: ad.library_id,
    status: ad.status,
    page_name: ad.page_name,
    niche_id: ad.niche_id,
    days_active: ad.days_active,
    weeks_observed: ad.weeks_observed,
    started_running_date: ad.started_running_date,
    first_seen: ad.first_seen,
    last_seen: ad.last_seen,
    media_type: ad.media_type,
    platforms: ad.platforms.join(","),
    cta_label: ad.cta_label,
    hook_category: ad.hook_category,
    proven: isProven(ad.days_active) ? "yes" : "",
    longevity_rank: rank ?? null,
    ad_library_url: ad.ad_library_url,
    landing_url: ad.landing_url,
    media_url: ad.media_url,
    primary_text: ad.primary_text,
    headline: ad.headline,
    notes: ad.notes,
  };
}

export async function syncToSheet(ads: StoredAd[]): Promise<Record<string, unknown>> {
  const webhookUrl = process.env.METASCRAPER_SHEET_WEBHOOK_URL;
  if (!webhookUrl) return { synced: false, reason: "sheet_webhook_not_configured" };

  const ranks = longevityRanks(ads);
  const rows = ads.map((ad) => rowFor(ad, ranks.get(ad.library_id)));
  const body = {
    secret: process.env.METASCRAPER_SHEET_SECRET ?? "",
    columns: SHEET_COLUMNS,
    key: "library_id",
    rows,
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      redirect: "follow",
    });
    if (!res.ok) return { synced: false, reason: `HTTP ${res.status}` };
    return { synced: true, rows: rows.length };
  } catch (err) {
    return { synced: false, reason: String(err) };
  }
}
