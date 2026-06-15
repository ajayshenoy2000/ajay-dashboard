"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Briefcase, Calendar, CalendarClock, CheckCircle2,
  Clock, ListChecks, Plus, Sparkles, Sun, X,
} from "lucide-react";
import { fetchWeekSchedule, type WeekDay } from "@/lib/schedule";

interface Todo { id: string; text: string }

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const STORAGE_KEY = "dashboard_todos";

function loadTodos(): Todo[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function saveTodos(todos: Todo[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("Good morning");
  const [timeStr, setTimeStr] = useState("");
  const [dateDay, setDateDay] = useState("");
  const [dateFull, setDateFull] = useState("");
  const [work, setWork] = useState<Awaited<ReturnType<typeof fetchWeekSchedule>> | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
  useEffect(() => { setTodos(loadTodos()); }, []);

  function addTodo() {
    const text = input.trim();
    if (!text) return;
    const next = [...todos, { id: `${Date.now()}-${Math.random()}`, text }];
    setTodos(next); saveTodos(next);
    setInput(""); inputRef.current?.focus();
  }

  function deleteTodo(id: string) {
    const next = todos.filter((t) => t.id !== id);
    setTodos(next); saveTodos(next);
  }

  const isOff = work?.status === "off";

  return (
    <div className="pb-10">
      <header className="mb-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-ink/40">
          {dateDay} · {timeStr}
        </p>
        <h1 className="text-3xl font-bold">
          {greeting}, <span className="text-coral">Ajay</span>
        </h1>
        {/* Hero brief card */}
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
            You have <span className="font-bold text-white">{todos.length} task{todos.length !== 1 ? "s" : ""}</span> open.
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
                <div key={i} className={`flex flex-col items-center rounded-xl py-2 text-xs transition-all duration-150 ${day.isToday ? "bg-ink text-white" : "text-ink/50 hover:bg-mist"}`}>
                  <span className="text-[9px] font-semibold uppercase tracking-wide opacity-60">{DAY_LABELS[i]}</span>
                  <span className="my-0.5 text-sm font-bold">{day.dayNum}</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${day.status === "work" ? "bg-coral" : day.status === "off" ? "bg-sage" : "bg-ink/15"}`} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick stats */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-coral/12 text-coral">
            <ListChecks className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold">{todos.length}</div>
          <div className="text-xs font-semibold text-ink/45">Tasks open</div>
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
          <div className="rounded-2xl border border-dashed border-ink/15 p-4 text-ink/25">
            <Plus className="mb-3 h-6 w-6" />
            <div className="font-semibold text-ink/35">Add App</div>
            <div className="mt-0.5 text-xs">Coming soon</div>
          </div>
        </div>
      </section>

      {/* Tasks — localStorage, no server */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
          <CheckCircle2 className="h-4 w-4 text-sage" /> My Tasks
        </h2>
        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
          <div className="mb-3 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTodo()}
              placeholder="What needs doing?"
              className="min-w-0 flex-1 rounded-xl border border-ink/12 bg-mist px-3 py-2.5 text-sm outline-none transition focus:border-coral focus:ring-2 focus:ring-coral/20"
            />
            <button onClick={addTodo} className="cursor-pointer rounded-xl bg-coral px-4 py-2.5 text-sm font-bold text-white transition hover:bg-coral/85 active:scale-95">
              Add
            </button>
          </div>
          {todos.length === 0 ? (
            <p className="py-3 text-center text-sm text-ink/35">No tasks — add one above!</p>
          ) : (
            <ul className="space-y-1">
              {todos.map((todo) => (
                <li key={todo.id} className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-mist">
                  <input type="checkbox" className="h-4 w-4 shrink-0 cursor-pointer accent-coral" onChange={() => deleteTodo(todo.id)} />
                  <span className="flex-1 text-sm">{todo.text}</span>
                  <button onClick={() => deleteTodo(todo.id)} className="shrink-0 cursor-pointer text-ink/20 opacity-0 transition group-hover:opacity-100 hover:text-coral">
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
