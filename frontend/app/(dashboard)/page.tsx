"use client";

import { useEffect, useState } from "react";
import { Link } from "next-view-transitions";
import { Briefcase, Sun, User } from "lucide-react";
import { fetchWeekSchedule, shiftLabel, type WeekDay } from "@/lib/schedule";
import { BottomSheet } from "@/components/BottomSheet";
import { AuthSheet } from "@/components/auth/AuthSheet";
import { TaskWidget } from "@/components/tasks/TaskWidget";
import { StatusBar } from "@/components/home/StatusBar";
import { APPS } from "@/lib/apps";
import { ensureSession } from "@/lib/session";
import { onAuthStateChange } from "@/lib/auth";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function DayDetailSheet({ day, onClose }: { day: WeekDay; onClose: () => void }) {
  const label = shiftLabel(day.shift);
  const isOff = day.status === "off";
  const dateStr = day.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <BottomSheet open onClose={onClose} title={day.isToday ? "Today" : "Schedule"}>
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isOff ? "bg-sage/15 text-sage" : "bg-coral/15 text-coral"}`}>
          {isOff ? <Sun className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
        </div>
        <p className="font-bold">{dateStr}</p>
      </div>
      <div className={`rounded-2xl px-4 py-3.5 ${isOff ? "bg-sage/10" : "bg-coral/8"}`}>
        <p className={`text-base font-bold ${isOff ? "text-sage" : "text-coral"}`}>
          {isOff ? "Day Off" : label}
        </p>
        {!isOff && day.shift && <p className="mt-0.5 text-sm text-ink/55">{day.shift}</p>}
      </div>
    </BottomSheet>
  );
}

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("Good morning");
  const [timeStr, setTimeStr] = useState("");
  const [dateDay, setDateDay] = useState("");
  const [dateFull, setDateFull] = useState("");
  const [work, setWork] = useState<Awaited<ReturnType<typeof fetchWeekSchedule>> | null>(null);
  const [selectedWeekDay, setSelectedWeekDay] = useState<WeekDay | null>(null);
  const [authSheetOpen, setAuthSheetOpen] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);

  useEffect(() => {
    ensureSession().then((s) => setIsAnonymous(Boolean(s.user.is_anonymous))).catch(() => {});
    return onAuthStateChange((session) => setIsAnonymous(session ? Boolean(session.user.is_anonymous) : true));
  }, []);

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
      {selectedWeekDay && <DayDetailSheet day={selectedWeekDay} onClose={() => setSelectedWeekDay(null)} />}
      <AuthSheet open={authSheetOpen} onClose={() => setAuthSheetOpen(false)} />

      {/* Header */}
      <header className="mb-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
            {dateDay} · {dateFull} · {timeStr}
          </p>
          <button
            onClick={() => setAuthSheetOpen(true)}
            aria-label={isAnonymous ? "Sign in" : "Account"}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${isAnonymous ? "bg-coral/12 text-coral" : "bg-sage/15 text-sage"}`}
          >
            <User className="h-4 w-4" />
          </button>
        </div>
        <h1 className="mt-1 text-3xl font-bold">
          {greeting}, <span className="text-coral">Ajay</span>
        </h1>
      </header>

      {/* AI status bar */}
      <div className="mb-5">
        <StatusBar />
      </div>

      {/* Week strip */}
      <section className="mb-5">
        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
          <div className="mb-4 flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isOff ? "bg-sage/15 text-sage" : "bg-coral/15 text-coral"}`}>
              {isOff ? <Sun className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink/35">This Week</p>
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

      <TaskWidget />

      {/* App launcher — square tiles */}
      <section className="mb-4">
        <h2 className="mb-3 text-base font-bold">Your Apps</h2>
        <div className="grid grid-cols-3 gap-3">
          {APPS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.key}
                href={a.href}
                className="group flex aspect-square cursor-pointer flex-col items-center justify-center gap-2.5 rounded-3xl border border-ink/8 bg-white p-3 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(24,33,31,0.14)]"
              >
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105"
                  style={{ background: a.tint, color: a.color }}
                >
                  <Icon className="h-7 w-7" strokeWidth={2.1} />
                </span>
                <span className="text-center text-xs font-bold text-ink/75">{a.label}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
