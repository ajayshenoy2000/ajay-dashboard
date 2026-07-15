import { redirect } from "next/navigation";
import { Award, CalendarCheck, Radio, TrendingUp } from "lucide-react";
import { SearchControls } from "@/components/SearchControls";
import { TrendCard } from "@/components/TrendCard";
import { TrendFilter } from "@/components/TrendFilter";
import { PullToRefresh } from "@/components/PullToRefresh";
import { getTopTrends, getRecordThisWeek, getAppSettings } from "@/lib/trend-engine/server/service";
import { getServerUserId } from "@/lib/supabase-server";
import type { AppSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const userId = await getServerUserId();
  if (!userId) redirect("/");

  const [trends, recordTopics, rawSettings] = await Promise.all([
    getTopTrends(userId),
    getRecordThisWeek(userId),
    getAppSettings(userId),
  ]);
  const settings = rawSettings as unknown as AppSettings;

  const top = trends[0];

  return (
    <PullToRefresh>
      <div className="page-enter">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Discover</h1>
          <p className="mt-1 text-sm text-ink/50">Today&apos;s top trends, ready to brief.</p>
        </div>

        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={TrendingUp} label="Top Trends" value={trends.length.toString()} />
          <Stat icon={CalendarCheck} label="This Week" value={recordTopics.length.toString()} />
          <Stat icon={Award} label="Best Score" value={top ? Math.round(top.score.total).toString() : "--"} />
          <Stat icon={Radio} label="Sources" value="4" />
        </section>

        {top && (
          <section className="mb-6 rounded-xl bg-ink p-5 text-white shadow-soft">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gold">Top recommendation</p>
            <h2 className="text-2xl font-bold leading-tight">{top.title}</h2>
            <p className="mt-3 text-sm leading-6 text-white/75">{top.whyItMatters}</p>
          </section>
        )}

        <div className="mb-6">
          <SearchControls settings={settings} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section>
            <h2 className="mb-3 text-lg font-bold">Today&apos;s Top Trends</h2>
            <TrendFilter trends={trends} />
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Record This Week</h2>
              <span className="text-xs font-semibold text-ink/50">Top 5</span>
            </div>
            <div className="stagger-list space-y-3">
              {recordTopics.map((trend, index) => (
                <TrendCard key={trend.id} trend={trend} rank={index + 1} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </PullToRefresh>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof TrendingUp; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-soft">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-sage/12 text-sage">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-semibold text-ink/50">{label}</div>
    </div>
  );
}
