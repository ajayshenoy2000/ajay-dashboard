"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, FileText, Loader2, ShieldAlert, Trash2, Clock } from "lucide-react";
import { Tooltip } from "./Tooltip";
import { deleteTrend, generateBrief } from "@/lib/api";
import type { Trend } from "@/lib/types";

function getAgeLabel(createdAt: string | null | undefined): string {
  if (!createdAt) return "";
  try {
    const date = new Date(createdAt);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
  } catch {
    return "";
  }
}

export function TrendCard({ trend, rank }: { trend: Trend; rank?: number }) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rowId = trend.rowId ?? trend.id;
  const briefId = `brief-${rowId}`;

  async function handleCreateBrief(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setIsGenerating(true);
    setError(null);
    try {
      const brief = await generateBrief(rowId);
      if (!brief || !brief.id) {
        throw new Error("Brief was not created properly");
      }
      // Wait a moment for database to be consistent
      await new Promise(resolve => setTimeout(resolve, 500));
      router.push(`/briefs/${briefId}`);
      router.refresh();
    } catch (genError) {
      const errorMessage = genError instanceof Error ? genError.message : "Failed to create brief";
      setError(errorMessage);
      console.error("Brief generation error:", genError);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDelete(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!confirm("Delete this trend? This cannot be undone.")) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteTrend(rowId);
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed");
      setIsDeleting(false);
    }
  }

  if (isDeleting) return null;

  return (
    <Link
      href={`/trends/${rowId}`}
      className="block rounded-md border border-ink/10 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-sage/50"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {rank ? <span className="rounded-md bg-gold/15 px-2 py-1 text-xs font-bold text-ink">#{rank}</span> : null}
            <span className="rounded-md bg-mist px-2 py-1 text-xs font-semibold text-ink/70">{trend.keyword}</span>
          </div>
          <h2 className="text-lg font-bold leading-snug text-ink">{trend.title}</h2>
        </div>
        <div className="shrink-0 rounded-md bg-ink px-3 py-2 text-center text-white">
          <div className="text-lg font-bold leading-none">{Math.round(trend.score.total)}</div>
          <div className="text-[10px] uppercase">score</div>
        </div>
      </div>
      <p className="mb-3 text-sm leading-6 text-ink/68">{trend.summary}</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {trend.clusterTerms.slice(0, 5).map((term) => (
          <span key={term} className="rounded-md border border-ink/10 px-2 py-1 text-xs text-ink/60">
            {term}
          </span>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {trend.hasBrief ? (
          <Link
            href={`/briefs/${briefId}`}
            onClick={(event) => event.stopPropagation()}
            className="flex min-h-9 items-center gap-2 rounded-md bg-ink px-3 text-xs font-bold text-white"
          >
            <FileText className="h-3.5 w-3.5" />
            View Brief
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleCreateBrief}
            disabled={isGenerating}
            className="flex min-h-9 items-center gap-2 rounded-md bg-coral px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-ink/25"
          >
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            {isGenerating ? "Generating..." : "Create Brief"}
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          className="flex min-h-9 items-center gap-2 rounded-md border border-coral/30 px-3 text-xs font-bold text-coral hover:bg-coral/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
      {error ? <p className="mb-2 text-xs font-semibold text-coral">{error}</p> : null}

      <div className="flex items-center justify-between text-sm font-semibold text-sage">
        <Tooltip
          content={
            trend.safetyNotes.length
              ? "This trend has safety considerations — review before publishing"
              : "This trend is ready to pursue with no major safety flags"
          }
        >
          <span className="flex cursor-help items-center gap-2">
            {trend.safetyNotes.length ? <ShieldAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {trend.safetyNotes.length ? "Risk-aware angle" : "Ready angle"}
          </span>
        </Tooltip>
        <div className="flex items-center gap-2">
          {trend.createdAt ? (
            <span className="flex items-center gap-1 text-xs text-ink/50">
              <Clock className="h-3 w-3" />
              {getAgeLabel(trend.createdAt)}
            </span>
          ) : null}
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
