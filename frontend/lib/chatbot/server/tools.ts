import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTopTrends, getTrendHistory, getBriefs } from "@/lib/trend-engine/server/service";
import { getSummary, getAdsView } from "@/lib/metascraper/server/service";
import { fetchWeekSchedule } from "@/lib/schedule";
import { listTasks } from "@/lib/tasks/server/service";
import { getDataAccess } from "./dataAccess";

// Read-only tools only — no tool here ever mutates data. Each is gated behind
// the caller's chatbot_data_access row (see Phase 7 of the overhaul plan);
// only tools the user has explicitly turned on are included in the returned
// set, so a model can't even attempt to call a disabled one.
//
// `db` is the RLS-scoped per-user client used to read the data-access toggles.
// The tool executors themselves read the other sub-apps' data through those
// apps' service-role service layers, so they require SUPABASE_SERVICE_KEY at
// runtime (present in deployed envs); when it's absent they degrade to empty
// results rather than erroring.
export async function buildToolsForUser(db: SupabaseClient, userId: string): Promise<ToolSet> {
  const access = await getDataAccess(db, userId);
  const tools: ToolSet = {};

  if (access.trendEngine) {
    tools.getTrends = tool({
      description: "Get today's top trending topics from the Trend Engine, with scores and summaries.",
      inputSchema: z.object({}),
      execute: async () => {
        const trends = await getTopTrends(userId, 20);
        return trends.map((t) => ({
          keyword: t.keyword, title: t.title, summary: t.summary,
          score: t.score?.total ?? null, hasBrief: t.hasBrief,
        }));
      },
    });
    tools.getTrendHistory = tool({
      description: "Get historical trends from past searches (not just today's).",
      inputSchema: z.object({ limit: z.number().int().min(1).max(100).default(50) }),
      execute: async ({ limit }) => {
        const trends = await getTrendHistory(userId, limit);
        return trends.map((t) => ({ keyword: t.keyword, title: t.title, summary: t.summary, createdAt: t.createdAt }));
      },
    });
    tools.getBriefs = tool({
      description: "Get generated video briefs (script outlines) for trending topics.",
      inputSchema: z.object({}),
      execute: async () => {
        const briefs = await getBriefs(userId);
        return briefs.map((b) => ({ title: b.titleOptions[0], hook: b.hook, cta: b.cta }));
      },
    });
  }

  if (access.metascraper) {
    tools.getMetaScraperSummary = tool({
      description: "Get a summary of tracked competitor Meta ads: totals, per-niche breakdown, proven/killed counts.",
      inputSchema: z.object({}),
      execute: async () => getSummary(userId),
    });
    tools.getMetaScraperAds = tool({
      description: "Get the list of tracked competitor Meta ads with status (new/running/killed) and longevity.",
      inputSchema: z.object({}),
      execute: async () => {
        const ads = await getAdsView(userId);
        return ads.slice(0, 50);
      },
    });
  }

  if (access.schedule) {
    tools.getWorkSchedule = tool({
      description: "Get this week's work schedule (which days are work vs. day off).",
      inputSchema: z.object({}),
      execute: async () => {
        const week = await fetchWeekSchedule();
        return {
          today: { status: week.status, label: week.label },
          week: week.week.map((d) => ({ date: d.date.toISOString().slice(0, 10), status: d.status, shift: d.shift })),
        };
      },
    });
  }

  if (access.tasks) {
    tools.getTasks = tool({
      description: "Get the user's open tasks, including subtasks, due dates, and which group/project they belong to.",
      inputSchema: z.object({}),
      execute: async () => {
        const tasks = await listTasks(userId, { includeDone: false });
        const flatten = (list: typeof tasks): unknown[] =>
          list.flatMap((t) => [
            { title: t.title, dueAt: t.dueAt, groupId: t.groupId, recurring: Boolean(t.recurrenceRule) },
            ...flatten(t.subtasks),
          ]);
        return flatten(tasks);
      },
    });
  }

  return tools;
}
