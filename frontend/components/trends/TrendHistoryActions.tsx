"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Trash2 } from "lucide-react";
import { clearTrendHistory } from "@/lib/api";

export function TrendHistoryActions() {
  const router = useRouter();
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function clear() {
    if (!confirm("Clear results from all previous searches? The latest search will stay available.")) return;
    setClearing(true);
    try {
      const result = await clearTrendHistory(0.001);
      setMessage(`${result.deletedCount} saved result${result.deletedCount === 1 ? "" : "s"} cleared`);
      router.refresh();
    } catch {
      setMessage("Could not clear history");
    } finally {
      setClearing(false);
    }
  }

  return (
    <details className="group mb-4 rounded-2xl border border-ink/8 bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-bold text-ink/50"><Trash2 className="h-3.5 w-3.5" /> History controls <ChevronDown className="ml-auto h-3.5 w-3.5 transition group-open:rotate-180" /></summary>
      <div className="flex items-center gap-3 border-t border-ink/6 p-3">
        <p className="flex-1 text-[11px] leading-5 text-ink/40">Remove archived searches while keeping your latest results.</p>
        <button onClick={clear} disabled={clearing} className="rounded-xl bg-coral/10 px-3 py-2 text-[11px] font-bold text-coral disabled:opacity-40">{clearing ? "Clearing…" : "Clear archive"}</button>
      </div>
      {message && <p className="px-3 pb-3 text-[11px] font-semibold text-ink/45">{message}</p>}
    </details>
  );
}
