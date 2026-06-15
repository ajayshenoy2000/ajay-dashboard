export default function TrendEngineLoading() {
  return (
    <div className="space-y-4 pb-24">
      <div className="h-10 w-56 animate-pulse rounded-lg bg-ink/8" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-md bg-ink/8" />
        ))}
      </div>
      <div className="h-36 animate-pulse rounded-md bg-ink/8" />
      <div className="h-64 animate-pulse rounded-md bg-ink/8" />
    </div>
  );
}
