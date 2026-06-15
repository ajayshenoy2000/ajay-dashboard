import { Tooltip } from "./Tooltip";
import type { Score } from "@/lib/types";

const rows: Array<[keyof Score, string, number, string]> = [
  ["trendMomentum", "Trend Momentum", 25, "How quickly views and engagement are growing"],
  ["googleSearchDemand", "Search Demand", 20, "Search volume and interest in Google Trends"],
  ["medicalRelevance", "Medical Relevance", 20, "Relevance to beauty medical industry"],
  ["youtubeHistoricalFit", "YouTube Fit", 20, "How similar videos performed on your channel"],
  ["conversionPotential", "Conversion", 10, "Potential viewer interest and engagement"],
  ["safetyBrandFit", "Brand Safety", 5, "Alignment with brand values and safety guidelines"]
];

export function ScoreBreakdown({ score }: { score: Score }) {
  return (
    <section className="rounded-md border border-ink/10 bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold">Score Breakdown</h2>
        <span className="rounded-md bg-ink px-3 py-1 text-sm font-bold text-white">{Math.round(score.total)}</span>
      </div>
      <div className="space-y-3">
        {rows.map(([key, label, max, description]) => {
          const value = Number(score[key] ?? 0);
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-ink/70">
                <Tooltip content={description}>
                  <span className="cursor-help border-b border-dotted border-ink/30 hover:border-ink/60">{label}</span>
                </Tooltip>
                <span>
                  {Math.round(value)}/{max}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-mist">
                <div
                  className="h-full rounded-full bg-coral"
                  style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
