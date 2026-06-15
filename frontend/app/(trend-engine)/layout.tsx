import { BottomNav } from "@/components/BottomNav";

export default function TrendEngineLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <main className="page-enter mx-auto min-h-screen w-full max-w-6xl px-4 pb-24 pt-5 sm:px-6 lg:px-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
