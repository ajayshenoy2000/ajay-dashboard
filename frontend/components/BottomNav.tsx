"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, Radio, Settings, Sparkles, History } from "lucide-react";

const items = [
  { href: "/trends", label: "Discover", icon: Sparkles },
  { href: "/trends/history", label: "History", icon: History },
  { href: "/briefs", label: "Briefs", icon: FileText },
  { href: "/sources", label: "Sources", icon: Radio },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-ink/10 bg-white/95 px-2 py-2 shadow-soft backdrop-blur">
      <div className="mx-auto flex max-w-xl items-end gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/trends"
            ? pathname === "/trends"
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 min-h-12 flex-col items-center justify-center rounded-md text-[11px] font-semibold transition ${
                active ? "bg-sage text-white" : "text-ink/60 hover:bg-mist"
              }`}
              aria-label={item.label}
            >
              <Icon className="mb-1 h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}

        {/* Dashboard home button */}
        <Link
          href="/"
          className="flex min-h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gold text-white shadow-md transition hover:bg-gold/85 active:scale-95"
          aria-label="Back to dashboard"
        >
          <Home className="mb-1 h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] font-bold">Home</span>
        </Link>
      </div>
    </nav>
  );
}
