"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText, Trash2 } from "lucide-react";
import { deleteBrief } from "@/lib/api";
import type { Brief } from "@/lib/types";

export function BriefCard({ brief }: { brief: Brief }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!confirm("Delete this brief? This cannot be undone.")) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteBrief(brief.id);
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed");
      setIsDeleting(false);
    }
  }

  if (isDeleting) return null;

  return (
    <div className="rounded-md border border-ink/10 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-sage/50">
      <Link href={`/briefs/${brief.id}`} className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-coral">
            <FileText className="h-4 w-4" />
            {brief.durationMinutes} min
          </div>
          <h2 className="truncate text-lg font-bold leading-snug text-ink">{brief.titleOptions[0]}</h2>
          <p className="mt-1 truncate text-sm leading-6 text-ink/65">{brief.hook}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-sage" />
      </Link>
      <div className="mt-3 flex items-center justify-between">
        {error ? <p className="text-xs font-semibold text-coral">{error}</p> : <span />}
        <button
          type="button"
          onClick={handleDelete}
          className="flex min-h-9 items-center gap-2 rounded-md border border-coral/30 px-3 text-xs font-bold text-coral hover:bg-coral/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
