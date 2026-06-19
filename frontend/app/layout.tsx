import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ajay",
  description: "Personal dashboard — work schedule, tasks, and trend intelligence"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
