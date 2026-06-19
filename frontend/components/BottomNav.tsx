"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, CalendarClock, FileText, Home, Settings, Sparkles } from "lucide-react";

type Tab = { href: string; label: string; icon: React.ElementType; isActive: (p: string) => boolean };

// Trend Engine context: /trends*, /briefs*, /sources, /settings
const TREND_ENGINE_LEFT: Tab[] = [
  {
    href: "/trends",
    label: "Discover",
    icon: Sparkles,
    isActive: (p: string) => p === "/trends",
  },
  {
    href: "/trends/history",
    label: "Trends",
    icon: BarChart2,
    isActive: (p: string) => p.startsWith("/trends/history") || p.startsWith("/sources"),
  },
];

const TREND_ENGINE_RIGHT: Tab[] = [
  {
    href: "/briefs",
    label: "Briefs",
    icon: FileText,
    isActive: (p: string) => p.startsWith("/briefs"),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    isActive: (p: string) => p.startsWith("/settings"),
  },
];

// Dashboard context: /, /schedule, /calendar-app — kept to a single tab on
// each side so the row stays odd-numbered/symmetric around the Home button.
const DASHBOARD_LEFT: Tab[] = [
  {
    href: "/schedule",
    label: "Schedule",
    icon: CalendarClock,
    isActive: (p: string) => p.startsWith("/schedule"),
  },
];

const DASHBOARD_RIGHT: Tab[] = [
  {
    href: "/trends",
    label: "Trends",
    icon: Sparkles,
    isActive: (p: string) => p.startsWith("/trends") || p.startsWith("/briefs") || p.startsWith("/sources") || p.startsWith("/settings"),
  },
];

function isDashboardContext(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/schedule") || pathname.startsWith("/calendar-app");
}

export function BottomNav() {
  const pathname = usePathname();
  const dashboardContext = isDashboardContext(pathname);
  const leftTabs = dashboardContext ? DASHBOARD_LEFT : TREND_ENGINE_LEFT;
  const rightTabs = dashboardContext ? DASHBOARD_RIGHT : TREND_ENGINE_RIGHT;

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50">
      <div className="mx-auto max-w-lg">
        <div className="relative flex h-[62px] items-center rounded-2xl border border-ink/8 bg-white/96 px-2 shadow-[0_8px_32px_rgba(24,33,31,0.14)] backdrop-blur-md">

          {/* Left tab(s) */}
          <div className="flex flex-1 items-center justify-around">
            {leftTabs.map((tab) => (
              <NavTab key={tab.href} tab={tab} active={tab.isActive(pathname)} />
            ))}
          </div>

          {/* Center home button — elevated circle */}
          <div className="relative z-10 mx-2 flex shrink-0 -translate-y-3 items-center justify-center">
            <Link
              href="/"
              aria-label="Dashboard home"
              className="flex h-14 w-14 cursor-pointer flex-col items-center justify-center rounded-full bg-ink text-white shadow-[0_4px_16px_rgba(24,33,31,0.35)] transition-all duration-200 hover:scale-105 hover:shadow-[0_6px_22px_rgba(24,33,31,0.45)] active:scale-95"
            >
              <Home className="h-5 w-5" />
              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider opacity-70">Home</span>
            </Link>
            {/* Fill the notch gap so the bar looks seamless */}
            <div className="pointer-events-none absolute inset-x-[-4px] bottom-[-6px] h-3 bg-white/96" />
          </div>

          {/* Right tab(s) */}
          <div className="flex flex-1 items-center justify-around">
            {rightTabs.map((tab) => (
              <NavTab key={tab.href} tab={tab} active={tab.isActive(pathname)} />
            ))}
          </div>

        </div>
      </div>
    </nav>
  );
}

function NavTab({
  tab,
  active,
}: {
  tab: { href: string; label: string; icon: React.ElementType };
  active: boolean;
}) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-label={tab.label}
      className="group relative flex min-h-[44px] min-w-[52px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-2 transition-all duration-200"
    >
      {/* Sliding pill indicator above icon */}
      <span
        className={`absolute top-1.5 h-[3px] rounded-full bg-coral transition-all duration-300 ease-out ${
          active ? "w-5 opacity-100" : "w-0 opacity-0"
        }`}
      />
      <Icon
        className={`h-[18px] w-[18px] transition-all duration-200 ${
          active ? "text-coral" : "text-ink/38 group-hover:text-ink/65"
        }`}
        aria-hidden="true"
      />
      <span
        className={`text-[10px] font-semibold leading-none transition-all duration-200 ${
          active ? "text-coral" : "text-ink/38 group-hover:text-ink/55"
        }`}
      >
        {tab.label}
      </span>
    </Link>
  );
}
