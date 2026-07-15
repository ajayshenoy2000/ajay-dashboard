import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { BriefCard } from "@/components/BriefCard";
import { getBriefs } from "@/lib/trend-engine/server/service";
import { getServerUserId } from "@/lib/supabase-server";
import { FilePlus2 } from "lucide-react";

export default async function BriefsPage() {
  const userId = await getServerUserId();
  if (!userId) redirect("/");

  const briefs = await getBriefs(userId);

  return (
    <div>
      <Header title="Briefs" subtitle="Saved, ready-to-shoot outlines created from your strongest trend signals." />
      <div className="stagger-list space-y-3">
        {briefs.length ? (
          briefs.map((brief) => <BriefCard key={brief.id} brief={brief} />)
        ) : (
          <div className="rounded-3xl border border-dashed border-ink/15 bg-white px-6 py-10 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/12 text-gold"><FilePlus2 className="h-5 w-5" /></span><p className="mt-3 text-sm font-bold text-ink/55">No briefs yet</p><p className="mt-1 text-xs leading-5 text-ink/35">Open any result in Discover or Trends and choose Create Brief.</p></div>
        )}
      </div>
    </div>
  );
}
