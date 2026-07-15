"use client";

import { useState } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import type { TaskGroup } from "@/lib/tasks/types";

const RECURRENCE_OPTIONS = [
  { label: "Does not repeat", value: "" },
  { label: "Daily", value: "FREQ=DAILY" },
  { label: "Weekly", value: "FREQ=WEEKLY" },
  { label: "Monthly", value: "FREQ=MONTHLY" },
];

export function TaskComposer({
  groups,
  defaultGroupId,
  onCreate,
}: {
  groups: TaskGroup[];
  defaultGroupId?: string;
  onCreate: (input: {
    title: string;
    groupId: string | null;
    dueAt: string | null;
    reminderAt: string | null;
    recurrenceRule: string | null;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [groupId, setGroupId] = useState(defaultGroupId ?? "");
  const [dueAt, setDueAt] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [recurrenceRule, setRecurrenceRule] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await onCreate({
        title: title.trim(),
        groupId: groupId || null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        reminderAt: reminderAt ? new Date(reminderAt).toISOString() : null,
        recurrenceRule: recurrenceRule || null,
      });
      setTitle("");
      setDueAt("");
      setReminderAt("");
      setRecurrenceRule("");
      setShowOptions(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-ink/10 bg-white p-3 shadow-soft">
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task…"
          className="min-h-11 flex-1 rounded-xl border border-ink/10 bg-mist px-3 text-sm font-semibold outline-none focus:border-sage"
        />
        <button
          type="button"
          onClick={() => setShowOptions((s) => !s)}
          aria-label="More options"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${showOptions ? "bg-ink text-white" : "bg-mist text-ink/50"}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <button
          type="submit"
          disabled={!title.trim() || busy}
          aria-label="Add task"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coral text-white disabled:cursor-not-allowed disabled:bg-ink/20"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {showOptions && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-ink/8 pt-3">
          <label className="col-span-2 block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">Group</span>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-ink/10 bg-mist px-2 text-sm font-semibold"
            >
              <option value="">No group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">Due</span>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-ink/10 bg-mist px-2 text-sm font-semibold"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">Remind me</span>
            <input
              type="datetime-local"
              value={reminderAt}
              onChange={(e) => setReminderAt(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-ink/10 bg-mist px-2 text-sm font-semibold"
            />
          </label>
          <label className="col-span-2 block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/40">Repeat</span>
            <select
              value={recurrenceRule}
              onChange={(e) => setRecurrenceRule(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-ink/10 bg-mist px-2 text-sm font-semibold"
            >
              {RECURRENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
      )}
    </form>
  );
}
