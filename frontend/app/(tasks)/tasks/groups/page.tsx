"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderKanban, Plus, Trash2 } from "lucide-react";
import * as tasksApi from "@/lib/tasks/api";
import type { TaskGroup } from "@/lib/tasks/types";

export default function TaskGroupsPage() {
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setGroups(await tasksApi.listGroups());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await tasksApi.createGroup(name.trim());
    setName("");
    refresh();
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setGroups((prev) => prev.filter((g) => g.id !== id));
    await tasksApi.deleteGroup(id);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Groups</h1>
        <p className="mt-1 text-sm text-ink/50">Organize tasks into projects like Marketing or CRM.</p>
      </div>

      <form onSubmit={handleCreate} className="mb-5 flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New group name…"
          className="min-h-11 flex-1 rounded-xl border border-ink/10 bg-white px-3 text-sm font-semibold shadow-soft outline-none focus:border-sage"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coral text-white disabled:cursor-not-allowed disabled:bg-ink/20"
        >
          <Plus className="h-4 w-4" />
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-ink/40">Loading…</p>
      ) : groups.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/tasks/${g.id}`}
              className="group flex items-center justify-between rounded-2xl border border-ink/10 bg-white p-4 shadow-soft transition hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage/12 text-sage">
                  <FolderKanban className="h-4 w-4" />
                </div>
                <span className="font-bold text-ink/80">{g.name}</span>
              </div>
              <button
                onClick={(e) => handleDelete(g.id, e)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink/25 opacity-0 transition hover:bg-coral/10 hover:text-coral group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-ink/10 bg-white px-6 py-10 text-center shadow-soft">
          <p className="text-sm font-semibold text-ink/40">No groups yet.</p>
        </div>
      )}
    </div>
  );
}
