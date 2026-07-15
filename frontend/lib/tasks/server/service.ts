import { getDb } from "./db";
import { nextOccurrence } from "./recurrence";
import type { CreateTaskInput, Task, TaskGroup, UpdateTaskInput } from "../types";

function groupFromRow(row: Record<string, unknown>): TaskGroup {
  return {
    id: row.id as string,
    name: row.name as string,
    color: (row.color as string) ?? null,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
  };
}

function taskFromRow(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    groupId: (row.group_id as string) ?? null,
    parentTaskId: (row.parent_task_id as string) ?? null,
    title: row.title as string,
    notes: (row.notes as string) ?? null,
    status: row.status as Task["status"],
    dueAt: (row.due_at as string) ?? null,
    recurrenceRule: (row.recurrence_rule as string) ?? null,
    reminderAt: (row.reminder_at as string) ?? null,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
    completedAt: (row.completed_at as string) ?? null,
    subtasks: [],
  };
}

function nestSubtasks(tasks: Task[]): Task[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const roots: Task[] = [];
  for (const t of tasks) {
    if (t.parentTaskId && byId.has(t.parentTaskId)) {
      byId.get(t.parentTaskId)!.subtasks.push(t);
    } else {
      roots.push(t);
    }
  }
  return roots;
}

// ─── Groups ───────────────────────────────────────────────────────────────

export async function listGroups(userId: string): Promise<TaskGroup[]> {
  const db = getDb();
  if (!db) return [];
  const { data } = await db.from("task_groups").select("*").eq("user_id", userId).order("sort_order");
  return (data ?? []).map(groupFromRow);
}

export async function createGroup(userId: string, name: string, color?: string | null): Promise<TaskGroup> {
  const db = getDb();
  if (!db) throw new Error("Database not configured");
  const { data, error } = await db
    .from("task_groups")
    .insert({ user_id: userId, name, color: color ?? null })
    .select("*")
    .single();
  if (error) throw new Error(`task_groups insert failed: ${error.message}`);
  return groupFromRow(data);
}

export async function deleteGroup(userId: string, groupId: string): Promise<void> {
  const db = getDb();
  if (db) await db.from("task_groups").delete().eq("user_id", userId).eq("id", groupId);
}

// ─── Tasks ────────────────────────────────────────────────────────────────

export async function listTasks(
  userId: string,
  opts: { groupId?: string; includeDone?: boolean } = {},
): Promise<Task[]> {
  const db = getDb();
  if (!db) return [];
  let q = db.from("tasks").select("*").eq("user_id", userId).order("sort_order").order("created_at");
  if (opts.groupId) q = q.eq("group_id", opts.groupId);
  if (!opts.includeDone) q = q.eq("status", "open");
  const { data } = await q;
  return nestSubtasks((data ?? []).map(taskFromRow));
}

export async function getUpcomingTasks(userId: string, limit = 10): Promise<Task[]> {
  const db = getDb();
  if (!db) return [];
  const { data } = await db
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "open")
    .not("due_at", "is", null)
    .order("due_at")
    .limit(limit);
  return (data ?? []).map(taskFromRow);
}

export async function getTask(userId: string, id: string): Promise<Task | null> {
  const db = getDb();
  if (!db) return null;
  const { data } = await db.from("tasks").select("*").eq("user_id", userId).eq("id", id).limit(1);
  if (!data?.length) return null;
  return taskFromRow(data[0]);
}

function taskInputToRow(input: CreateTaskInput | UpdateTaskInput): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("title" in input && input.title !== undefined) row.title = input.title;
  if ("notes" in input) row.notes = input.notes ?? null;
  if ("groupId" in input) row.group_id = input.groupId ?? null;
  if ("parentTaskId" in input) row.parent_task_id = input.parentTaskId ?? null;
  if ("dueAt" in input) row.due_at = input.dueAt ?? null;
  if ("recurrenceRule" in input) row.recurrence_rule = input.recurrenceRule ?? null;
  if ("reminderAt" in input) row.reminder_at = input.reminderAt ?? null;
  if ("status" in input && input.status !== undefined) row.status = input.status;
  return row;
}

export async function createTask(userId: string, input: CreateTaskInput): Promise<Task> {
  const db = getDb();
  if (!db) throw new Error("Database not configured");
  const { data, error } = await db
    .from("tasks")
    .insert({ user_id: userId, title: input.title, ...taskInputToRow(input) })
    .select("*")
    .single();
  if (error) throw new Error(`tasks insert failed: ${error.message}`);
  return taskFromRow(data);
}

export async function updateTask(userId: string, id: string, patch: UpdateTaskInput): Promise<Task | null> {
  const db = getDb();
  if (!db) return null;
  const { data, error } = await db
    .from("tasks")
    .update(taskInputToRow(patch))
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return null;
  return taskFromRow(data);
}

export async function deleteTask(userId: string, id: string): Promise<void> {
  const db = getDb();
  if (db) await db.from("tasks").delete().eq("user_id", userId).eq("id", id);
}

// Marks a task done and, if it recurs, creates the next occurrence (same
// group/parent/notes/recurrence rule, new due date, fresh reminder offset
// from due date by the same lead time as the original).
export async function completeTask(userId: string, id: string): Promise<Task | null> {
  const db = getDb();
  if (!db) return null;
  const task = await getTask(userId, id);
  if (!task) return null;

  const now = new Date().toISOString();
  const { data, error } = await db
    .from("tasks")
    .update({ status: "done", completed_at: now })
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return null;
  const completed = taskFromRow(data);

  if (task.recurrenceRule) {
    const baseline = task.dueAt ? new Date(task.dueAt) : new Date();
    const next = nextOccurrence(task.recurrenceRule, baseline);
    if (next) {
      const leadMs = task.dueAt && task.reminderAt ? new Date(task.dueAt).getTime() - new Date(task.reminderAt).getTime() : null;
      await db.from("tasks").insert({
        user_id: userId,
        group_id: task.groupId,
        parent_task_id: null,
        title: task.title,
        notes: task.notes,
        due_at: next.toISOString(),
        recurrence_rule: task.recurrenceRule,
        recurrence_parent_id: task.id,
        reminder_at: leadMs != null ? new Date(next.getTime() - leadMs).toISOString() : null,
        sort_order: task.sortOrder,
      });
    }
  }

  return completed;
}

// ─── Cron target (Phase 5) ──────────────────────────────────────────────────
// Not scoped to a single user — this runs as a background job under the
// service-role key, across every user's due reminders.

export async function getDueReminders(): Promise<Array<{ id: string; userId: string; title: string; dueAt: string | null }>> {
  const db = getDb();
  if (!db) return [];
  const { data } = await db
    .from("tasks")
    .select("id, user_id, title, due_at")
    .eq("reminder_sent", false)
    .not("reminder_at", "is", null)
    .lte("reminder_at", new Date().toISOString());
  return (data ?? []).map((r) => ({ id: r.id, userId: r.user_id, title: r.title, dueAt: r.due_at }));
}

export async function markReminderSent(id: string): Promise<void> {
  const db = getDb();
  if (db) await db.from("tasks").update({ reminder_sent: true }).eq("id", id);
}
