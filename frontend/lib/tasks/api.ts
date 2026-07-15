import { authFetch } from "../authFetch";
import type { CreateTaskInput, Task, TaskGroup, UpdateTaskInput } from "./types";

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await authFetch(path, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export function listTasks(opts: { groupId?: string; includeDone?: boolean } = {}): Promise<Task[]> {
  const params = new URLSearchParams();
  if (opts.groupId) params.set("groupId", opts.groupId);
  if (opts.includeDone) params.set("includeDone", "true");
  const qs = params.toString();
  return getJson<Task[]>(`/api/tasks${qs ? `?${qs}` : ""}`, []);
}

export function listGroups(): Promise<TaskGroup[]> {
  return getJson<TaskGroup[]>("/api/tasks/groups", []);
}

export async function createGroup(name: string, color?: string | null): Promise<TaskGroup> {
  const res = await authFetch("/api/tasks/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to create group");
  return res.json();
}

export async function deleteGroup(id: string): Promise<void> {
  const res = await authFetch(`/api/tasks/groups/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete group");
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const res = await authFetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to create task");
  return res.json();
}

export async function updateTask(id: string, patch: UpdateTaskInput): Promise<Task> {
  const res = await authFetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to update task");
  return res.json();
}

export async function completeTask(id: string): Promise<Task> {
  const res = await authFetch(`/api/tasks/${id}/complete`, { method: "POST" });
  if (!res.ok) throw new Error((await res.text()) || "Failed to complete task");
  return res.json();
}

export async function deleteTask(id: string): Promise<void> {
  const res = await authFetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete task");
}
