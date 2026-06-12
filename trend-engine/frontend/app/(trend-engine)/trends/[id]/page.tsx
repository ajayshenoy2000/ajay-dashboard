import Link from "next/link";
import { FileText, TrendingUp } from "lucide-react";
import { CreateBriefButton } from "@/components/CreateBriefButton";
import { Header } from "@/components/Header";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { SourceList } from "@/components/SourceList";
import { Tooltip } from "@/components/Tooltip";
import { getTrend } from "@/lib/api";

export default async function TrendDetailPage({ params }: { params: { id: string } }) {
  const trend = await getTrend(params.id);

  return (
    <div>
      <Header title={trend.keyword} subtitle={trend.title} />

      <div className="mb-6 rounded-md border border-ink/10 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="flex-1">
            <Tooltip content="The primary trend topic - what this trend is about">
              <h1 className="cursor-help text-3xl font-bold leading-tight text-ink border-b border-dotted border-ink/20">{trend.title}</h1>
            </Tooltip>
            <Tooltip content="The search keyword associated with this trend">
              <p className="mt-2 text-sm text-ink/60 cursor-help border-b border-dotted border-ink/20 inline-block">{trend.keyword}</p>
            </Tooltip>
          </div>
          <Tooltip content="Overall trend score (0-100) based on all metrics">
            <div className="shrink-0 rounded-md bg-sage/10 px-4 py-3 text-center cursor-help">
              <div className="flex items-center gap-1 text-2xl font-bold text-sage">
                <TrendingUp className="h-6 w-6" />
                {Math.round(trend.score.total)}
              </div>
              <div className="text-xs font-bold uppercase text-sage">Score</div>
            </div>
          </Tooltip>
        </div>
        <Tooltip content="Summary of why this trend is gaining momentum and what makes it relevant">
          <p className="mb-4 text-base leading-6 text-ink/75 cursor-help border-b border-dotted border-ink/20 pb-2">{trend.summary}</p>
        </Tooltip>
        <div className="flex flex-wrap gap-2">
          {trend.clusterTerms.map((term) => (
            <span key={term} className="rounded-md border border-sage/30 bg-sage/5 px-2.5 py-1 text-xs font-semibold text-sage/80">
              {term}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        {trend.hasBrief ? (
          <Link
            href={`/briefs/brief-${trend.rowId ?? trend.id}`}
            className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-coral px-5 text-sm font-bold text-white shadow-soft"
          >
            <FileText className="h-4 w-4" />
            View Video Brief
          </Link>
        ) : (
          <CreateBriefButton rowId={trend.rowId ?? trend.id} />
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-5">
          <div className="rounded-md border border-ink/10 bg-white p-4 shadow-soft">
            <h2 className="mb-3 text-base font-bold">Why This Matters</h2>
            <p className="text-sm leading-6 text-ink/70">{trend.whyItMatters}</p>
          </div>

          {trend.safetyNotes.length > 0 && (
            <div className="rounded-md border border-coral/20 bg-coral/5 p-4">
              <h2 className="mb-2 text-base font-bold text-coral">Safety Considerations</h2>
              <div className="space-y-2">
                {trend.safetyNotes.map((note) => (
                  <p key={note} className="text-sm leading-6 text-coral/85">
                    • {note}
                  </p>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-5">
          <div>
            <h2 className="mb-3 text-base font-bold">Source Links</h2>
            <SourceList sources={trend.sources} />
          </div>

          <div className="rounded-md border border-ink/10 bg-white p-4 shadow-soft">
            <h2 className="mb-3 text-base font-bold">YouTube Context</h2>
            {trend.youtubeHistory.length ? (
              <div className="space-y-2">
                {trend.youtubeHistory.slice(0, 5).map((video) => (
                  <div key={video.id} className="rounded-md bg-mist p-2.5 text-xs">
                    <div className="font-bold text-ink/75">{video.title}</div>
                    <div className="mt-1 text-ink/55">
                      {video.views.toLocaleString()} views {video.ctr ? `· ${Math.round(video.ctr * 1000) / 10}% CTR` : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink/60">No close historical match. This may be a useful new-format test.</p>
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 rounded-md bg-mist p-4">
        <ScoreBreakdown score={trend.score} />
      </div>
    </div>
  );
}
