"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { generateBrief } from "@/lib/api";

export function CreateBriefButton({ rowId }: { rowId: string }) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsGenerating(true);
    setError(null);
    try {
      await generateBrief(rowId);
      router.push(`/briefs/brief-${rowId}`);
      router.refresh();
    } catch (genError) {
      setError(genError instanceof Error ? genError.message : "Brief generation failed");
      setIsGenerating(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isGenerating}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-coral px-4 text-sm font-bold text-white shadow-soft disabled:cursor-not-allowed disabled:bg-ink/25"
      >
        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        {isGenerating ? "Generating..." : "Create Video Brief"}
      </button>
      {error ? <p className="mt-2 text-xs font-semibold text-coral">{error}</p> : null}
    </div>
  );
}
