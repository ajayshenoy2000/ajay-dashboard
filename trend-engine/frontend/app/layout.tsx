import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "L'or Trend Engine",
  description: "Japanese beauty trend intelligence dashboard for L'or Clinic YouTube"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <main className="page-enter mx-auto min-h-screen w-full max-w-6xl px-4 pb-24 pt-5 sm:px-6 lg:px-8">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
