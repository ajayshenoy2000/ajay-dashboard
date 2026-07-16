"use client";

import { useEffect, useState } from "react";
import { Link } from "next-view-transitions";
import { Sparkles, Briefcase, Sun, ListChecks, BellRing, MessageSquareText } from "lucide-react";
import { fetchWeekSchedule } from "@/lib/schedule";
import * as tasksApi from "@/lib/tasks/api";
import * as chatbotApi from "@/lib/chatbot/api";
import type { Task } from "@/lib/tasks/types";

interface Status {
  work: { off: boolean; label: string } | null;
  dueToday: number;
  overdue: number;
  nextReminder: { title: string; at: string } | null;
  conversations: number;
}

function flatten(tasks: Task[]): Task[] {
  return tasks.flatMap((t) => [t, ...flatten(t.subtasks)]);
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

// AI-styled "today at a glance" digest that pulls together the whole dashboard:
// work schedule, tasks due/overdue, the next reminder, and Mio activity.
// The lead line is composed from the aggregated signals so it always reflects
// live state without a per-load model call.
export function StatusBar() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [work, tasks, convos] = await Promise.all([
        fetchWeekSchedule().then((w) => ({ off: w.status === "off", label: w.label })).catch(() => null),
        tasksApi.listTasks().then(flatten).catch(() => [] as Task[]),
        chatbotApi.listConversations().catch(() => []),
      ]);
      if (!alive) return;

      const now = new Date();
      const withDue = tasks.filter((t) => t.dueAt);
      const dueToday = withDue.filter((t) => isSameDay(new Date(t.dueAt!), now)).length;
      const overdue = withDue.filter((t) => new Date(t.dueAt!) < now && !isSameDay(new Date(t.dueAt!), now)).length;
      const reminders = tasks
        .filter((t) => t.reminderAt && new Date(t.reminderAt) >= now)
        .sort((a, b) => new Date(a.reminderAt!).getTime() - new Date(b.reminderAt!).getTime());

      setStatus({
        work,
        dueToday,
        overdue,
        nextReminder: reminders[0] ? { title: reminders[0].title, at: reminders[0].reminderAt! } : null,
        conversations: convos.length,
      });
    })();
    return () => { alive = false; };
  }, []);

  const lead = buildLead(status);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-ink p-5 text-white shadow-[0_10px_36px_rgba(24,33,31,0.24)]">
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-40"
        style={{ background: "radial-gradient(circle, #c69a48 0%, transparent 70%)", animation: "floatGlow 8s ease-in-out infinite" }}
      />
      <div className="relative mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gold">
        <Sparkles className="h-3.5 w-3.5" /> Today at a glance
      </div>
      <p className="relative mb-4 text-[15px] font-semibold leading-6 text-white/90">{lead}</p>

      <div className="relative flex flex-wrap gap-2">
        {status?.work && (
          <Chip icon={status.work.off ? Sun : Briefcase} tone={status.work.off ? "sage" : "coral"}>
            {status.work.off ? "Day off" : status.work.label}
          </Chip>
        )}
        {status && (status.dueToday > 0 || status.overdue > 0) && (
          <Link href="/tasks">
            <Chip icon={ListChecks} tone="gold">
              {status.overdue > 0 ? `${status.overdue} overdue` : `${status.dueToday} due today`}
            </Chip>
          </Link>
        )}
        {status?.nextReminder && (
          <Chip icon={BellRing} tone="coral">
            {reminderLabel(status.nextReminder.at)}
          </Chip>
        )}
        {status && status.conversations > 0 && (
          <Link href="/chat">
            <Chip icon={MessageSquareText} tone="sage">
              {status.conversations} chat{status.conversations === 1 ? "" : "s"}
            </Chip>
          </Link>
        )}
      </div>
    </div>
  );
}

function Chip({ icon: Icon, tone, children }: { icon: typeof Sun; tone: "sage" | "coral" | "gold"; children: React.ReactNode }) {
  const colors = {
    sage: "text-[#9fc4b1]",
    coral: "text-[#f0a08f]",
    gold: "text-[#e3c98a]",
  };
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/90 backdrop-blur-sm">
      <Icon className={`h-3.5 w-3.5 ${colors[tone]}`} />
      {children}
    </span>
  );
}

function buildLead(s: Status | null): string {
  if (!s) return "Pulling together your day…";
  const parts: string[] = [];
  if (s.work) parts.push(s.work.off ? "You're off today" : "You're working today");
  if (s.overdue > 0) parts.push(`${s.overdue} task${s.overdue === 1 ? "" : "s"} overdue`);
  else if (s.dueToday > 0) parts.push(`${s.dueToday} task${s.dueToday === 1 ? "" : "s"} due`);
  else parts.push("no tasks due");
  if (s.nextReminder) parts.push(`next reminder ${reminderLabel(s.nextReminder.at).toLowerCase()}`);
  const sentence = parts.join(", ") + ".";
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function reminderLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (isSameDay(d, now)) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
