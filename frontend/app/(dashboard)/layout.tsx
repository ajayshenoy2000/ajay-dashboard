export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 pt-8 sm:px-6">
      {children}
    </main>
  );
}
