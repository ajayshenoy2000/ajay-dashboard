"use client";

import { Brain, Library, Sparkles } from "lucide-react";
import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";

export function MioHeader() {
  const pathname = usePathname();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-coral/12 text-coral">
        <Sparkles className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Mio</h1>
        <p className="text-xs font-semibold text-ink/35">Your personal assistant</p>
      </div>
      <div className="flex items-center gap-1 rounded-xl bg-mist p-1">
        <Link href="/chat/memory" aria-label="Mio memory" className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold ${pathname === "/chat/memory" ? "bg-white text-coral shadow-soft" : "text-ink/45"}`}>
          <Brain className="h-4 w-4" /><span className="hidden sm:inline">Memory</span>
        </Link>
        <Link href="/chat/libraries" aria-label="Mio libraries" className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold ${pathname.startsWith("/chat/libraries") ? "bg-white text-coral shadow-soft" : "text-ink/45"}`}>
          <Library className="h-4 w-4" /><span className="hidden sm:inline">Libraries</span>
        </Link>
      </div>
    </div>
  );
}
