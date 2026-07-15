"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleDot, ExternalLink, Film, GitCompareArrows, Image as ImageIcon,
  Layers, Sparkles, Trophy, XCircle,
} from "lucide-react";
import { AdDetail } from "@/components/metascraper/AdDetail";
import { MetaHeader, MetaSubNav } from "@/components/metascraper/MetaSubNav";
import { PullToRefresh } from "@/components/PullToRefresh";
import { getAds, getConfig, getDiffSinceLast, getSummary, patchAd } from "@/lib/metascraper/api";
import type { AdRecord, DiffSinceLast, Niche, Summary } from "@/lib/metascraper/types";

const HOOKS = ["before_after", "price", "testimonial", "doctor_trust", "campaign", "other"];
const STATUS_META: Record<string, { label: string; cls: string; icon: typeof CircleDot }> = {
  new: { label: "New", cls: "bg-coral/12 text-coral", icon: Sparkles },
  running: { label: "Running", cls: "bg-[rgba(58,158,110,0.14)] text-[#3a9e6e]", icon: CircleDot },
  killed: { label: "Killed", cls: "bg-ink/8 text-ink/40", icon: XCircle },
};
const MEDIA_ICON: Record<string, typeof Film> = { video: Film, image: ImageIcon, carousel: Layers };

