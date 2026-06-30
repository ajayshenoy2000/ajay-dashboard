import { BriefPanel } from "@/components/BriefPanel";
import { Header } from "@/components/Header";
import { getBrief } from "@/lib/trend-engine/server/service";

export default async function BriefPage({ params }: { params: { id: string } }) {
  const brief = await getBrief(params.id);
  if (!brief) {
    return (
      <div>
        <Header title="Video Brief" subtitle="" />
        <p className="text-sm text-ink/50">Brief not found.</p>
      </div>
    );
  }
  return (
    <div>
      <Header title="Video Brief" subtitle="Hook → Conclusion → Reason → Common misunderstanding → Doctor advice → Reassurance → Soft CTA" />
      <BriefPanel brief={brief} />
    </div>
  );
}
