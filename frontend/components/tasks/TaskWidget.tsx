"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckSquare, Plus } from "lucide-react";
import * as tasksApi from "@/lib/tasks/api";
import type { Task } from "@/lib/tasks/types";

function flatten(tasks: Task[]): Task[] {
  return tasks.flatMap((t) => [t, ...flatten(t.subtasks)]);
}

export function TaskWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [quickAdd, setQuickAdd] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const all = await tasksApi.listTasks();
    setTasks(flatten(all).slice(0, 5));
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    const title = quickAdd.trim();
    setQuickAdd("");
    await tasksApi.createTask({ title });
    refresh();
  }

  async function handleComplete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await tasksApi.completeTask(id).catch(() => {});
  }

  return (
    <section className="mb-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold">Tasks</h2>
        <Link href="/tasks" className="text-xs font-bold text-ink/40 hover:text-ink/60">View all</Link>
      </div>
      <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
        <form onSubmit={handleQuickAdd} className="mb-3 flex items-center gap-2">
          <input
            value={quickAdd}
            onChange={(e) => setQuickAdd(e.target.value)}
            placeholder="Quick add a task…"
            className="min-h-10 flex-1 rounded-xl border border-ink/10 bg-mist px-3 text-sm font-semibold outline-none focus:border-sage"
          />
          <button
            type="submit"
            disabled={!quickAdd.trim()}
            aria-label="Add task"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral text-white disabled:cursor-not-allowed disabled:bg-ink/20"
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>

        {loading ? (
          <p className="text-xs text-ink/35">Loading…</p>
        ) : tasks.length ? (
          <div className="space-y-1.5">
            {tasks.map((t) => (
              <button
                key={t.id}
                onClick={() => handleComplete(t.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-mist active:scale-[0.99]"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-ink/20" />
                <span className="truncate text-sm font-semibold text-ink/80">{t.title}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2 text-xs font-semibold text-ink/35">
            <CheckSquare className="h-3.5 w-3.5" /> All caught up.
          </div>
        )}
      </div>
    </section>
  );
}
