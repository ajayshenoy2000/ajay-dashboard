export default function ScheduleLoading() {
  return (
    <div className="space-y-4 pb-10">
      <div className="h-6 w-24 animate-pulse rounded-lg bg-ink/8" />
      <div className="h-9 w-56 animate-pulse rounded-lg bg-ink/8" />
      <div className="h-28 animate-pulse rounded-xl bg-ink/8" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 animate-pulse rounded-xl bg-ink/8" />
        <div className="h-20 animate-pulse rounded-xl bg-ink/8" />
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-ink/8" />
    </div>
  );
}
