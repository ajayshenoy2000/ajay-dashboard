"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar } from "lucide-react";

const TABS = [
  { href: "/metascraper", label: "Console", exact: true },
  { href: "/metascraper/dashboard", label: "Dashboard", exact: false },
  { href: "/metascraper/captures", label: "History", exact: false },
];

export function MetaHeader({ subtitle }: { subtitle: string }) {
  return (
    <header className="mb-5">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ink/40">
        <Radar className="h-3.5 w-3.5 text-coral" /> MetaScraper
      </p>
      <h1 className="text-3xl font-bold">
        Ad <span className="text-coral">Recon</span>
      </h1>
      <p className="mt-1 text-sm text-ink/50">{subtitle}</p>
    </header>
  );
}

export function MetaSubNav() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-1 rounded-2xl border border-ink/10 bg-mist p-1">
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 rounded-xl py-2.5 text-center text-sm font-bold transition-all duration-200 ${
              active ? "bg-white text-ink shadow-soft" : "text-ink/45 hover:text-ink/70"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
