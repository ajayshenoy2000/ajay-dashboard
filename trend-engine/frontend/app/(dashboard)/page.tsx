"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Briefcase, Calendar, CalendarClock, CheckCircle2,
  Clock, ListChecks, Plus, Sparkles, Sun, X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WeekDay {
  date: Date; dayNum: number; isToday: boolean;
  status: "work" | "off" | "unknown"; shift: string | null;
}
interface Todo { id: string; text: string; done: boolean }

// ── Work schedule (gviz) ──────────────────────────────────────────────────────

const SHEET_ID = "1v7eb4olwzKJnem0oJy0N1J3y9SY5_KNqNvFsqKuYV4Q";

function currentSheetName() {
  const n = new Date();
  return `${n.getFullYear()}/${String(n.getMonth() + 1).padStart(2, "0")}`;
}

function parseGvizRows(text: string): string[][] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("no json");
  const json = JSON.parse(match[0]);
  if (!json.table?.rows) throw new Error("no table");
  return json.table.rows.map((row: { c: ({ v: unknown } | null)[] } | null) =>
    (row?.c ?? []).map((cell) => (cell?.v != null ? String(cell.v).trim() : ""))
  );
}

function extractDayMap(rows: string[][]): Record<number, string> {
  const map: Record<number, string> = {};
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nameCol = row.indexOf("名前");
    if (nameCol === -1 || !row.includes("職種")) continue;
    for (let j = i + 1; j < rows.length; j++) {
      const r = rows[j];
      if (r.includes("名前") && r.includes("職種")) break;
      if (!r.includes("アジャイ")) continue;
      for (let c = nameCol + 1; c < row.length; c++) {
        const d = parseInt(row[c], 10);
        if (isNaN(d) || d < 1 || d > 31 || d in map) continue;
        map[d] = r[c] || "";
      }
      break;
    }
  }
  return map;
}

function shiftStatus(val: string | null): "work" | "off" {
  return val === "公休" ? "off" : "work";
}

function shiftLabel(val: string | null): string {
  if (!val) return "Work — L'or Clinic";
  if (val === "公休") return "Day Off";
  const loc = val.includes("CL") ? "Clinic" : val.includes("Wib") ? "Wibro" : "";
  const time = val.match(/\d+:\d+~\d+:\d+/)?.[0] ?? "";
  return loc ? `${loc} · ${time}` : val;
}

