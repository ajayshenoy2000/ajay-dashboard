export default function DashboardLoading() {
  return (
    <div className="space-y-4 pb-10">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-ink/8" />
      <div className="h-32 animate-pulse rounded-xl bg-ink/8" />
      <div className="h-48 animate-pulse rounded-xl bg-ink/8" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 animate-pulse rounded-xl bg-ink/8" />
        <div className="h-24 animate-pulse rounded-xl bg-ink/8" />
      </div>
    </div>
  );
}
