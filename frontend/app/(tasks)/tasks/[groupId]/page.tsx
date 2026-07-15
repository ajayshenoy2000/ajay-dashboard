"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { TaskComposer } from "@/components/tasks/TaskComposer";
import { TaskItem } from "@/components/tasks/TaskItem";
import * as tasksApi from "@/lib/tasks/api";
import type { Task, TaskGroup } from "@/lib/tasks/types";

export default function TaskGroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<TaskGroup | null>(null);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [g, t] = await Promise.all([tasksApi.listGroups(), tasksApi.listTasks({ groupId })]);
    setGroups(g);
    setGroup(g.find((x) => x.id === groupId) ?? null);
    setTasks(t);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

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

  async function handleDeleteGroup() {
    await tasksApi.deleteGroup(groupId);
    router.push("/tasks");
  }

  return (
    <div>
      <Link href="/tasks" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-ink/40 hover:text-ink/60">
        <ArrowLeft className="h-3.5 w-3.5" /> All tasks
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{group?.name ?? "Group"}</h1>
        {group && (
          <button
            onClick={handleDeleteGroup}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-ink/30 transition hover:bg-coral/10 hover:text-coral"
            aria-label="Delete group"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mb-5">
        <TaskComposer groups={groups} defaultGroupId={groupId} onCreate={async (input) => { await tasksApi.createTask(input); refresh(); }} />
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
            <p className="text-sm font-semibold text-ink/40">Nothing here yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