export default function MetaScraperDashboard() {
  const [ads, setAds] = useState<AdRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [diff, setDiff] = useState<DiffSinceLast | null>(null);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [niche, setNiche] = useState("all");
  const [status, setStatus] = useState("all");
  const [media, setMedia] = useState("all");
  const [provenOnly, setProvenOnly] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [selected, setSelected] = useState<AdRecord | null>(null);

  const load = useCallback(async () => {
    const [a, s, d, c] = await Promise.all([getAds(), getSummary(), getDiffSinceLast(), getConfig()]);
    setAds(a);
    setSummary(s);
    setDiff(d);
    setNiches(c?.config.niches ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const nicheLabel = useMemo(() => Object.fromEntries(niches.map((n) => [n.id, n.label_jp])), [niches]);

  const filtered = useMemo(() => {
    return ads.filter((a) => {
      if (niche !== "all" && a.niche_id !== niche) return false;
      if (status !== "all" && a.status !== status) return false;
      if (media !== "all" && a.media_type !== media) return false;
      if (provenOnly && !a.proven) return false;
      return true;
    });
  }, [ads, niche, status, media, provenOnly]);

  const nicheOptions = useMemo(
    () => [...new Set(ads.map((a) => a.niche_id))].sort(),
    [ads],
  );

  function applyAdUpdate(updated: AdRecord) {
    setAds((prev) => prev.map((a) => (a.library_id === updated.library_id ? { ...a, ...updated } : a)));
    setSelected((prev) => (prev && prev.library_id === updated.library_id ? { ...prev, ...updated } : prev));
  }

  async function saveTag(libraryId: string, patch: { hook_category?: string | null; notes?: string | null }) {
    const updated = await patchAd(libraryId, patch);
    applyAdUpdate(updated);
  }

  if (loaded && ads.length === 0) {
    return (
      <PullToRefresh onRefresh={load}>
        <MetaHeader subtitle="Competitive ad intelligence — longevity is the signal." />
        <MetaSubNav />
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white p-10 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-ink/25" />
          <p className="font-semibold text-ink/60">No captures yet</p>
          <p className="mt-1 text-sm text-ink/40">
            Head to the Console, generate a hunt command, and run it in Claude-in-Chrome. Results land here.
          </p>
        </div>
      </PullToRefresh>
    );
  }

  return (
    <PullToRefresh onRefresh={load}>
      <MetaHeader subtitle="Competitive ad intelligence — longevity is the signal." />
      <MetaSubNav />

      {/* Totals */}
      {summary && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Tracked" value={summary.totals.tracked} icon={Layers} tone="ink" />
          <StatCard label="Active" value={summary.totals.active} icon={CircleDot} tone="sage" />
          <StatCard label="Killed" value={summary.totals.killed} icon={XCircle} tone="muted" />
          <StatCard label="Proven (>8wk)" value={summary.totals.proven} icon={Trophy} tone="coral" />
        </div>
      )}

      {/* Per-niche summary cards */}
      {summary && summary.niches.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-ink/40">By niche</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.niches.map((n) => (
              <div key={n.niche_id} className="rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{n.label_jp}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-ink/35">{n.group_label}</span>
                </div>
                <div className="mt-2 flex gap-3 text-sm">
                  <span className="font-semibold text-[#3a9e6e]">{n.active} active</span>
                  {n.new > 0 && <span className="text-coral">{n.new} new</span>}
                  {n.killed > 0 && <span className="text-ink/40">{n.killed} killed</span>}
                </div>
                {n.longest_ad && (
                  <a href={n.longest_ad.ad_library_url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-xs text-ink/45 hover:text-coral">
                    <Trophy className="h-3 w-3" /> Longest: {n.longest_days}d — {n.longest_ad.page_name}
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Diff since last */}
      {diff && diff.since && (
        <section className="mb-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
          <button onClick={() => setShowDiff((v) => !v)} className="flex w-full items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-bold">
              <GitCompareArrows className="h-4 w-4 text-coral" /> Since last capture
              <span className="font-normal text-ink/40">{diff.since} → {diff.current}</span>
            </span>
            <span className="flex gap-2 text-xs font-semibold">
              <span className="text-coral">+{diff.new.length} new</span>
              <span className="text-ink/40">−{diff.killed.length} killed</span>
            </span>
          </button>
          {showDiff && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <DiffColumn title="New this week" tone="coral" ads={diff.new} nicheLabel={nicheLabel} />
              <DiffColumn title="Killed this week" tone="muted" ads={diff.killed} nicheLabel={nicheLabel} />
            </div>
          )}
        </section>
      )}

      {/* Filters */}
      <section className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={niche} onChange={setNiche} options={[["all", "All niches"], ...nicheOptions.map((id) => [id, nicheLabel[id] ?? id] as [string, string])]} />
        <Select value={status} onChange={setStatus} options={[["all", "All status"], ["new", "New"], ["running", "Running"], ["killed", "Killed"]]} />
        <Select value={media} onChange={setMedia} options={[["all", "All media"], ["video", "Video"], ["image", "Image"], ["carousel", "Carousel"], ["unknown", "Unknown"]]} />
        <button
          onClick={() => setProvenOnly((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${provenOnly ? "bg-coral text-white" : "border border-ink/12 text-ink/55 hover:bg-mist"}`}
        >
          <Trophy className="h-3.5 w-3.5" /> Proven only
        </button>
        <span className="ml-auto text-xs font-semibold text-ink/40">{filtered.length} ad{filtered.length !== 1 ? "s" : ""}</span>
      </section>

      {/* Native card grid — no horizontal table on mobile */}
      {filtered.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {filtered.map((ad) => {
            const sm = STATUS_META[ad.status];
            const StatusIcon = sm.icon;
            const MediaTag = MEDIA_ICON[ad.media_type] ?? Layers;
            return (
              <article key={ad.library_id} onClick={() => setSelected(ad)} className="min-w-0 cursor-pointer rounded-2xl border border-ink/10 bg-white p-3 shadow-soft active:scale-[0.99]">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ${sm.cls}`}><StatusIcon className="h-3 w-3" /> {sm.label}</span>
                  {ad.proven && <Trophy className="h-3.5 w-3.5 shrink-0 text-coral" />}
                </div>
                <h3 className="truncate text-xs font-bold">{ad.page_name || "Untitled ad"}</h3>
                <p className="mt-0.5 truncate text-[10px] text-ink/40">{nicheLabel[ad.niche_id] ?? ad.niche_id}</p>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <div className="rounded-xl bg-mist p-2"><p className="text-sm font-bold tabular-nums">{ad.days_active ?? "—"}</p><p className="text-[8px] font-bold uppercase tracking-wide text-ink/35">days live</p></div>
                  <div className="rounded-xl bg-mist p-2"><p className="flex items-center gap-1 text-[10px] font-bold capitalize"><MediaTag className="h-3 w-3" /> {ad.media_type}</p><p className="mt-1 text-[8px] font-bold uppercase tracking-wide text-ink/35">creative</p></div>
                </div>
                <div className="mt-2 flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
                  <select value={ad.hook_category ?? ""} onChange={(event) => saveTag(ad.library_id, { hook_category: event.target.value || null })} className="min-w-0 flex-1 truncate rounded-lg border border-ink/10 bg-mist px-1.5 py-1.5 text-[9px] font-semibold outline-none"><option value="">Tag hook</option>{HOOKS.map((hook) => <option key={hook} value={hook}>{hook.replace("_", " ")}</option>)}</select>
                  <a href={ad.ad_library_url} target="_blank" rel="noreferrer" aria-label="Open ad" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink text-white"><ExternalLink className="h-3 w-3" /></a>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-ink/15 bg-white p-8 text-center"><p className="text-sm font-bold text-ink/55">No ads match these filters</p><p className="mt-1 text-xs text-ink/35">Try a wider niche, status, or media selection.</p></div>
      )}

      {selected && (
        <AdDetail
          ad={selected}
          nicheLabel={nicheLabel}
          onClose={() => setSelected(null)}
          onSaved={applyAdUpdate}
        />
      )}
    </PullToRefresh>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof CircleDot; tone: "ink" | "sage" | "coral" | "muted" }) {
  const tones = {
    ink: "bg-ink/6 text-ink/55",
    sage: "bg-sage/15 text-sage",
    coral: "bg-coral/12 text-coral",
    muted: "bg-ink/5 text-ink/35",
  };
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-4 w-4" /></div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs font-semibold text-ink/45">{label}</div>
    </div>
  );
}

function DiffColumn({ title, tone, ads, nicheLabel }: { title: string; tone: "coral" | "muted"; ads: AdRecord[]; nicheLabel: Record<string, string> }) {
  return (
    <div className="rounded-xl bg-mist p-3">
      <p className={`mb-2 text-[11px] font-bold uppercase tracking-wider ${tone === "coral" ? "text-coral" : "text-ink/40"}`}>{title} ({ads.length})</p>
      {ads.length === 0 ? (
        <p className="text-xs text-ink/35">None</p>
      ) : (
        <ul className="space-y-1.5">
          {ads.map((ad) => (
            <li key={ad.library_id} className="flex items-center gap-2 text-xs">
              <a href={ad.ad_library_url} target="_blank" rel="noreferrer" className="truncate font-semibold hover:text-coral">{ad.page_name || ad.library_id}</a>
              <span className="ml-auto shrink-0 text-ink/35">{nicheLabel[ad.niche_id] ?? ad.niche_id}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-ink/12 bg-white px-3 py-2 text-xs font-semibold text-ink/65 outline-none focus:border-coral"
    >
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
