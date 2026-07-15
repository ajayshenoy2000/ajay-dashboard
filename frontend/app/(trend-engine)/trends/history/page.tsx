import { redirect } from "next/navigation";
import { TrendsSubNav } from "@/components/TrendsSubNav";
import { TrendFilter } from "@/components/TrendFilter";
import { getTrendHistory } from "@/lib/trend-engine/server/service";
import { getServerUserId } from "@/lib/supabase-server";
import { TrendHistoryActions } from "@/components/trends/TrendHistoryActions";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const userId = await getServerUserId();
  if (!userId) redirect("/");

  const trends = await getTrendHistory(userId);

  return (
    <div className="page-enter">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Trends</h1>
        <p className="mt-1 text-sm text-ink/50">Every result from every search, newest first.</p>
      </div>

      <TrendsSubNav />

      <div>
        <TrendHistoryActions />
        {trends.length ? (
          <TrendFilter trends={trends} />
        ) : (
          <div className="rounded-xl border border-ink/10 bg-white px-6 py-10 text-center shadow-soft">
            <p className="text-sm font-semibold text-ink/50">Your trend library is empty</p>
            <p className="mt-1 text-xs text-ink/35">Run a search from Discover and every result will be saved here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
