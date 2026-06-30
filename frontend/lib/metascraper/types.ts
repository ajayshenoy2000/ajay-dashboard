// MetaScraper types — snake_case throughout to mirror the backend contract and
// the extraction schema Claude-in-Chrome emits (§3/§7 of the build plan).

export type AdStatus = "new" | "running" | "killed";
export type MediaType = "image" | "video" | "carousel" | "unknown";
export type NicheMode = "keyword" | "competitors" | "both";

export interface Competitor {
  name: string;
  url: string;
  page_id?: string | null;
}

export interface GlobalConfig {
  country: string;
  platforms: string[];
  media_type: "all" | MediaType;
  capture_depth: number;
}

export interface Niche {
  id: string;
  group: string;
  label_jp: string;
  enabled: boolean;
  mode: NicheMode;
  keywords: string[];
  competitors: Competitor[];
}

export interface AppConfig {
  global: GlobalConfig;
  niches: Niche[];
}

export interface ConfigResponse {
  config: AppConfig;
  groupLabels: Record<string, string>;
  hookCategories: string[];
}

export interface AdRecord {
  library_id: string;
  niche_id: string;
  page_name: string;
  page_id: string | null;
  primary_text: string;
  headline: string | null;
  description: string | null;
  cta_label: string | null;
  media_type: MediaType;
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
  // computed read-model extras
  proven: boolean;
  longevity_rank: number | null;
}

export interface NicheSummary {
  niche_id: string;
  label_jp: string;
  group: string;
  group_label: string;
  active: number;
  killed: number;
  new: number;
  longest_days: number | null;
  longest_ad: { library_id: string; page_name: string; ad_library_url: string } | null;
}

export interface Summary {
  totals: { tracked: number; active: number; killed: number; proven: number };
  niches: NicheSummary[];
  last_capture: string | null;
}

export interface DiffSinceLast {
  since: string | null;
  current: string | null;
  new: AdRecord[];
  killed: AdRecord[];
}

export interface IngestSummary {
  ingested: number;
  store_size: number;
  new: number;
  killed_this_run: number;
  running: number;
  sheet: { synced: boolean; rows?: number; reason?: string };
}

export interface Capture {
  captured_date: string;
  country: string;
  hunted_scope: string[];
  ad_count: number;
  ingested?: number;
  store_size?: number;
  new?: number;
  killed_this_run?: number;
  running?: number;
}

export interface Health {
  ingest_token_set: boolean;
  sheet_configured: boolean;
  store_size: number;
  last_capture: string | null;
}
