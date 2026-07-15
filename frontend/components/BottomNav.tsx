"use client";

import { useState } from "react";
import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";
import {
  BarChart3, Check, ChevronUp, Compass, FileText, FolderKanban, History,
  House, Images, LayoutGrid, ListChecks, ShieldCheck, SlidersHorizontal,
  SquarePen, type LucideIcon,
} from "lucide-react";
import { APPS, appForPath } from "@/lib/apps";
import { CHAT_MODELS, chatModel } from "@/lib/ai/models";
import { ModelBadge } from "@/components/chatbot/ModelBadge";
import { useNavControls } from "@/components/nav/NavControlsProvider";
import { haptic } from "@/lib/haptics";
import { DataAccessMenu } from "@/components/chatbot/DataAccessPanel";

interface SubTab {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (p: string) => boolean;
}

// Route-derived section tabs shown as a segmented control inside each app.
// (PowerChat is intentionally absent — it injects dynamic controls via context.)
const APP_TABS: Record<string, SubTab[]> = {
  trends: [
    { href: "/trends", label: "Discover", icon: Compass, isActive: (p) => p === "/trends" },
    { href: "/trends/history", label: "Trends", icon: BarChart3, isActive: (p) => p.startsWith("/trends/history") || p.startsWith("/sources") },
    { href: "/briefs", label: "Briefs", icon: FileText, isActive: (p) => p.startsWith("/briefs") },
  ],
  tasks: [
    { href: "/tasks", label: "Today", icon: ListChecks, isActive: (p) => p === "/tasks" },
    { href: "/tasks/groups", label: "Groups", icon: FolderKanban, isActive: (p) => p.startsWith("/tasks/groups") },
  ],
  metascraper: [
    { href: "/metascraper", label: "Console", icon: SlidersHorizontal, isActive: (p) => p === "/metascraper" },
    { href: "/metascraper/dashboard", label: "Recon", icon: LayoutGrid, isActive: (p) => p.startsWith("/metascraper/dashboard") },
    { href: "/metascraper/captures", label: "Captures", icon: Images, isActive: (p) => p.startsWith("/metascraper/captures") },
  ],
};

export function BottomNav() {
  const pathname = usePathname();
  const app = appForPath(pathname);
  const isHome = pathname === "/" || !app;

  return (
    <nav
      className="fixed inset-x-0 z-50 flex justify-center px-3"
      style={{ bottom: "max(0.75rem, calc(var(--safe-bottom) + 0.4rem))" }}
    >
      <div className="w-full max-w-lg rounded-[26px] border border-ink/8 bg-white/95 shadow-[0_10px_40px_rgba(24,33,31,0.16)] backdrop-blur-xl">
        {isHome ? (
          <Dock pathname={pathname} />
        ) : app.key === "powerchat" ? (
          <ChatBar />
        ) : APP_TABS[app.key] ? (
          <SubAppBar accent={app.color} tabs={APP_TABS[app.key]} pathname={pathname} />
        ) : (
          <SingleViewBar label={app.label} accent={app.color} icon={app.icon} />
        )}
      </div>
    </nav>
  );
}

