"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import * as chatbotApi from "@/lib/chatbot/api";
import type { ChatbotDataAccess } from "@/lib/chatbot/types";

const TOGGLES: Array<{ key: keyof ChatbotDataAccess; label: string; hint: string }> = [
  { key: "trendEngine", label: "Trend Engine", hint: "Trends, briefs & sources" },
  { key: "metascraper", label: "MetaScraper", hint: "Competitor ad tracking" },
  { key: "schedule", label: "Work Schedule", hint: "This week's shifts" },
  { key: "tasks", label: "Tasks", hint: "Your open tasks & lists" },
];

// Inline, always-visible (not a one-time dismissible banner) so the privacy
// boundary stays easy to find and change, per Phase 7 of the overhaul plan —
// runTool() re-checks these server-side on every call, this panel is just
// the control surface.
export function DataAccessPanel() {
  const [access, setAccess] = useState<ChatbotDataAccess | null>(null);

  useEffect(() => {
    chatbotApi.getDataAccess().then(setAccess);
  }, []);

  async function toggle(key: keyof ChatbotDataAccess) {
    if (!access) return;
    const next = { ...access, [key]: !access[key] };
    setAccess(next);
    await chatbotApi.setDataAccess({ [key]: next[key] }).catch(() => setAccess(access));
  }

  if (!access) return null;
  const anyOn = Object.values(access).some(Boolean);

  return (
    <details className="mb-4 rounded-2xl border border-ink/10 bg-white shadow-soft">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-xs font-bold text-ink/60">
        <ShieldCheck className="h-3.5 w-3.5 text-sage" />
        Data access {anyOn ? "— some sources on" : "— all off"}
      </summary>
      <div className="space-y-2 border-t border-ink/8 px-4 py-3">
        <p className="mb-1 text-[11px] leading-5 text-ink/45">
          Choose what this assistant can look up on your behalf. Off by default — nothing is shared until you turn it on.
        </p>
        {TOGGLES.map((t) => (
          <label key={t.key} className="flex items-center justify-between gap-3 py-1">
            <div>
              <p className="text-xs font-bold text-ink/75">{t.label}</p>
              <p className="text-[11px] text-ink/40">{t.hint}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={access[t.key]}
              onClick={() => toggle(t.key)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${access[t.key] ? "bg-sage" : "bg-ink/15"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  access[t.key] ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        ))}
      </div>
    </details>
  );
}
