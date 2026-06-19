"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, CalendarClock, RefreshCw, Sun, X } from "lucide-react";
import { fetchDayMap, shiftLabel } from "@/lib/schedule";

type DayMap = Record<number, string>;
type Sync = "loading" | "ok" | "cached" | "error";

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CACHE_KEY = "workScheduleCache";

function isOff(s: string) { return s === "公休"; }

// ─── Day Detail Sheet ────────────────────────────────────────────────────────
function DayDetailSheet({
  day, month, year, dayMap, onClose,
}: {
  day: number; month: number; year: number; dayMap: DayMap; onClose: () => void;
}) {
  const date = new Date(year, month - 1, day);
  const shift = dayMap[day] ?? null;
  const off = isOff(shift ?? "");
  const label = shiftLabel(shift);
  const dateStr = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl bg-white p-6 pb-10 shadow-[0_-8px_40px_rgba(24,33,31,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-ink/15" />
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${off ? "bg-sage/15 text-sage" : "bg-coral/15 text-coral"}`}>
              {off ? <Sun className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink/40">
                {isToday ? "Today" : "Schedule"}
              </p>
              <p className="font-bold">{dateStr}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink/30 transition hover:bg-mist hover:text-ink/60">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={`rounded-2xl px-4 py-3.5 ${off ? "bg-sage/10" : shift ? "bg-coral/8" : "bg-mist"}`}>
          <p className={`text-base font-bold ${off ? "text-sage" : shift ? "text-coral" : "text-ink/40"}`}>
            {off ? "Day Off" : shift ? label : "No data for this day"}
          </p>
          {!off && shift && (
            <p className="mt-0.5 text-sm text-ink/55">{shift}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-2xl bg-mist py-3 text-sm font-semibold text-ink/60 transition hover:bg-ink/8"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [dayMap, setDayMap] = useState<DayMap | null>(null);
  const [sync, setSync] = useState<Sync>("loading");
  const [spinning, setSpinning] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const todayNum = now.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const leadingBlanks = firstDow === 0 ? 6 : firstDow - 1;
  const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  async function load() {
    setSpinning(true);
    try {
      const raw = await fetchDayMap();
      const map: DayMap = {};
      for (const [k, v] of Object.entries(raw)) map[Number(k)] = v as string;
      setDayMap(map);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ dayMap: map, fetchedAt: Date.now() }));
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
    } finally {
      setSpinning(false);
    }
  }

  useEffect(() => { load(); }, []);

  const todayOff = dayMap ? isOff(dayMap[todayNum] ?? "") : false;

  // Stats: remaining from today
  let workCount = 0, offCount = 0;
  if (dayMap) {
    for (let d = todayNum; d <= daysInMonth; d++) {
      if (isOff(dayMap[d] ?? "")) offCount++; else workCount++;
    }
  }

  // Upcoming off days from today
  const upcomingOff = dayMap
    ? Array.from({ length: daysInMonth - todayNum + 1 }, (_, i) => todayNum + i)
        .filter((d) => isOff(dayMap[d] ?? ""))
        .map((d) => {
          const date = new Date(year, month - 1, d);
          return {
            d,
            monthShort: date.toLocaleDateString("en-US", { month: "short" }),
            weekday: date.toLocaleDateString("en-US", { weekday: "long" }),
          };
        })
    : [];

  return (
    <div className="page-enter pb-10">
      {/* Day detail sheet */}
      {selectedDay !== null && dayMap && (
        <DayDetailSheet
          day={selectedDay}
          month={month}
          year={year}
          dayMap={dayMap}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <Link href="/" className="mb-2 inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-ink/60 no-underline transition hover:text-coral">
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
          <h1 className="mt-2 text-[2rem] font-extrabold tracking-tight">
            Work <span className="text-coral">Schedule</span>
          </h1>
        </div>
        <button
          onClick={load}
          aria-label="Refresh"
          className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl border-0 bg-white shadow-soft transition hover:rotate-[-8deg] hover:scale-105 active:scale-95"
        >
          <RefreshCw className={`h-5 w-5 text-ink ${spinning ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Hero card */}
      <div className="relative mb-6 overflow-hidden rounded-[22px] bg-ink px-6 py-6 shadow-[0_20px_50px_rgba(32,32,29,0.25)]">
        {/* floating glow */}
        <div className="pointer-events-none absolute -right-[20%] -top-[40%] h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle,rgba(255,159,28,0.45)_0%,transparent_70%)]" style={{ animation: "floatGlow 8s ease-in-out infinite" }} />
        {/* shimmer */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[60%] bg-[linear-gradient(100deg,transparent_0%,rgba(255,255,255,0.07)_50%,transparent_100%)]" style={{ animation: "shimmer 5s ease-in-out infinite 1s" }} />
        <div className="relative z-10">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,159,28,0.18)] px-3 py-1.5 text-[0.72rem] font-bold uppercase tracking-wider text-[#ff9f1c]">
            <CalendarClock className="h-3.5 w-3.5" /> Today · {todayStr}
          </span>
          <p className="text-[0.98rem] leading-relaxed text-white/88">
            {sync === "loading"
              ? "Loading your shift status…"
              : sync === "error"
              ? "Could not load schedule. Check your connection."
              : todayOff
              ? <>It&apos;s your <strong className="text-white">day off</strong> today — enjoy the break!</>
              : <>You&apos;re <strong className="text-white">scheduled to work</strong> today at L&apos;or Clinic Omotesando. Have a great one!</>}
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="stagger-list mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-coral/15 text-coral">
            <Briefcase className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold">{sync === "loading" ? "–" : workCount}</div>
          <div className="text-xs font-semibold text-ink/50">Work days left</div>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-sage/15 text-sage">
            <Sun className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold">{sync === "loading" ? "–" : offCount}</div>
          <div className="text-xs font-semibold text-ink/50">Days off left</div>
        </div>
      </div>

      {/* Calendar widget */}
      <div className="mb-5 rounded-2xl border border-ink/10 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">{monthName}</span>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.74rem] font-bold ${
            sync === "ok" ? "bg-[rgba(58,158,110,0.12)] text-[#3a9e6e]"
            : sync === "cached" ? "bg-amber-50 text-amber-600"
            : sync === "error" ? "bg-red-50 text-red-500"
            : "bg-ink/8 text-ink/40"
          }`}>
            {sync === "ok" ? "✓ Synced" : sync === "cached" ? "⚡ Offline" : sync === "error" ? "✕ Failed" : "…"}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-[0.45rem]">
          {WD.map((w) => (
            <div key={w} className="pb-1.5 text-center text-[0.7rem] font-bold uppercase tracking-wider text-ink/50">{w}</div>
          ))}
          {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
            const date = new Date(year, month - 1, d);
            const weekend = date.getDay() === 0 || date.getDay() === 6;
            const off = isOff(dayMap?.[d] ?? "");
            const today = d === todayNum;
            return (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                style={off ? { background: "linear-gradient(150deg, #ff9f1c 0%, #f3801c 100%)", boxShadow: "0 8px 20px rgba(255,159,28,0.3)" } : today ? { boxShadow: "0 0 0 2.5px #20201d inset" } : undefined}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-[12px] text-[0.9rem] font-semibold transition-all duration-200 hover:-translate-y-[3px] hover:scale-105 active:scale-95
                  ${off ? "text-white" : today ? "bg-[#f9f7f4] text-ink" : weekend ? "bg-[#f9f7f4] text-ink/40" : "bg-[#f9f7f4] text-ink"}
                `}
              >
                <span>{d}</span>
                {off && <span className="mt-0.5 text-[0.6rem] font-bold uppercase opacity-70">Off</span>}
                {today && (
                  <span
                    className="absolute bottom-[6px] h-[5px] w-[5px] rounded-full"
                    style={{
                      background: off ? "#fff" : "#20201d",
                      animation: "pulseDot 1.6s ease-in-out infinite",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-5 flex flex-wrap gap-5">
          <span className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-ink/55">
            <span className="h-[11px] w-[11px] rounded-full border-[1.5px] border-ink/15 bg-[#f9f7f4]" /> Work day
          </span>
          <span className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-ink/55">
            <span className="h-[11px] w-[11px] rounded-full" style={{ background: "linear-gradient(150deg, #ff9f1c 0%, #f3801c 100%)" }} /> Day off
          </span>
          <span className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-ink/55">
            <span className="h-[11px] w-[11px] rounded-full bg-white" style={{ boxShadow: "0 0 0 2px #20201d inset" }} /> Today
          </span>
        </div>
      </div>

      {/* Upcoming off days */}
      <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-base font-bold">Upcoming Days Off</span>
        </div>
        {sync === "loading" ? (
          <p className="text-sm text-ink/40">Fetching your schedule…</p>
        ) : upcomingOff.length === 0 ? (
          <p className="text-sm text-ink/40">No upcoming days off this month.</p>
        ) : (
          <div className="space-y-3">
            {upcomingOff.map(({ d, monthShort, weekday }) => (
              <div key={d} className="flex items-center gap-4 rounded-xl bg-[#f9f7f4] px-4 py-3">
                <div className="text-right text-sm font-bold text-ink/50">{monthShort} {d}</div>
                <div>
                  <div className="text-sm font-semibold">{weekday}{d === todayNum ? " (Today)" : ""}</div>
                  <div className="text-xs text-ink/50">Scheduled day off</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="mt-6 text-center text-xs text-ink/35">
        Auto-synced from Google Sheets · Powered by <span className="text-coral font-semibold">Claude</span>
      </footer>
    </div>
  );
}
