import { Header } from "@/components/Header";
import { BriefCard } from "@/components/BriefCard";
import { getBriefs } from "@/lib/api";

export default async function BriefsPage() {
  const briefs = await getBriefs();

  return (
    <div>
      <Header title="Briefs" subtitle="Ready-to-shoot 3-5 minute talking briefs for this week's record-worthy topics." />
      <div className="stagger-list space-y-3">
        {briefs.length ? (
          briefs.map((brief) => <BriefCard key={brief.id} brief={brief} />)
        ) : (
          <p className="text-sm text-ink/60">No briefs yet. Open a trend on Home or Trend History and tap "Create Brief".</p>
        )}
      </div>
    </div>
  );
}