// ── Home: app-launcher dock ────────────────────────────────────────────────
function Dock({ pathname }: { pathname: string }) {
  return (
    <div className="flex items-center justify-between gap-1 px-2.5 py-2">
      {APPS.map((a) => {
        const Icon = a.icon;
        const active = a.matches(pathname);
        return (
          <Link
            key={a.key}
            href={a.href}
            aria-label={a.label}
            onClick={() => haptic(8)}
            className="group flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 active:scale-95"
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-[14px] transition-transform duration-200 group-hover:-translate-y-0.5"
              style={{ background: a.tint, color: a.color, boxShadow: active ? `0 0 0 2px ${a.color}` : undefined }}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={2.2} />
            </span>
            <span className="max-w-full truncate text-[9.5px] font-bold text-ink/55">{a.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

// ── Shared "escape to home" anchor for every in-app bar ─────────────────────
function HomeAnchor() {
  return (
    <Link
      href="/"
      aria-label="Home"
      onClick={() => haptic(8)}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink text-white shadow-[0_4px_14px_rgba(24,33,31,0.3)] active:scale-95"
    >
      <House className="h-[19px] w-[19px]" strokeWidth={2.2} />
    </Link>
  );
}

// ── In-app: segmented section tabs ──────────────────────────────────────────
function SubAppBar({ accent, tabs, pathname }: { accent: string; tabs: SubTab[]; pathname: string }) {
  return (
    <div className="flex items-center gap-2 p-2">
      <HomeAnchor />
      <div className="flex flex-1 items-center gap-1 rounded-2xl bg-mist/70 p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = t.isActive(pathname);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-label={t.label}
              onClick={() => haptic(6)}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-all active:scale-95"
              style={active ? { background: accent, color: "#fff", boxShadow: `0 4px 12px ${accent}55` } : undefined}
            >
              <Icon className={`h-[17px] w-[17px] ${active ? "" : "text-ink/45"}`} strokeWidth={2.2} />
              <span className={`text-[9.5px] font-bold ${active ? "text-white" : "text-ink/45"}`}>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── In-app single-view (schedule, calendar): home + app title chip ──────────
function SingleViewBar({ label, accent, icon: Icon }: { label: string; accent: string; icon: LucideIcon }) {
  return (
    <div className="flex items-center gap-2 p-2">
      <HomeAnchor />
      <div className="flex flex-1 items-center gap-2 rounded-2xl bg-mist/70 px-4 py-2.5">
        <Icon className="h-[18px] w-[18px]" style={{ color: accent }} strokeWidth={2.2} />
        <span className="text-sm font-bold text-ink/70">{label}</span>
      </div>
    </div>
  );
}

// ── PowerChat: model switcher + new chat + history (from context) ───────────
function ChatBar() {
  const controls = useNavControls();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);

  // Controls not yet registered (first paint before ChatThread mounts): show
  // just the Home anchor so the bar never looks broken.
  if (!controls) {
    return (
      <div className="flex items-center gap-2 p-2">
        <HomeAnchor />
        <div className="h-12 flex-1 rounded-2xl bg-mist/70" />
      </div>
    );
  }

  const current = chatModel(controls.model);

  return (
    <div className="relative flex items-center gap-2 p-2">
      <HomeAnchor />

      {/* Model switcher pill */}
      <button
        onClick={() => { haptic(8); setPickerOpen((v) => !v); }}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl bg-mist/70 px-3 py-2.5 active:scale-[0.98]"
      >
        <ModelBadge slug={current.slug} size={22} />
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-bold leading-tight text-ink/80">{current.short}</span>
          <span className="block truncate text-[10px] font-semibold leading-tight text-ink/40">{current.maker}</span>
        </span>
        <ChevronUp className={`h-4 w-4 shrink-0 text-ink/40 transition-transform ${pickerOpen ? "" : "rotate-180"}`} />
      </button>

      {/* New chat */}
      <button
        onClick={() => { haptic(8); controls.onNewChat(); }}
        aria-label="New chat"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-ink/10 bg-white text-ink/60 active:scale-95"
      >
        <SquarePen className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </button>

      {/* History */}
      <button
        onClick={() => { haptic(8); controls.onOpenHistory(); }}
        aria-label="Conversation history"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-ink/10 bg-white text-ink/60 active:scale-95"
      >
        <History className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </button>

      <button
        onClick={() => { haptic(8); setAccessOpen((value) => !value); setPickerOpen(false); }}
        aria-label="Assistant data access"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-ink/10 bg-white text-sage active:scale-95"
      >
        <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </button>

      <DataAccessMenu open={accessOpen} onClose={() => setAccessOpen(false)} />

      {/* Model picker popover (opens upward) */}
      {pickerOpen && (
        <>
          <div className="fixed inset-0 z-[-1]" onClick={() => setPickerOpen(false)} />
          <div className="absolute bottom-[calc(100%+8px)] left-2 right-2 rounded-2xl border border-ink/10 bg-white p-1.5 shadow-[0_-8px_30px_rgba(24,33,31,0.18)]">
            <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-ink/35">Model</p>
            {CHAT_MODELS.map((m) => {
              const active = m.slug === controls.model;
              return (
                <button
                  key={m.slug}
                  onClick={() => { haptic(8); controls.onModelChange(m.slug); setPickerOpen(false); }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${active ? "bg-mist" : "hover:bg-mist/60"}`}
                >
                  <ModelBadge slug={m.slug} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink/85">{m.label}</span>
                    <span className="block truncate text-[11px] font-semibold text-ink/40">{m.maker}</span>
                  </span>
                  {active && <Check className="h-4 w-4 shrink-0" style={{ color: m.color }} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
