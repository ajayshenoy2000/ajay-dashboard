"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell, Briefcase, Calendar, CalendarClock, CheckCircle2,
  ChevronDown, Clock, Radar, Settings, Sparkles, Sun, X,
} from "lucide-react";
import { fetchWeekSchedule, shiftLabel, type WeekDay } from "@/lib/schedule";
import {
  completeReminder, createReminder, deleteReminder,
  getAvailableLists, getReminders, getRemindersHealth,
  setRemindersList,
  type Reminder, type RemindersHealth,
} from "@/lib/api";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

// ─── Day Detail Sheet ────────────────────────────────────────────────────────
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

// ─── Undo Toast ───────────────────────────────────────────────────────────────
function UndoToast({ text, onUndo, onDismiss }: { text: string; onUndo: () => void; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 shadow-[0_8px_24px_rgba(24,33,31,0.25)]">
      <span className="flex-1 truncate text-sm text-white/80">Deleted &ldquo;{text}&rdquo;</span>
      <button onClick={onUndo} className="shrink-0 text-sm font-bold text-coral transition hover:text-coral/75">Undo</button>
      <button onClick={onDismiss} className="shrink-0 text-white/40 transition hover:text-white/70">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface UndoItem { id: string; text: string; timeoutId: ReturnType<typeof setTimeout> }

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("Good morning");
  const [timeStr, setTimeStr] = useState("");
  const [dateDay, setDateDay] = useState("");
  const [dateFull, setDateFull] = useState("");
  const [work, setWork] = useState<Awaited<ReturnType<typeof fetchWeekSchedule>> | null>(null);
  const [selectedWeekDay, setSelectedWeekDay] = useState<WeekDay | null>(null);

  // Reminders state
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderInput, setReminderInput] = useState("");
  const [remindersUnavailable, setRemindersUnavailable] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [health, setHealth] = useState<RemindersHealth | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [availableLists, setAvailableLists] = useState<string[]>([]);
  const [listInput, setListInput] = useState("");
  const [savingList, setSavingList] = useState(false);
  const [undoItems, setUndoItems] = useState<UndoItem[]>([]);

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

  // Reminders: load + 30s polling
  const loadReminders = useCallback(async () => {
    const { reminders: r, available } = await getReminders(showCompleted);
    setReminders(r);
    setRemindersUnavailable(!available);
  }, [showCompleted]);

  useEffect(() => {
    loadReminders();
    const id = setInterval(loadReminders, 30_000);
    return () => clearInterval(id);
  }, [loadReminders]);

  // Health check on mount
  useEffect(() => {
    getRemindersHealth().then((h) => {
      setHealth(h);
      setListInput(h.list);
    });
  }, []);

  // Load available lists when settings opens
  useEffect(() => {
    if (showSettings) getAvailableLists().then(setAvailableLists);
  }, [showSettings]);

  const isOff = work?.status === "off";
  const activeReminders = reminders.filter((r) => !r.done);
  const completedReminders = reminders.filter((r) => r.done);

  async function addReminder() {
    const text = reminderInput.trim();
    if (!text) return;
    try {
      const created = await createReminder(text);
      setReminders((prev) => [created, ...prev]);
      setReminderInput("");
    } catch {
      setRemindersUnavailable(true);
    }
  }

  async function checkOffReminder(id: string) {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    try { await completeReminder(id); } catch { /* optimistic */ }
  }

  function removeReminderWithUndo(id: string, text: string) {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    const timeoutId = setTimeout(async () => {
      try { await deleteReminder(id); } catch { /* best effort */ }
      setUndoItems((prev) => prev.filter((u) => u.id !== id));
    }, 4000);
    setUndoItems((prev) => [...prev, { id, text, timeoutId }]);
  }

  function undoDelete(id: string) {
    const item = undoItems.find((u) => u.id === id);
    if (!item) return;
    clearTimeout(item.timeoutId);
    setUndoItems((prev) => prev.filter((u) => u.id !== id));
    loadReminders();
  }

  function dismissUndo(id: string) {
    setUndoItems((prev) => prev.filter((u) => u.id !== id));
  }

  async function saveList() {
    if (!listInput.trim()) return;
    setSavingList(true);
    try {
      const updated = await setRemindersList(listInput.trim());
      setHealth((prev) => (prev ? { ...prev, list: updated } : prev));
      await loadReminders();
      setShowSettings(false);
    } catch { /* silently fail */ }
    setSavingList(false);
  }

  return (
    <div className="pb-10">
      {/* Day detail sheet */}
      {selectedWeekDay && (
        <DayDetailSheet day={selectedWeekDay} onClose={() => setSelectedWeekDay(null)} />
      )}

      {/* Undo toasts */}
      {undoItems.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-40 space-y-2">
          {undoItems.map((u) => (
            <UndoToast
              key={u.id}
              text={u.text}
              onUndo={() => undoDelete(u.id)}
              onDismiss={() => dismissUndo(u.id)}
            />
          ))}
        </div>
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
            {work ? (isOff ? "It's your day off today — enjoy the break." : `You're working today — ${work.label}.`) : "Loading your schedule…"}{" "}
            You have <span className="font-bold text-white">{activeReminders.length} reminder{activeReminders.length !== 1 ? "s" : ""}</span> open.
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

      {/* Quick stats */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-coral/12 text-coral">
            <Bell className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold">{activeReminders.length}</div>
          <div className="text-xs font-semibold text-ink/45">Reminders open</div>
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

      {/* Reminders — Apple Reminders sync */}
      <section className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Bell className="h-4 w-4 text-coral" /> Reminders
          </h2>
          <div className="flex items-center gap-2">
            {health && (
              <button
                onClick={() => setShowSettings((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-bold transition ${
                  health.available
                    ? "bg-[rgba(58,158,110,0.12)] text-[#3a9e6e] hover:bg-[rgba(58,158,110,0.2)]"
                    : "bg-red-50 text-red-500 hover:bg-red-100"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${health.available ? "bg-[#3a9e6e]" : "bg-red-400"}`} />
                {health.available ? health.list : "Unavailable"}
                <Settings className="h-3 w-3 opacity-60" />
              </button>
            )}
            {!remindersUnavailable && (
              <button
                onClick={() => setShowCompleted((v) => !v)}
                className={`text-[0.72rem] font-semibold transition ${showCompleted ? "text-coral" : "text-ink/35 hover:text-ink/60"}`}
              >
                {showCompleted ? "Hide done" : "Show done"}
              </button>
            )}
          </div>
        </div>

        {/* List settings panel */}
        {showSettings && (
          <div className="mb-3 rounded-2xl border border-ink/10 bg-[#f9f7f4] p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/40">Reminders List</p>
            <div className="flex gap-2">
              {availableLists.length > 0 ? (
                <div className="relative flex-1">
                  <select
                    value={listInput}
                    onChange={(e) => setListInput(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-ink/12 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coral focus:ring-2 focus:ring-coral/20"
                  >
                    {availableLists.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                </div>
              ) : (
                <input
                  value={listInput}
                  onChange={(e) => setListInput(e.target.value)}
                  placeholder="List name…"
                  className="min-w-0 flex-1 rounded-xl border border-ink/12 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coral focus:ring-2 focus:ring-coral/20"
                />
              )}
              <button
                onClick={saveList}
                disabled={savingList}
                className="cursor-pointer rounded-xl bg-coral px-4 py-2.5 text-sm font-bold text-white transition hover:bg-coral/85 disabled:opacity-50 active:scale-95"
              >
                {savingList ? "…" : "Save"}
              </button>
            </div>
            <p className="mt-2 text-[0.7rem] text-ink/40">
              Updates sync from Apple Reminders every 30s. Changes here are in-memory only — restart resets to &ldquo;Dashboard&rdquo;.
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
          {remindersUnavailable ? (
            <p className="py-3 text-center text-sm text-ink/35">
              Apple Reminders sync is only available on macOS (local dev).
            </p>
          ) : (
            <>
              <div className="mb-3 flex gap-2">
                <input
                  value={reminderInput}
                  onChange={(e) => setReminderInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addReminder()}
                  placeholder="Add a reminder…"
                  className="min-w-0 flex-1 rounded-xl border border-ink/12 bg-mist px-3 py-2.5 text-sm outline-none transition focus:border-coral focus:ring-2 focus:ring-coral/20"
                />
                <button onClick={addReminder} className="cursor-pointer rounded-xl bg-coral px-4 py-2.5 text-sm font-bold text-white transition hover:bg-coral/85 active:scale-95">
                  Add
                </button>
              </div>
              {activeReminders.length === 0 && !showCompleted ? (
                <p className="py-3 text-center text-sm text-ink/35">No reminders — add one above!</p>
              ) : (
                <ul className="space-y-1">
                  {activeReminders.map((reminder) => (
                    <li key={reminder.id} className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-mist">
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 cursor-pointer accent-coral"
                        onChange={() => checkOffReminder(reminder.id)}
                      />
                      <span className="flex-1 text-sm">{reminder.text}</span>
                      <button
                        onClick={() => removeReminderWithUndo(reminder.id, reminder.text)}
                        className="shrink-0 cursor-pointer text-ink/20 opacity-0 transition group-hover:opacity-100 hover:text-coral"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                  {showCompleted && completedReminders.length > 0 && (
                    <>
                      <li className="px-2 pt-2 text-[0.7rem] font-bold uppercase tracking-wider text-ink/30">
                        Completed
                      </li>
                      {completedReminders.map((reminder) => (
                        <li key={reminder.id} className="flex items-center gap-3 rounded-xl px-2 py-2 opacity-50">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-sage" />
                          <span className="flex-1 text-sm line-through">{reminder.text}</span>
                        </li>
                      ))}
                    </>
                  )}
                </ul>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
