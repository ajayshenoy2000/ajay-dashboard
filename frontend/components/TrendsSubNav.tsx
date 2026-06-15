"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/trends/history", label: "History" },
  { href: "/sources", label: "Sources" },
];

export function TrendsSubNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-1 rounded-2xl border border-ink/10 bg-mist p-1">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 rounded-xl py-2.5 text-center text-sm font-bold transition-all duration-200 ${
              active
                ? "bg-white text-ink shadow-soft"
                : "text-ink/45 hover:text-ink/70"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
