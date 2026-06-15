import { Header } from "@/components/Header";
import { SourceFeed } from "@/components/SourceFeed";
import { getSources } from "@/lib/api";

export default async function SourcesPage() {
  const sources = await getSources();
  return (
    <div>
      <Header title="Source Feed" subtitle="X, Google News, Google Trends, and YouTube signals prepared for review and filtering." />
      <SourceFeed sources={sources} />
    </div>
  );
}
