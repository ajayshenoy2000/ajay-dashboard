"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, CheckCircle2, RefreshCw, Sun, WifiOff } from "lucide-react";
import { fetchDayMap } from "@/lib/schedule";

type SyncState = "ok" | "cached" | "error" | "loading";
type DayMap = Record<number, string>;

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isOff(s: string) { return s === "公休"; }
function statusLabel(s: string) { return s === "公休" ? "Day Off" : s || "Work Day"; }

export default function SchedulePage() {
  const [dayMap, setDayMap] = useState<DayMap | null>(null);
  const [sync, setSync] = useState<SyncState>("loading");
  const CACHE_KEY = "workScheduleCache";

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const todayNum = now.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const leadingBlanks = firstDow === 0 ? 6 : firstDow - 1;
  const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  async function load() {
    setSync("loading");
    try {
      const map = await fetchDayMap();
      const rawMap: DayMap = {};
      for (const [k, v] of Object.entries(map)) rawMap[Number(k)] = v as string;
      setDayMap(rawMap);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ dayMap: rawMap, fetchedAt: Date.now() }));
      setSync("ok");
    } catch {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { dayMap: m } = JSON.parse(cached);
        setDayMap(m);
        setSync("cached");
      } else {
        setSync("error");
      }
    }
  }

  useEffect(() => { load(); }, []);

  const todayShift = dayMap?.[todayNum] ?? null;
  const todayOff = todayShift !== null && isOff(todayShift);

  const upcomingOff = dayMap
    ? Array.from({ length: daysInMonth - todayNum + 1 }, (_, i) => todayNum + i)
        .filter((d) => dayMap[d] !== undefined && isOff(dayMap[d]))
        .map((d) => {
          const date = new Date(year, month - 1, d);
          return { d, date, weekday: date.toLocaleDateString("en-US", { weekday: "long" }) };
        })
    : [];

  let workCount = 0, offCount = 0;
  if (dayMap) {
    for (let d = todayNum; d <= daysInMonth; d++) {
      if (dayMap[d] !== undefined && isOff(dayMap[d])) offCount++;
      else workCount++;
    }
  }

  return (
    <div className="pb-10">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold text-ink/50 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
      </div>

      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Work Schedule</h1>
          <p className="text-sm text-ink/50">{monthName}</p>
        </div>
        <div className="flex items-center gap-2">
          {sync === "ok" && (
            <span className="flex items-center gap-1 rounded-full bg-sage/15 px-2.5 py-1 text-[11px] font-bold text-sage">
              <CheckCircle2 className="h-3 w-3" /> Synced
            </span>
          )}
          {sync === "cached" && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-600">
              <WifiOff className="h-3 w-3" /> Offline
            </span>
          )}
          <button
            onClick={load}
            className={`flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 text-ink/50 transition hover:border-ink/30 hover:text-ink ${sync === "loading" ? "animate-spin" : ""}`}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Today card */}
      <div className={`mb-5 rounded-xl p-5 text-white shadow-soft ${todayOff ? "bg-sage" : "bg-ink"}`}>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-widest opacity-60">Today</p>
        <p className="text-lg font-bold">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        <p className="mt-2 text-sm opacity-85">
          {sync === "loading"
            ? "Loading schedule…"
            : sync === "error"
            ? "Could not load schedule."
            : todayOff
            ? "It's your day off today — enjoy the break!"
            : `You're scheduled to work today at L'or Clinic.`}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-soft">
          <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-coral/15 text-coral">
            <Briefcase className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold">{workCount}</div>
          <div className="text-xs font-semibold text-ink/50">Work days remaining</div>
        </div>
        <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-soft">
          <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-sage/15 text-sage">
            <Sun className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold">{offCount}</div>
          <div className="text-xs font-semibold text-ink/50">Days off remaining</div>
        </div>
      </div>

      {/* Month calendar */}
      <div className="mb-5 rounded-xl border border-ink/10 bg-white p-4 shadow-soft">
        <h2 className="mb-3 text-sm font-bold">{monthName}</h2>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WD.map((w) => (
            <div key={w} className="pb-1 text-[10px] font-bold uppercase tracking-wider text-ink/40">{w}</div>
          ))}
          {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
            const date = new Date(year, month - 1, d);
            const weekend = date.getDay() === 0 || date.getDay() === 6;
            const off = dayMap ? (dayMap[d] !== undefined ? isOff(dayMap[d]) : false) : false;
            const today = d === todayNum;
            return (
              <div
                key={d}
                className={`flex flex-col items-center justify-center rounded-lg py-1.5 text-xs font-semibold transition
                  ${today ? "bg-ink text-white" : off ? "bg-sage/15 text-sage" : weekend ? "text-ink/40" : "text-ink/70"}
                `}
              >
                <span className="text-sm font-bold">{d}</span>
                {off && !today && <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider opacity-60">Off</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming off days */}
      <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-soft">
        <h2 className="mb-3 text-sm font-bold">Upcoming Days Off</h2>
        {sync === "loading" ? (
          <p className="text-sm text-ink/40">Loading…</p>
        ) : upcomingOff.length === 0 ? (
          <p className="text-sm text-ink/40">No upcoming days off this month.</p>
        ) : (
          <ul className="space-y-2">
            {upcomingOff.map(({ d, date, weekday }) => (
              <li key={d} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-sage/15 text-sage">
                  <span className="text-[10px] font-bold">{date.toLocaleDateString("en-US", { month: "short" })}</span>
                  <span className="text-sm font-bold leading-none">{d}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">{weekday}{d === todayNum ? " (Today)" : ""}</p>
                  <p className="text-xs text-ink/50">Scheduled day off</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
