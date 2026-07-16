import {
  CalendarClock, ListChecks, Radar, Settings2, Sparkles, TrendingUp,
  type LucideIcon,
} from "lucide-react";

// Single source of truth for the sub-apps: used by the home launcher grid and
// the bottom-nav dock so labels, routes, icons, and brand colors never drift.
// Each app has its own accent color so its icon/tile reads as a distinct
// "app to launch" (vs. in-app nav or controls, which use a different visual
// language in the nav).
export interface AppDef {
  key: string;
  label: string;
  tagline: string;
  href: string;
  icon: LucideIcon;
  color: string;       // brand accent (solid)
  tint: string;        // soft background tint (rgba)
  /** True when the given pathname is inside this app's route group. */
  matches: (p: string) => boolean;
}

export const APPS: AppDef[] = [
  {
    key: "powerchat",
    label: "Mio",
    tagline: "Your personal assistant",
    href: "/chat",
    icon: Sparkles,
    color: "#d96f58",
    tint: "rgba(217,111,88,0.12)",
    matches: (p) => p.startsWith("/chat"),
  },
  {
    key: "tasks",
    label: "Tasks",
    tagline: "Lists, subtasks & reminders",
    href: "/tasks",
    icon: ListChecks,
    color: "#6d8a7a",
    tint: "rgba(109,138,122,0.14)",
    matches: (p) => p.startsWith("/tasks"),
  },
  {
    key: "trends",
    label: "Trends",
    tagline: "Analyse & brief trends",
    href: "/trends",
    icon: TrendingUp,
    color: "#c69a48",
    tint: "rgba(198,154,72,0.14)",
    matches: (p) =>
      p.startsWith("/trends") || p.startsWith("/briefs") || p.startsWith("/sources"),
  },
  {
    key: "metascraper",
    label: "MetaScraper",
    tagline: "Competitor ad recon",
    href: "/metascraper",
    icon: Radar,
    color: "#5b8bd0",
    tint: "rgba(91,139,208,0.14)",
    matches: (p) => p.startsWith("/metascraper"),
  },
  {
    key: "schedule",
    label: "Schedule",
    tagline: "Auto-synced shifts",
    href: "/schedule",
    icon: CalendarClock,
    color: "#7c6bb0",
    tint: "rgba(124,107,176,0.14)",
    matches: (p) => p.startsWith("/schedule"),
  },
  {
    key: "settings",
    label: "Settings",
    tagline: "Account & connections",
    href: "/settings",
    icon: Settings2,
    color: "#4a7d76",
    tint: "rgba(74,125,118,0.14)",
    matches: (p) => p.startsWith("/settings"),
  },
];

export function appForPath(pathname: string): AppDef | null {
  return APPS.find((a) => a.matches(pathname)) ?? null;
}
