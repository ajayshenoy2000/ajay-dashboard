"use client";

import { useEffect, useState } from "react";
import { CalendarDays, History, Layers, Sparkles, XCircle } from "lucide-react";
import { MetaHeader, MetaSubNav } from "@/components/metascraper/MetaSubNav";
import { getCaptures, getConfig } from "@/lib/metascraper/api";
import type { Capture, Niche } from "@/lib/metascraper/types";

export default function CapturesHistory() {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([getCaptures(), getConfig()]).then(([c, cfg]) => {
      setCaptures(c);
      setNiches(cfg?.config.niches ?? []);
      setLoaded(true);
    });
  }, []);

  const nicheLabel = Object.fromEntries(niches.map((n) => [n.id, n.label_jp]));

  function scopeLabel(id: string): string {
    return nicheLabel[id] ?? id; // page_ids fall through as-is
  }

  return (
    <>
      <MetaHeader subtitle="Every weekly hunt the app has recorded — the time-series Meta refuses to keep." />
      <MetaSubNav />

      {loaded && captures.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white p-10 text-center">
          <History className="mx-auto mb-3 h-8 w-8 text-ink/25" />
          <p className="font-semibold text-ink/60">No captures yet</p>
          <p className="mt-1 text-sm text-ink/40">Run a hunt from the Console — each weekly import shows up here.</p>
        </div>
      )}

      <div className="space-y-3">
        {captures.map((cap) => (
          <div key={cap.captured_date} className="rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-bold">
                <CalendarDays className="h-4 w-4 text-coral" /> {cap.captured_date}
                <span className="rounded-full bg-ink/6 px-2 py-0.5 text-[11px] font-semibold text-ink/45">{cap.country}</span>
              </span>
              <div className="flex flex-wrap gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1 text-ink/55"><Layers className="h-3.5 w-3.5" /> {cap.ad_count} captured</span>
                {(cap.new ?? 0) > 0 && <span className="flex items-center gap-1 text-coral"><Sparkles className="h-3.5 w-3.5" /> {cap.new} new</span>}
                {(cap.killed_this_run ?? 0) > 0 && <span className="flex items-center gap-1 text-ink/40"><XCircle className="h-3.5 w-3.5" /> {cap.killed_this_run} killed</span>}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink/30">Hunted:</span>
              {cap.hunted_scope.length === 0 ? (
                <span className="text-xs text-ink/35">— scope not recorded —</span>
              ) : (
                cap.hunted_scope.map((id) => (
                  <span key={id} className="rounded-lg bg-sage/12 px-2 py-0.5 text-[11px] font-medium text-sage">{scopeLabel(id)}</span>
                ))
              )}
            </div>

            {cap.store_size != null && (
              <p className="mt-2 text-[11px] text-ink/35">Store after this hunt: {cap.store_size} tracked · {cap.running ?? 0} still running</p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
