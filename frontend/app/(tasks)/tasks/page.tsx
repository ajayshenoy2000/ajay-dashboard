"use client";

import { useEffect, useState } from "react";
import { Link } from "next-view-transitions";
import { Plus } from "lucide-react";
import { TaskComposer } from "@/components/tasks/TaskComposer";
import { TaskItem } from "@/components/tasks/TaskItem";
import { PullToRefresh } from "@/components/PullToRefresh";
import * as tasksApi from "@/lib/tasks/api";
import type { Task, TaskGroup } from "@/lib/tasks/types";

export default function TasksPage() {
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  async function refresh() {
    const [g, t] = await Promise.all([tasksApi.listGroups(), tasksApi.listTasks()]);
    setGroups(g);
    setTasks(t);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(input: Parameters<typeof tasksApi.createTask>[0]) {
    await tasksApi.createTask(input);
    await refresh();
  }

  async function handleComplete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await tasksApi.completeTask(id);
    } finally {
      refresh();
    }
  }

  async function handleDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await tasksApi.deleteTask(id);
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await tasksApi.createGroup(newGroupName.trim());
    setNewGroupName("");
    setAddingGroup(false);
    refresh();
  }

  return (
    <PullToRefresh onRefresh={refresh}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Tasks</h1>
        <p className="mt-1 text-sm text-ink/50">Everything on your plate, in one place.</p>
      </div>

      {/* Group chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/tasks/${g.id}`}
            className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs font-bold text-ink/70 shadow-soft transition hover:border-ink/20"
          >
            {g.name}
          </Link>
        ))}
        {addingGroup ? (
          <form onSubmit={handleCreateGroup} className="flex items-center gap-1">
            <input
              autoFocus
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onBlur={() => !newGroupName && setAddingGroup(false)}
              placeholder="Group name"
              className="min-h-8 rounded-full border border-ink/10 bg-mist px-3 text-xs font-bold outline-none focus:border-sage"
            />
          </form>
        ) : (
          <button
            onClick={() => setAddingGroup(true)}
            className="flex items-center gap-1 rounded-full border border-dashed border-ink/15 px-3 py-1.5 text-xs font-bold text-ink/40 transition hover:border-ink/30 hover:text-ink/60"
          >
            <Plus className="h-3 w-3" /> Group
          </button>
        )}
      </div>

      <div className="mb-5">
        <TaskComposer groups={groups} onCreate={handleCreate} />
      </div>

      <div className="space-y-1">
        {loading ? (
          <p className="text-sm text-ink/40">Loading…</p>
        ) : tasks.length ? (
          tasks.map((t) => (
            <TaskItem key={t.id} task={t} onComplete={handleComplete} onDelete={handleDelete} />
          ))
        ) : (
          <div className="rounded-xl border border-ink/10 bg-white px-6 py-10 text-center shadow-soft">
            <p className="text-sm font-semibold text-ink/40">Nothing on your list.</p>
            <p className="mt-1 text-xs text-ink/30">Add a task above to get started.</p>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
