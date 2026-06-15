"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, Settings, TrendingUp } from "lucide-react";

const LEFT_TABS = [
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/briefs", label: "Briefs", icon: FileText },
];
const RIGHT_TABS = [
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(href: string, pathname: string) {
  if (href === "/trends") return pathname.startsWith("/trends") || pathname.startsWith("/sources");
  return pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50">
      <div className="mx-auto max-w-lg">
        <div className="relative flex h-[62px] items-center rounded-2xl border border-ink/8 bg-white/96 px-2 shadow-[0_8px_32px_rgba(24,33,31,0.14)] backdrop-blur-md">

          {/* Left tabs */}
          <div className="flex flex-1 items-center justify-around">
            {LEFT_TABS.map((tab) => (
              <NavTab key={tab.href} tab={tab} active={isActive(tab.href, pathname)} />
            ))}
          </div>

          {/* Center home button — elevated circle */}
          <div className="relative z-10 mx-3 flex shrink-0 -translate-y-3 items-center justify-center">
            <Link
              href="/"
              aria-label="Dashboard home"
              className="flex h-14 w-14 cursor-pointer flex-col items-center justify-center rounded-full bg-ink text-white shadow-[0_4px_16px_rgba(24,33,31,0.35)] transition-all duration-200 hover:scale-105 hover:shadow-[0_6px_20px_rgba(24,33,31,0.45)] active:scale-95"
            >
              <Home className="h-5 w-5" />
              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider opacity-75">Home</span>
            </Link>
            {/* Notch shadow behind the button */}
            <div className="absolute inset-x-[-6px] bottom-[-8px] h-4 rounded-b-2xl bg-white/96" />
          </div>

          {/* Right tabs */}
          <div className="flex flex-1 items-center justify-around">
            {RIGHT_TABS.map((tab) => (
              <NavTab key={tab.href} tab={tab} active={isActive(tab.href, pathname)} />
            ))}
          </div>

        </div>
      </div>
    </nav>
  );
}

function NavTab({ tab, active }: { tab: { href: string; label: string; icon: React.ElementType }; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-label={tab.label}
      className="group relative flex min-h-[44px] min-w-[56px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-3 transition-all duration-200"
    >
      {/* Active pill indicator */}
      <span
        className={`absolute top-1.5 h-1 rounded-full bg-coral transition-all duration-300 ease-out ${
          active ? "w-5 opacity-100" : "w-0 opacity-0"
        }`}
      />
      <Icon
        className={`h-5 w-5 transition-all duration-200 ${
          active ? "text-coral" : "text-ink/40 group-hover:text-ink/70"
        }`}
        aria-hidden="true"
      />
      <span
        className={`text-[10px] font-semibold transition-all duration-200 ${
          active ? "text-coral" : "text-ink/40 group-hover:text-ink/60"
        }`}
      >
        {tab.label}
      </span>
    </Link>
  );
}
