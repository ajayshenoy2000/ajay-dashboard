import { Header } from "@/components/Header";
import { TrendFilter } from "@/components/TrendFilter";
import { getTrendHistory } from "@/lib/api";

export default async function HistoryPage() {
  const trends = await getTrendHistory();

  return (
    <div>
      <Header
        title="Trend History"
        subtitle="Archive of trends from previous searches."
      />
      {trends.length ? (
        <TrendFilter trends={trends} />
      ) : (
        <p className="text-sm text-ink/60">No history yet. Run a search from Discover — results will appear here after the next search.</p>
      )}
    </div>
  );
}
