import { redirect } from "next/navigation";
import { Clock3, Radar, Search, Sparkles } from "lucide-react";
import { SearchControls } from "@/components/SearchControls";
import { TrendFilter } from "@/components/TrendFilter";
import { PullToRefresh } from "@/components/PullToRefresh";
import { getAppSettings, getTopTrends } from "@/lib/trend-engine/server/service";
import { getServerUserId } from "@/lib/supabase-server";
import type { AppSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const userId = await getServerUserId();
  if (!userId) redirect("/");
  const [trends, rawSettings] = await Promise.all([getTopTrends(userId), getAppSettings(userId)]);
  const settings = rawSettings as unknown as AppSettings;
  const lastSearch = settings.lastSearch;
  const activeBank = settings.keywordBanks.find((bank) => bank.id === settings.activeKeywordBankId);

  return (
    <PullToRefresh>
      <div className="page-enter">
        <header className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Trend Engine</p>
          <h1 className="text-3xl font-bold tracking-tight">Discover</h1>
          <p className="mt-1 text-sm text-ink/45">Search current signals, then turn the strongest ideas into briefs.</p>
        </header>

        <div className="mb-5">
          <SearchControls settings={settings} />
        </div>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink/35">Latest search</p>
              <h2 className="text-lg font-bold">Search results</h2>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-ink/40">
              <Clock3 className="h-3.5 w-3.5" /> {lastSearch.timeWindow || "—"} · {trends.length} found
            </div>
          </div>

          {trends.length ? (
            <>
              <div className="mb-3 grid grid-cols-3 gap-2">
                <MiniStat icon={Sparkles} label="Best score" value={Math.round(trends[0].score.total).toString()} />
                <MiniStat icon={Radar} label="Sources" value={String(lastSearch.sources?.length ?? 0)} />
                <MiniStat icon={Search} label="Bank" value={activeBank?.name.split(" ")[0] ?? "Core"} />
              </div>
              <TrendFilter trends={trends} />
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-ink/15 bg-white px-6 py-10 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/12 text-gold"><Search className="h-5 w-5" /></span>
              <p className="mt-3 text-sm font-bold text-ink/65">No search results yet</p>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-ink/40">Choose a keyword bank and run a search. The latest result set will always live here.</p>
            </div>
          )}
        </section>
      </div>
    </PullToRefresh>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Sparkles; label: string; value: string }) {
  return <div className="min-w-0 rounded-2xl border border-ink/8 bg-white p-3 shadow-soft"><Icon className="mb-2 h-4 w-4 text-gold" /><p className="truncate text-sm font-bold">{value}</p><p className="truncate text-[9px] font-semibold text-ink/35">{label}</p></div>;
}
