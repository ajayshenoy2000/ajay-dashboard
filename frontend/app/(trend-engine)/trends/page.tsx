import { TrendsTabs } from "@/components/TrendsTabs";
import { getTopTrends, getRecordThisWeek, getSettings, getTrendHistory, getSources } from "@/lib/api";

export const revalidate = 60;

export default async function TrendsPage() {
  const [trends, recordTopics, settings, historyTrends, sources] = await Promise.all([
    getTopTrends(),
    getRecordThisWeek(),
    getSettings(),
    getTrendHistory(),
    getSources(),
  ]);

  return (
    <TrendsTabs
      trends={trends}
      recordTopics={recordTopics}
      settings={settings}
      historyTrends={historyTrends}
      sources={sources}
    />
  );
}
