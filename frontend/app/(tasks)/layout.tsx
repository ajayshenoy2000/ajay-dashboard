export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="page-enter mx-auto min-h-screen w-full max-w-6xl px-4 pb-32 pt-5 sm:px-6 lg:px-8">
      {children}
    </main>
  );
}
