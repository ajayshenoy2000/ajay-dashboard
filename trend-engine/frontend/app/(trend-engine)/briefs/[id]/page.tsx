import { BriefPanel } from "@/components/BriefPanel";
import { Header } from "@/components/Header";
import { getBrief } from "@/lib/api";

export default async function BriefPage({ params }: { params: { id: string } }) {
  const brief = await getBrief(params.id);
  return (
    <div>
      <Header title="Video Brief" subtitle="Hook → Conclusion → Reason → Common misunderstanding → Doctor advice → Reassurance → Soft CTA" />
      <BriefPanel brief={brief} />
    </div>
  );
}
