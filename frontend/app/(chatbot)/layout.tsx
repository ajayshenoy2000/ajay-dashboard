export default function ChatbotLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="page-enter mx-auto min-h-screen w-full max-w-3xl px-4 pb-32 pt-5 sm:px-6">
      {children}
    </main>
  );
}
