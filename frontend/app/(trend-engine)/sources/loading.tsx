export default function SourcesLoading() {
  return (
    <div className="space-y-4 pb-24">
      <div className="h-10 w-48 animate-pulse rounded-lg bg-ink/8" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-ink/8" />
        ))}
      </div>
    </div>
  );
}
