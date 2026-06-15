"use client";

import { useState } from "react";
import { Activity, CalendarCheck, Film, TrendingUp } from "lucide-react";
import { SearchControls } from "@/components/SearchControls";
import { TrendCard } from "@/components/TrendCard";
import { TrendFilter } from "@/components/TrendFilter";
import { SourceFeed } from "@/components/SourceFeed";
import type { Trend, SourceItem, AppSettings } from "@/lib/types";

type Tab = "discover" | "history" | "sources";

interface Props {
  trends: Trend[];
  recordTopics: Trend[];
  settings: AppSettings;
  historyTrends: Trend[];
  sources: SourceItem[];
}

const TABS: { id: Tab; label: string }[] = [
  { id: "discover", label: "Discover" },
  { id: "history", label: "History" },
  { id: "sources", label: "Sources" },
];

export function TrendsTabs({ trends, recordTopics, settings, historyTrends, sources }: Props) {
  const [active, setActive] = useState<Tab>("discover");
  const top = trends[0];

  return (
    <div>
      {/* Page header */}
      <div className="mb-5 flex items-end justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Trends</h1>
        {/* Sub-tab pill bar */}
        <div className="flex items-center gap-0.5 rounded-xl border border-ink/10 bg-mist p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all duration-200 ${
                active === tab.id
                  ? "bg-white text-ink shadow-soft"
                  : "text-ink/45 hover:text-ink/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content — key forces re-mount for enter animation */}
      <div key={active} className="page-enter">
        {active === "discover" && (
          <DiscoverTab trends={trends} recordTopics={recordTopics} settings={settings} top={top} />
        )}
        {active === "history" && (
          <HistoryTab trends={historyTrends} />
        )}
        {active === "sources" && (
          <SourcesTab sources={sources} />
        )}
      </div>
    </div>
  );
}

function DiscoverTab({
  trends,
  recordTopics,
  settings,
  top,
}: {
  trends: Trend[];
  recordTopics: Trend[];
  settings: AppSettings;
  top: Trend | undefined;
}) {
  return (
    <div>
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={TrendingUp} label="Top Trends" value={trends.length.toString()} />
        <Stat icon={CalendarCheck} label="This Week" value={recordTopics.length.toString()} />
        <Stat icon={Film} label="Best Score" value={top ? Math.round(top.score.total).toString() : "--"} />
        <Stat icon={Activity} label="Sources" value="4" />
      </section>

      {top && (
        <section className="mb-6 rounded-xl bg-ink p-5 text-white shadow-soft">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gold">Top recommendation</p>
          <h2 className="text-2xl font-bold leading-tight">{top.title}</h2>
          <p className="mt-3 text-sm leading-6 text-white/75">{top.whyItMatters}</p>
        </section>
      )}

      <div className="mb-6">
        <SearchControls settings={settings} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section>
          <h2 className="mb-3 text-lg font-bold">Today&apos;s Top Trends</h2>
          <TrendFilter trends={trends} />
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Record This Week</h2>
            <span className="text-xs font-semibold text-ink/50">Top 5</span>
          </div>
          <div className="stagger-list space-y-3">
            {recordTopics.map((trend, index) => (
              <TrendCard key={trend.id} trend={trend} rank={index + 1} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function HistoryTab({ trends }: { trends: Trend[] }) {
  return (
    <div>
      <p className="mb-4 text-sm text-ink/55">Archive of trends from previous searches.</p>
      {trends.length ? (
        <TrendFilter trends={trends} />
      ) : (
        <div className="rounded-xl border border-ink/10 bg-white px-6 py-10 text-center shadow-soft">
          <p className="text-sm font-semibold text-ink/40">No history yet.</p>
          <p className="mt-1 text-xs text-ink/30">Run a search from Discover — results will appear here.</p>
        </div>
      )}
    </div>
  );
}

function SourcesTab({ sources }: { sources: SourceItem[] }) {
  return (
    <div>
      <p className="mb-4 text-sm text-ink/55">X, Google News, Google Trends, and YouTube signals prepared for review.</p>
      <SourceFeed sources={sources} />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof TrendingUp; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-soft">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-sage/12 text-sage">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-semibold text-ink/50">{label}</div>
    </div>
  );
}
