import { redirect } from "next/navigation";
import { TrendsSubNav } from "@/components/TrendsSubNav";
import { SourceFeed } from "@/components/SourceFeed";
import { getSources } from "@/lib/trend-engine/server/service";
import { getServerUserId } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const userId = await getServerUserId();
  if (!userId) redirect("/");

  const sources = await getSources(userId);

  return (
    <div className="page-enter">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Trends</h1>
        <p className="mt-1 text-sm text-ink/50">Raw signals collected by your latest search.</p>
      </div>

      <TrendsSubNav />

      <div>
        <p className="mb-4 text-sm text-ink/55">News, search demand, social, and video signals behind your ranking.</p>
        <SourceFeed sources={sources} />
      </div>
    </div>
  );
}
