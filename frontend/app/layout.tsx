import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { ViewTransitions } from "next-view-transitions";
import { BottomNav } from "@/components/BottomNav";
import { NavControlsProvider } from "@/components/nav/NavControlsProvider";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ajay",
  description: "Personal dashboard — work schedule, tasks, and trend intelligence",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ajay",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#18211f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransitions>
      <html lang="en" className={poppins.variable}>
        <body>
          <NavControlsProvider>
            {children}
            <BottomNav />
          </NavControlsProvider>
        </body>
      </html>
    </ViewTransitions>
  );
}
