import { Activity, CalendarCheck, Film, TrendingUp } from "lucide-react";
import { Header } from "@/components/Header";
import { SearchControls } from "@/components/SearchControls";
import { TrendCard } from "@/components/TrendCard";
import { TrendFilter } from "@/components/TrendFilter";
import { getRecordThisWeek, getSettings, getTopTrends } from "@/lib/api";

export default async function HomePage() {
  const [trends, recordTopics, settings] = await Promise.all([getTopTrends(), getRecordThisWeek(), getSettings()]);
  const top = trends[0];

  return (
    <div>
      <Header title="Trend Intelligence" subtitle="" />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={TrendingUp} label="Top Trends" value={trends.length.toString()} />
        <Stat icon={CalendarCheck} label="Record This Week" value={recordTopics.length.toString()} />
        <Stat icon={Film} label="Best Score" value={top ? Math.round(top.score.total).toString() : "--"} />
        <Stat icon={Activity} label="Sources" value="4" />
      </section>

      <section className="mb-6 rounded-md bg-ink p-5 text-white shadow-soft">
        <p className="mb-2 text-sm font-bold text-gold">Top recommendation</p>
        <h2 className="text-2xl font-bold leading-tight">{top?.title}</h2>
        <p className="mt-3 text-sm leading-6 text-white/75">{top?.whyItMatters}</p>
      </section>

      <div className="mb-6">
        <SearchControls settings={settings} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section>
          <h2 className="mb-3 text-xl font-bold">Today&apos;s Top Trends</h2>
          <TrendFilter trends={trends} />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold">Record This Week</h2>
            <span className="text-sm font-semibold text-ink/50">Top 5</span>
          </div>
          <div className="stagger-list space-y-3">
            {recordTopics.map((trend, index) => (
              <TrendCard key={trend.id} trend={trend} rank={index + 1} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof TrendingUp; label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-white p-4 shadow-soft">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-sage/15 text-sage">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-semibold text-ink/55">{label}</div>
    </div>
  );
}
