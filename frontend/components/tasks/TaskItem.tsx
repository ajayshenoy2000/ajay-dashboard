"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Repeat, Trash2 } from "lucide-react";
import { SwipeableRow } from "@/components/SwipeableRow";
import { haptic } from "@/lib/haptics";
import type { Task } from "@/lib/tasks/types";

function dueLabel(dueAt: string | null): string | null {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return `Today ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function TaskItem({
  task,
  depth = 0,
  onComplete,
  onDelete,
}: {
  task: Task;
  depth?: number;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasSubtasks = task.subtasks.length > 0;
  const due = dueLabel(task.dueAt);

  function complete() {
    haptic(10);
    onComplete(task.id);
  }

  function remove() {
    haptic(10);
    onDelete(task.id);
  }

  return (
    <div className={depth > 0 ? "ml-6 border-l border-ink/8 pl-3" : ""}>
      <SwipeableRow onComplete={complete} onDelete={remove}>
        <div className="group flex items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-mist active:scale-[0.99]">
          {hasSubtasks ? (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex h-5 w-5 shrink-0 items-center justify-center text-ink/30"
              aria-label={expanded ? "Collapse subtasks" : "Expand subtasks"}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}

          <button
            onClick={complete}
            aria-label="Complete task"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-ink/20 text-transparent transition hover:border-sage hover:bg-sage/10 hover:text-sage active:scale-90"
          >
            <Check className="h-3.5 w-3.5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{task.title}</p>
            {(due || task.recurrenceRule) && (
              <div className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold text-ink/40">
                {due && <span>{due}</span>}
                {task.recurrenceRule && <Repeat className="h-3 w-3" />}
              </div>
            )}
          </div>

          <button
            onClick={remove}
            aria-label="Delete task"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink/25 opacity-0 transition hover:bg-coral/10 hover:text-coral group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </SwipeableRow>

      {hasSubtasks && expanded && (
        <div className="space-y-0.5">
          {task.subtasks.map((sub) => (
            <TaskItem key={sub.id} task={sub} depth={depth + 1} onComplete={onComplete} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
