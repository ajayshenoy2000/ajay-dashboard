"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Film, Save, Trophy, X } from "lucide-react";
import { patchAd } from "@/lib/metascraper/api";
import type { AdRecord } from "@/lib/metascraper/types";

const HOOKS = ["before_after", "price", "testimonial", "doctor_trust", "campaign", "other"];

const STATUS_CLS: Record<string, string> = {
  new: "bg-coral/12 text-coral",
  running: "bg-[rgba(58,158,110,0.14)] text-[#3a9e6e]",
  killed: "bg-ink/8 text-ink/40",
};

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink/35">{label}</p>
      <p className={`mt-0.5 text-sm ${mono ? "font-mono text-xs" : ""} ${value ? "text-ink/80" : "text-ink/30"}`}>
        {value || "—"}
      </p>
    </div>
  );
}

export function AdDetail({
  ad,
  nicheLabel,
  onClose,
  onSaved,
}: {
  ad: AdRecord;
  nicheLabel: Record<string, string>;
  onClose: () => void;
  onSaved: (updated: AdRecord) => void;
}) {
  const [hook, setHook] = useState(ad.hook_category ?? "");
  const [notes, setNotes] = useState(ad.notes ?? "");
  const [saving, setSaving] = useState(false);

  // Keep local edit state in sync if a different ad is opened.
  useEffect(() => {
    setHook(ad.hook_category ?? "");
    setNotes(ad.notes ?? "");
  }, [ad]);

  async function save() {
    setSaving(true);
    try {
      const updated = await patchAd(ad.library_id, { hook_category: hook || null, notes: notes || null });
      onSaved({ ...ad, ...updated });
      onClose();
    } catch {
      /* keep open on failure */
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 pb-10 shadow-[0_-8px_40px_rgba(24,33,31,0.18)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink/15 sm:hidden" />

        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${STATUS_CLS[ad.status]}`}>{ad.status}</span>
              {ad.proven && <span className="flex items-center gap-1 text-[11px] font-bold text-coral"><Trophy className="h-3 w-3" /> proven</span>}
            </div>
            <h2 className="mt-1.5 text-xl font-bold">{ad.page_name || "—"}</h2>
            <p className="text-sm text-ink/45">{nicheLabel[ad.niche_id] ?? ad.niche_id}</p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-full p-1.5 text-ink/30 transition hover:bg-mist hover:text-ink/60">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Longevity strip */}
        <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl bg-mist p-3 text-center">
          <div>
            <p className="text-xl font-bold tabular-nums">{ad.days_active ?? "—"}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">Days active</p>
          </div>
          <div>
            <p className="text-xl font-bold tabular-nums">{ad.weeks_observed}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">Weeks seen</p>
          </div>
          <div>
            <p className="text-xl font-bold tabular-nums">{ad.longevity_rank != null ? `${ad.longevity_rank}` : "—"}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">Niche rank %</p>
          </div>
        </div>

        {/* All captured fields */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Started running" value={ad.started_running_date} />
          <Field label="Media type" value={ad.media_type} />
          <Field label="First seen" value={ad.first_seen} />
          <Field label="Last seen" value={ad.last_seen} />
          <Field label="CTA label" value={ad.cta_label} />
          <Field label="Platforms" value={ad.platforms.join(", ")} />
          <Field label="Library ID" value={ad.library_id} mono />
          <Field label="Page ID" value={ad.page_id} mono />
        </div>

        <div className="mt-3 space-y-3">
          <Field label="Headline" value={ad.headline} />
          <Field label="Primary text" value={ad.primary_text} />
          <Field label="Description" value={ad.description} />
        </div>

        {/* Links */}
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={ad.ad_library_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white transition hover:bg-ink/85">
            <ExternalLink className="h-3.5 w-3.5" /> View ad on Meta
          </a>
          {ad.landing_url && (
            <a href={ad.landing_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-ink/12 px-3 py-2 text-xs font-bold text-ink/65 transition hover:bg-mist">
              <ExternalLink className="h-3.5 w-3.5" /> Landing page
            </a>
          )}
          {ad.media_url && (
            <a href={ad.media_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-ink/12 px-3 py-2 text-xs font-bold text-ink/65 transition hover:bg-mist">
              <Film className="h-3.5 w-3.5" /> Media
            </a>
          )}
        </div>

        {/* Manual tags */}
        <div className="mt-5 space-y-3 border-t border-ink/8 pt-4">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink/35">Hook category</span>
            <select
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              className="w-full rounded-xl border border-ink/12 bg-mist px-3 py-2 text-sm outline-none focus:border-coral"
            >
              <option value="">— untagged —</option>
              {HOOKS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink/35">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why this creative matters, what to study…"
              className="h-20 w-full rounded-xl border border-ink/12 bg-mist px-3 py-2 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
            />
          </label>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-coral px-4 py-2 text-sm font-bold text-white transition hover:bg-coral/85 active:scale-95 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save tags"}
          </button>
        </div>
      </div>
    </div>
  );
}