async function fetchWeekSchedule() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(currentSheetName())}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("fetch failed");
  const dayMap = extractDayMap(parseGvizRows(await res.text()));
  const today = new Date();
  const dow = today.getDay();
  const monOffset = dow === 0 ? -6 : 1 - dow;
  const week: WeekDay[] = Array.from({ length: 7 }, (_, d) => {
    const date = new Date(today);
    date.setDate(today.getDate() + monOffset + d);
    const dayNum = date.getDate();
    const val = date.getMonth() === today.getMonth() ? (dayMap[dayNum] ?? null) : null;
    return {
      date, dayNum,
      isToday: date.toDateString() === today.toDateString(),
      status: val === null ? "unknown" : shiftStatus(val),
      shift: val,
    };
  });
  const todayVal = dayMap[today.getDate()] ?? null;
  return {
    status: todayVal === null ? "unknown" : shiftStatus(todayVal),
    label: shiftLabel(todayVal),
    week,
  };
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("Good morning");
  const [timeStr, setTimeStr] = useState("");
  const [dateDay, setDateDay] = useState("");
  const [dateFull, setDateFull] = useState("");
  const [work, setWork] = useState<Awaited<ReturnType<typeof fetchWeekSchedule>> | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todosReady, setTodosReady] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Clock
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

  // Work schedule
  useEffect(() => {
    fetchWeekSchedule().then(setWork).catch(() => {});
  }, []);

  // Tasks (Apple Reminders via local server.py; graceful fallback on Vercel)
  useEffect(() => {
    fetch("/api/reminders")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { setTodos(data); setTodosReady(true); })
      .catch(() => setTodosReady(true));
  }, []);

  async function addTodo() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    inputRef.current?.focus();
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const item: Todo = await res.json();
      setTodos((prev) => [...prev, item]);
    } catch {
      setTodos((prev) => [...prev, { id: String(Date.now()), text, done: false }]);
    }
  }

  async function completeTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    fetch(`/api/reminders?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: true }),
    }).catch(() => {});
  }

  async function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    fetch(`/api/reminders?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }

  const isOff = work?.status === "off";

  return (
    <div className="pb-28">
      {/* Header */}
      <header className="mb-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-ink/40">
          {dateDay} · {timeStr}
        </p>
        <h1 className="text-3xl font-bold">
          {greeting}, <span className="text-coral">Ajay</span>
        </h1>
        <div className="mt-4 rounded-xl bg-ink p-5 text-white shadow-soft">
          <span className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gold">
            <Sparkles className="h-3.5 w-3.5" /> Daily brief
          </span>
          <p className="text-sm leading-6 text-white/85">
            {work
              ? isOff
                ? "It's your day off today — enjoy the break."
                : `You're working today — ${work.label}.`
              : "Loading your schedule…"}{" "}
            You have{" "}
            <span className="font-bold text-white">
              {todos.length} task{todos.length !== 1 ? "s" : ""}
            </span>{" "}
            open.
          </p>
        </div>
      </header>

      {/* Date + Work widget */}
      <section className="mb-4">
        <h2 className="mb-3 text-4xl font-extrabold leading-none">
          {dateDay}{" "}
          <span className="text-lg font-normal text-ink/40">{dateFull}</span>
        </h2>
        <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-soft">
          <div className="mb-4 flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isOff ? "bg-sage/15 text-sage" : "bg-coral/15 text-coral"}`}>
              {isOff ? <Sun className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/40">Work Status</p>
              <p className="font-bold">{work?.label ?? "Loading…"}</p>
            </div>
          </div>
          {work?.week && (
            <div className="grid grid-cols-7 gap-1">
              {work.week.map((day, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center rounded-lg py-2 text-xs font-semibold transition ${
                    day.isToday ? "bg-ink text-white" : "text-ink/55 hover:bg-mist"
                  }`}
                >
                  <span className="text-[10px] font-medium">{DAY_LABELS[i]}</span>
                  <span className="my-0.5 text-sm font-bold">{day.dayNum}</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    day.status === "work" ? "bg-coral" :
                    day.status === "off"  ? "bg-sage"  : "bg-ink/20"
                  }`} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick stats */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-soft">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-coral/15 text-coral">
            <ListChecks className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold">{todos.length}</div>
          <div className="text-xs font-semibold text-ink/50">Tasks open</div>
        </div>
        <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-soft">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-ink/8 text-ink/60">
            <Clock className="h-4 w-4" />
          </div>
          <div className="tabular-nums text-2xl font-bold">{timeStr}</div>
          <div className="text-xs font-semibold text-ink/50">Local time</div>
        </div>
      </div>

      {/* App grid */}
      <section className="mb-4">
        <h2 className="mb-3 text-base font-bold">Your Apps</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/trends" className="group rounded-xl bg-ink p-4 text-white shadow-soft transition hover:-translate-y-0.5">
            <Sparkles className="mb-3 h-6 w-6 text-gold" />
            <div className="font-bold">Trend Intelligence</div>
            <div className="mt-0.5 text-xs text-white/55">Analyse and summarise trends</div>
          </Link>
          <Link href="/schedule" className="group rounded-xl bg-ink p-4 text-white shadow-soft transition hover:-translate-y-0.5">
            <CalendarClock className="mb-3 h-6 w-6 text-gold" />
            <div className="font-bold">Work Schedule</div>
            <div className="mt-0.5 text-xs text-white/55">Auto-synced shift calendar</div>
          </Link>
          <Link href="/calendar-app" className="group rounded-xl border border-ink/10 bg-white p-4 shadow-soft transition hover:-translate-y-0.5">
            <Calendar className="mb-3 h-6 w-6 text-sage" />
            <div className="font-bold">Calendar</div>
            <div className="mt-0.5 text-xs text-ink/50">Live Google Calendar feed</div>
          </Link>
          <div className="rounded-xl border border-dashed border-ink/20 p-4 text-ink/30">
            <Plus className="mb-3 h-6 w-6" />
            <div className="font-bold text-ink/40">Add App</div>
            <div className="mt-0.5 text-xs">Coming soon</div>
          </div>
        </div>
      </section>

      {/* Tasks */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
          <CheckCircle2 className="h-4 w-4 text-sage" /> My Tasks
        </h2>
        <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-soft">
          <div className="mb-3 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTodo()}
              placeholder="What needs doing?"
              className="min-w-0 flex-1 rounded-lg border border-ink/15 bg-mist px-3 py-2 text-sm outline-none focus:border-coral focus:ring-1 focus:ring-coral/30"
            />
            <button
              onClick={addTodo}
              className="rounded-lg bg-coral px-4 py-2 text-sm font-bold text-white transition hover:bg-coral/85"
            >
              Add
            </button>
          </div>

          {!todosReady ? (
            <p className="py-3 text-center text-sm text-ink/40">Loading from Reminders…</p>
          ) : todos.length === 0 ? (
            <p className="py-3 text-center text-sm text-ink/40">No tasks yet — add one above!</p>
          ) : (
            <ul className="space-y-1">
              {todos.map((todo) => (
                <li key={todo.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-mist">
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-coral"
                    onChange={() => completeTodo(todo.id)}
                  />
                  <span className="flex-1 text-sm">{todo.text}</span>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="shrink-0 text-ink/25 transition hover:text-coral"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
