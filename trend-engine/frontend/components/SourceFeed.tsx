"use client";

import { useMemo, useState } from "react";
import { SourceList } from "@/components/SourceList";
import type { SourceItem } from "@/lib/types";

const filters: Array<{ id: SourceItem["source"] | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "x", label: "X" },
  { id: "google_news", label: "Google News" },
  { id: "google_trends", label: "Google Trends" },
  { id: "youtube", label: "YouTube" }
];

export function SourceFeed({ sources }: { sources: SourceItem[] }) {
  const [active, setActive] = useState<SourceItem["source"] | "all">("all");

  const filtered = useMemo(
    () => (active === "all" ? sources : sources.filter((source) => source.source === active)),
    [sources, active]
  );

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActive(filter.id)}
            className={`min-h-11 rounded-md border px-3 text-sm font-bold shadow-soft transition ${
              active === filter.id ? "border-sage bg-sage text-white" : "border-ink/10 bg-white text-ink"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      {filtered.length ? (
        <SourceList sources={filtered} />
      ) : (
        <p className="text-sm text-ink/60">No sources for this filter yet.</p>
      )}
    </div>
  );
}
