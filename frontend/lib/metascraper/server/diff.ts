import type { AdStatus } from "../types";

export const PROVEN_DAYS = 56;

export interface StoredAd {
  library_id: string;
  niche_id: string;
  page_name: string;
  page_id: string | null;
  primary_text: string;
  headline: string | null;
  description: string | null;
  cta_label: string | null;
  media_type: string;
  platforms: string[];
  started_running_date: string | null;
  ad_library_url: string;
  landing_url: string | null;
  media_url: string | null;
  first_seen: string;
  last_seen: string;
  days_active: number | null;
  weeks_observed: number;
  status: AdStatus;
  hook_category: string | null;
  notes: string | null;
}

export interface CapturePayload {
  captured_date: string;
  country: string;
  ads: Record<string, unknown>[];
  hunted_scope: string[];
}

const VALID_MEDIA = new Set(["image", "video", "carousel", "unknown"]);

function normalizeMedia(v: unknown): string {
  return typeof v === "string" && VALID_MEDIA.has(v) ? v : "unknown";
}

function parseDateMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const d = new Date(value.slice(0, 10));
  return isNaN(d.getTime()) ? null : d.getTime();
}

export function computeDaysActive(startedRunningDate: string | null | undefined, anchor: string): number | null {
  const start = parseDateMs(startedRunningDate);
  const end = parseDateMs(anchor);
  if (start === null || end === null) return null;
  return Math.max(Math.floor((end - start) / 86_400_000), 0);
}

export function isProven(daysActive: number | null | undefined): boolean {
  return daysActive != null && daysActive > PROVEN_DAYS;
}

function scopeContains(scope: Set<string>, ad: StoredAd): boolean {
  if (ad.niche_id && scope.has(ad.niche_id)) return true;
  if (ad.page_id && scope.has(ad.page_id)) return true;
  return false;
}

function adFromRaw(raw: Record<string, unknown>, capturedDate: string): StoredAd {
  const libraryId = String(raw.library_id ?? "");
  return {
    library_id: libraryId,
    niche_id: String(raw.niche_id ?? ""),
    page_name: String(raw.page_name ?? ""),
    page_id: (raw.page_id as string | null) ?? null,
    primary_text: String(raw.primary_text ?? ""),
    headline: (raw.headline as string | null) ?? null,
    description: (raw.description as string | null) ?? null,
    cta_label: (raw.cta_label as string | null) ?? null,
    media_type: normalizeMedia(raw.media_type),
    platforms: Array.isArray(raw.platforms) ? raw.platforms.map(String) : [],
    started_running_date: (raw.started_running_date as string | null) ?? null,
    ad_library_url:
      String(raw.ad_library_url ?? "") ||
      `https://www.facebook.com/ads/library/?id=${libraryId}`,
    landing_url: (raw.landing_url as string | null) ?? null,
    media_url: (raw.media_url as string | null) ?? null,
    first_seen: capturedDate,
    last_seen: capturedDate,
    days_active: null,
    weeks_observed: 0,
    status: "new",
    hook_category: null,
    notes: null,
  };
}

export function mergeCapture(store: StoredAd[], capture: CapturePayload, today: string): StoredAd[] {
  const capturedDate = capture.captured_date;
  const incoming = new Map<string, Record<string, unknown>>();
  for (const raw of capture.ads) {
    const id = String(raw.library_id ?? "");
    if (id) incoming.set(id, raw);
  }

  const byId = new Map(store.map((a) => [a.library_id, a]));

  let scope = new Set(capture.hunted_scope);
  if (scope.size === 0) {
    for (const raw of capture.ads) {
      const n = raw.niche_id;
      if (typeof n === "string" && n) scope.add(n);
    }
  }

  const result: StoredAd[] = [];
  const seenIds = new Set<string>();

  // New + running
  for (const [libraryId, raw] of incoming) {
    seenIds.add(libraryId);
    const existing = byId.get(libraryId);
    const fresh = adFromRaw(raw, capturedDate);

    if (!existing) {
      fresh.status = "new";
      fresh.first_seen = capturedDate;
      fresh.last_seen = capturedDate;
      fresh.weeks_observed = 1;
      fresh.days_active = computeDaysActive(fresh.started_running_date, today);
      result.push(fresh);
    } else {
      const merged: StoredAd = {
        ...existing,
        page_name: fresh.page_name || existing.page_name,
        page_id: fresh.page_id ?? existing.page_id,
        primary_text: fresh.primary_text || existing.primary_text,
        headline: fresh.headline !== null ? fresh.headline : existing.headline,
        description: fresh.description !== null ? fresh.description : existing.description,
        cta_label: fresh.cta_label !== null ? fresh.cta_label : existing.cta_label,
        media_type: raw.media_type ? normalizeMedia(raw.media_type) : existing.media_type,
        platforms: fresh.platforms.length ? fresh.platforms : existing.platforms,
        started_running_date: fresh.started_running_date ?? existing.started_running_date,
        ad_library_url: fresh.ad_library_url || existing.ad_library_url,
        landing_url: fresh.landing_url !== null ? fresh.landing_url : existing.landing_url,
        media_url: fresh.media_url !== null ? fresh.media_url : existing.media_url,
        status: "running",
        last_seen: capturedDate,
        weeks_observed:
          existing.last_seen === capturedDate
            ? existing.weeks_observed
            : existing.weeks_observed + 1,
        hook_category: existing.hook_category,
        notes: existing.notes,
      };
      merged.days_active = computeDaysActive(merged.started_running_date, today);
      result.push(merged);
    }
  }

  // Killed / untouched
  for (const record of store) {
    if (seenIds.has(record.library_id)) continue;
    if (scopeContains(scope, record) && record.status !== "killed") {
      const killed: StoredAd = { ...record, status: "killed" };
      killed.days_active = computeDaysActive(killed.started_running_date, killed.last_seen);
      result.push(killed);
    } else {
      result.push(record);
    }
  }

  return result;
}

export function longevityRanks(store: StoredAd[]): Map<string, number> {
  const byNiche = new Map<string, StoredAd[]>();
  for (const ad of store) {
    if (ad.days_active === null) continue;
    const list = byNiche.get(ad.niche_id) ?? [];
    list.push(ad);
    byNiche.set(ad.niche_id, list);
  }

  const ranks = new Map<string, number>();
  for (const records of byNiche.values()) {
    const ordered = [...records].sort((a, b) => (a.days_active ?? 0) - (b.days_active ?? 0));
    const n = ordered.length;
    ordered.forEach((r, i) => {
      ranks.set(r.library_id, Math.round(((i + 1) / n) * 1000) / 10);
    });
  }
  return ranks;
}
