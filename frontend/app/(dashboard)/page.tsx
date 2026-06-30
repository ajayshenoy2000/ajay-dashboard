"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase, Calendar, CalendarClock, Clock, Radar, Sparkles, Sun,
} from "lucide-react";
import { fetchWeekSchedule, shiftLabel, type WeekDay } from "@/lib/schedule";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function DayDetailSheet({ day, onClose }: { day: WeekDay; onClose: () => void }) {
  const label = shiftLabel(day.shift);
  const isOff = day.status === "off";
  const dateStr = day.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

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
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isOff ? "bg-sage/15 text-sage" : "bg-coral/15 text-coral"}`}>
            {isOff ? <Sun className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink/40">
              {day.isToday ? "Today" : "Schedule"}
            </p>
            <p className="font-bold">{dateStr}</p>
          </div>
        </div>
        <div className={`rounded-2xl px-4 py-3.5 ${isOff ? "bg-sage/10" : "bg-coral/8"}`}>
          <p className={`text-base font-bold ${isOff ? "text-sage" : "text-coral"}`}>
            {isOff ? "Day Off" : label}
          </p>
          {!isOff && day.shift && (
            <p className="mt-0.5 text-sm text-ink/55">{day.shift}</p>
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

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("Good morning");
  const [timeStr, setTimeStr] = useState("");
  const [dateDay, setDateDay] = useState("");
  const [dateFull, setDateFull] = useState("");
  const [work, setWork] = useState<Awaited<ReturnType<typeof fetchWeekSchedule>> | null>(null);
  const [selectedWeekDay, setSelectedWeekDay] = useState<WeekDay | null>(null);

  // Clock tick
  useEffect(() => {
    function tick() {
      const now = new Date();
      const h = now.getHours();
      setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
      setTimeStr(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
      setDateDay(now.toLocaleDateString("en-US", { weekday: "long" }));
      setDateFull(now.toLocaleDateString("en-US", { month: "long", day: "numeric" }));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { fetchWeekSchedule().then(setWork).catch(() => {}); }, []);

  const isOff = work?.status === "off";

  return (
    <div className="pb-10">
      {selectedWeekDay && (
        <DayDetailSheet day={selectedWeekDay} onClose={() => setSelectedWeekDay(null)} />
      )}

      {/* Header */}
      <header className="mb-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-ink/40">
          {dateDay} · {timeStr}
        </p>
        <h1 className="text-3xl font-bold">
          {greeting}, <span className="text-coral">Ajay</span>
        </h1>
        <div className="relative mt-4 overflow-hidden rounded-2xl bg-ink p-5 text-white shadow-[0_8px_32px_rgba(24,33,31,0.2)]">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-40"
            style={{ background: "radial-gradient(circle, #c69a48 0%, transparent 70%)", animation: "floatGlow 8s ease-in-out infinite" }}
          />
          <span className="relative mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gold">
            <Sparkles className="h-3.5 w-3.5" /> Daily brief
          </span>
          <p className="relative text-sm leading-6 text-white/85">
            {work ? (isOff ? "It's your day off today — enjoy the break." : `You're working today — ${work.label}.`) : "Loading your schedule…"}
          </p>
        </div>
      </header>

      {/* Date + week strip */}
      <section className="mb-4">
        <h2 className="mb-3 text-4xl font-extrabold leading-none">
          {dateDay} <span className="text-lg font-normal text-ink/40">{dateFull}</span>
        </h2>
        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
          <div className="mb-4 flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isOff ? "bg-sage/15 text-sage" : "bg-coral/15 text-coral"}`}>
              {isOff ? <Sun className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink/35">Work Status</p>
              <p className="font-semibold">{work?.label ?? "Loading…"}</p>
            </div>
          </div>
          {work?.week && (
            <div className="grid grid-cols-7 gap-1">
              {(work.week as WeekDay[]).map((day, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedWeekDay(day)}
                  className={`flex flex-col items-center rounded-xl py-2 text-xs transition-all duration-150 active:scale-95 ${day.isToday ? "bg-ink text-white" : "text-ink/50 hover:bg-mist"}`}
                >
                  <span className="text-[9px] font-semibold uppercase tracking-wide opacity-60">{DAY_LABELS[i]}</span>
                  <span className="my-0.5 text-sm font-bold">{day.dayNum}</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${day.status === "work" ? "bg-coral" : day.status === "off" ? "bg-sage" : "bg-ink/15"}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick stat */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-coral/12 text-coral">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold">{isOff ? "Off" : "On"}</div>
          <div className="text-xs font-semibold text-ink/45">Work today</div>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-ink/6 text-ink/50">
            <Clock className="h-4 w-4" />
          </div>
          <div className="tabular-nums text-2xl font-bold">{timeStr}</div>
          <div className="text-xs font-semibold text-ink/45">Local time</div>
        </div>
      </div>

      {/* App grid */}
      <section className="mb-4">
        <h2 className="mb-3 text-base font-bold">Your Apps</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/trends" className="group cursor-pointer rounded-2xl bg-ink p-4 text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(24,33,31,0.22)]">
            <Sparkles className="mb-3 h-6 w-6 text-gold transition-transform duration-200 group-hover:scale-110" />
            <div className="font-bold">Trend Intelligence</div>
            <div className="mt-0.5 text-xs text-white/50">Analyse and summarise trends</div>
          </Link>
          <Link href="/schedule" className="group cursor-pointer rounded-2xl bg-ink p-4 text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(24,33,31,0.22)]">
            <CalendarClock className="mb-3 h-6 w-6 text-gold transition-transform duration-200 group-hover:scale-110" />
            <div className="font-bold">Work Schedule</div>
            <div className="mt-0.5 text-xs text-white/50">Auto-synced shift calendar</div>
          </Link>
          <Link href="/calendar-app" className="group cursor-pointer rounded-2xl border border-ink/10 bg-white p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/20">
            <Calendar className="mb-3 h-6 w-6 text-sage transition-transform duration-200 group-hover:scale-110" />
            <div className="font-bold">Calendar</div>
            <div className="mt-0.5 text-xs text-ink/45">Live Google Calendar feed</div>
          </Link>
          <Link href="/metascraper" className="group cursor-pointer rounded-2xl bg-ink p-4 text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(24,33,31,0.22)]">
            <Radar className="mb-3 h-6 w-6 text-gold transition-transform duration-200 group-hover:scale-110" />
            <div className="font-bold">MetaScraper</div>
            <div className="mt-0.5 text-xs text-white/50">Competitor Meta ad recon</div>
          </Link>
        </div>
      </section>
    </div>
  );
}
