"use client";

import { useEffect, useState } from "react";
import { CalendarClock, ListChecks, Radar, ShieldCheck, TrendingUp, X } from "lucide-react";
import * as chatbotApi from "@/lib/chatbot/api";
import type { ChatbotDataAccess } from "@/lib/chatbot/types";

const TOGGLES: Array<{ key: keyof ChatbotDataAccess; label: string; icon: typeof TrendingUp }> = [
  { key: "trendEngine", label: "Trends", icon: TrendingUp },
  { key: "metascraper", label: "Ads", icon: Radar },
  { key: "schedule", label: "Schedule", icon: CalendarClock },
  { key: "tasks", label: "Tasks", icon: ListChecks },
];

export function DataAccessMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [access, setAccess] = useState<ChatbotDataAccess>({ trendEngine: true, metascraper: true, schedule: true, tasks: true });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    chatbotApi.getDataAccess().then(async (next) => {
      const upgradeKey = "powerchat.dataAccess.v2";
      if (!Object.values(next).some(Boolean) && !localStorage.getItem(upgradeKey)) {
        next = await chatbotApi.setDataAccess({ trendEngine: true, metascraper: true, schedule: true, tasks: true });
      }
      localStorage.setItem(upgradeKey, "1");
      setAccess(next);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  async function toggle(key: keyof ChatbotDataAccess) {
    const previous = access;
    const next = { ...access, [key]: !access[key] };
    setAccess(next);
    await chatbotApi.setDataAccess({ [key]: next[key] }).catch(() => setAccess(previous));
  }

  if (!open) return null;
  return (
    <div className="absolute bottom-[calc(100%+8px)] left-2 right-2 rounded-3xl border border-ink/10 bg-white p-3 shadow-[0_-12px_40px_rgba(24,33,31,0.18)]">
      <div className="mb-3 flex items-center gap-2 px-1">
        <ShieldCheck className="h-4 w-4 text-sage" />
        <div className="min-w-0 flex-1"><p className="text-xs font-bold">Assistant access</p><p className="text-[10px] text-ink/40">Let Mio act across your workspace</p></div>
        <button onClick={onClose} aria-label="Close data access"><X className="h-4 w-4 text-ink/35" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {TOGGLES.map(({ key, label, icon: Icon }) => {
          const on = access[key];
          return (
            <button key={key} disabled={!loaded} onClick={() => toggle(key)} className={`flex items-center gap-2 rounded-2xl border p-3 text-left transition ${on ? "border-sage/30 bg-sage/10 text-sage" : "border-ink/8 bg-mist text-ink/35"}`}>
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-xs font-bold">{label}</span>
              <span className={`h-2 w-2 rounded-full ${on ? "bg-sage" : "bg-ink/15"}`} />
            </button>
          );
        })}
      </div>
      <p className="mt-2 px-1 text-[10px] leading-4 text-ink/35">All sources start on. Turn one off any time to keep it out of assistant actions.</p>
    </div>
  );
}
