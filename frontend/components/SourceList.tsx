import { ExternalLink } from "lucide-react";
import type { SourceItem } from "@/lib/types";

const sourceLabels: Record<SourceItem["source"], string> = {
  x: "X",
  google_news: "Google News",
  google_trends: "Google Trends",
  youtube: "YouTube",
  manual: "Manual"
};

export function SourceList({ sources }: { sources: SourceItem[] }) {
  return (
    <div className="space-y-3">
      {sources.map((source) => (
        <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="block rounded-md border border-ink/10 bg-white p-4 shadow-soft">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <span className="rounded-md bg-mist px-2 py-1 text-xs font-bold text-ink/70">{sourceLabels[source.source]}</span>
              <h2 className="mt-2 text-base font-bold leading-snug">{source.title}</h2>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-sage" />
          </div>
          <p className="text-sm leading-6 text-ink/65">{source.text}</p>
          <div className="mt-3 flex items-center justify-between text-xs font-semibold text-ink/50">
            <span>{source.keyword}</span>
            <span>{source.engagement} signal</span>
          </div>
        </a>
      ))}
    </div>
  );
}
