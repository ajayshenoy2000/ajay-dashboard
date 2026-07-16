import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateAndSaveBrief, getTopTrends, getTrendHistory, getBriefs, runSearch, setTopicStatus } from "@/lib/trend-engine/server/service";
import { getSummary, getAdsView, getConfig, patchAd, putConfig } from "@/lib/metascraper/server/service";
import { fetchWeekSchedule } from "@/lib/schedule";
import { completeTask, createTask, listTasks } from "@/lib/tasks/server/service";
import { getDataAccess } from "./dataAccess";
import { saveMemory, searchLibrary, searchMemories } from "./knowledge";

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
export async function buildToolsForUser(db: SupabaseClient, userId: string, query = ""): Promise<ToolSet> {
  const access = await getDataAccess(db, userId);
  const tools: ToolSet = {
    rememberForLater: tool({
      description: "Save a durable personal fact, preference, goal, project, relationship, or decision. Use only when the user explicitly asks Mio to remember it or clearly states a lasting preference.",
      inputSchema: z.object({
        kind: z.enum(["preference", "profile", "goal", "project", "relationship", "decision", "other"]),
        title: z.string().min(2).max(160),
        content: z.string().min(2).max(4000),
      }),
      execute: async ({ kind, title, content }) => saveMemory(db, userId, { kind, title, content, sourceType: "explicit" }),
    }),
    searchPersonalKnowledge: tool({
      description: "Search Mio's user-managed memories and imported/pasted libraries when the supplied context is insufficient.",
      inputSchema: z.object({ query: z.string().min(2).max(500) }),
      execute: async ({ query: searchQuery }) => {
        const [memories, library] = await Promise.all([searchMemories(db, searchQuery, 8), searchLibrary(db, searchQuery, 8)]);
        return { memories, library };
      },
    }),
  };
  const normalized = query.toLowerCase();
  const wantsTrends = /\b(trend|topic|brief|content|video|keyword|youtube|news)\b/.test(normalized);
  const wantsMeta = /\b(meta|ad|ads|advert|competitor|creative|hook|campaign)\b/.test(normalized);
  const wantsSchedule = /\b(schedule|calendar|work|shift|day off|roster)\b/.test(normalized);
  const wantsTasks = /\b(task|tasks|todo|to-do|due|remind|focus|plan|what should i do)\b/.test(normalized);

  if (access.trendEngine && wantsTrends) {
    tools.getTrends = tool({
      description: "Get today's top trending topics from the Trend Engine, with scores and summaries.",
      inputSchema: z.object({}),
      execute: async () => {
        const trends = await getTopTrends(userId, 12);
        return trends.map((t) => ({
          rowId: t.rowId, keyword: t.keyword, title: t.title, summary: t.summary,
          score: t.score?.total ?? null, hasBrief: t.hasBrief, href: `/trends/${t.rowId}`,
        }));
      },
    });
    tools.getTrendHistory = tool({
      description: "Get historical trends from past searches (not just today's).",
      inputSchema: z.object({ limit: z.number().int().min(1).max(30).default(12) }),
      execute: async ({ limit }) => {
        const trends = await getTrendHistory(userId, limit);
        return { href: "/trends/history", trends: trends.map((t) => ({ keyword: t.keyword, title: t.title, summary: t.summary, createdAt: t.createdAt })) };
      },
    });
    tools.getBriefs = tool({
      description: "Get generated video briefs (script outlines) for trending topics.",
      inputSchema: z.object({}),
      execute: async () => {
        const briefs = await getBriefs(userId);
        return { href: "/briefs", briefs: briefs.map((b) => ({ title: b.titleOptions[0], hook: b.hook, cta: b.cta })) };
      },
    });
    tools.searchTrends = tool({
      description: "Run a new Trend Engine search using the user's active keyword bank and save the results.",
      inputSchema: z.object({
        timeWindow: z.enum(["12h", "24h", "3d", "7d", "30d", "60d", "90d"]).default("24h"),
        regionCode: z.enum(["JP", "US", "GB", "IN", "DE", "FR"]).default("JP"),
      }),
      execute: async ({ timeWindow, regionCode }) => {
        const result = await runSearch({ userId, sources: ["google_news", "google_trends", "youtube"], timeWindow, regionCode, checkForChannelFit: true });
        return { saved: result.trends.length, href: "/trends", top: result.trends.slice(0, 5).map((trend) => ({ rowId: trend.rowId, title: trend.title, score: trend.score.total, href: `/trends/${trend.rowId}` })) };
      },
    });
    tools.generateTrendBrief = tool({
      description: "Generate and save a video brief for a Trend Engine result. Use a rowId returned by getTrends or searchTrends.",
      inputSchema: z.object({ rowId: z.string().uuid() }),
      execute: async ({ rowId }) => generateAndSaveBrief(userId, rowId),
    });
    tools.setTrendStatus = tool({
      description: "Approve or reject a Trend Engine result.",
      inputSchema: z.object({ rowId: z.string().uuid(), status: z.enum(["approved", "rejected", "new"]) }),
      execute: async ({ rowId, status }) => setTopicStatus(userId, rowId, status),
    });
  }

  if (access.metascraper && wantsMeta) {
    tools.getMetaScraperSummary = tool({
      description: "Get a summary of tracked competitor Meta ads: totals, per-niche breakdown, proven/killed counts.",
      inputSchema: z.object({}),
      execute: async () => ({ ...(await getSummary(userId)), href: "/metascraper/dashboard" }),
    });
    tools.getMetaScraperAds = tool({
      description: "Get the list of tracked competitor Meta ads with status (new/running/killed) and longevity.",
      inputSchema: z.object({}),
      execute: async () => {
        const ads = await getAdsView(userId);
        return { href: "/metascraper/dashboard", ads: ads.slice(0, 20) };
      },
    });
    tools.getMetaScraperBanks = tool({
      description: "List MetaScraper keyword banks and the currently active bank.",
      inputSchema: z.object({}),
      execute: async () => {
        const { config } = await getConfig(userId);
        return { activeBankId: config.active_keyword_bank_id, banks: config.keyword_banks ?? [] };
      },
    });
    tools.switchMetaScraperBank = tool({
      description: "Switch the active MetaScraper keyword bank and enable exactly the niches in that bank.",
      inputSchema: z.object({ bankId: z.string() }),
      execute: async ({ bankId }) => {
        const { config } = await getConfig(userId);
        const bank = config.keyword_banks?.find((item) => item.id === bankId);
        if (!bank) throw new Error("Keyword bank not found");
        const enabled = new Set(bank.niche_ids);
        config.active_keyword_bank_id = bank.id;
        config.niches.forEach((niche) => { niche.enabled = enabled.has(niche.id); });
        await putConfig(userId, config);
        return { activeBankId: bank.id, name: bank.name, enabledNiches: bank.niche_ids.length };
      },
    });
    tools.tagMetaScraperAd = tool({
      description: "Add notes or a hook category to a tracked Meta ad.",
      inputSchema: z.object({
        libraryId: z.string(),
        hookCategory: z.enum(["before_after", "price", "testimonial", "doctor_trust", "campaign", "other"]).nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
      }),
      execute: async ({ libraryId, hookCategory, notes }) => patchAd(userId, libraryId, { hook_category: hookCategory, notes }),
    });
  }

  if (access.schedule && wantsSchedule) {
    tools.getWorkSchedule = tool({
      description: "Get this week's work schedule (which days are work vs. day off).",
      inputSchema: z.object({}),
      execute: async () => {
        const week = await fetchWeekSchedule();
        return {
          href: "/schedule",
          today: { status: week.status, label: week.label },
          week: week.week.map((d) => ({ date: d.date.toISOString().slice(0, 10), status: d.status, shift: d.shift })),
        };
      },
    });
  }

  if (access.tasks && wantsTasks) {
    tools.getTasks = tool({
      description: "Get the user's open tasks, including subtasks, due dates, and which group/project they belong to.",
      inputSchema: z.object({}),
      execute: async () => {
        const tasks = await listTasks(userId, { includeDone: false });
        const flatten = (list: typeof tasks): unknown[] =>
          list.flatMap((t) => [
            { id: t.id, title: t.title, dueAt: t.dueAt, groupId: t.groupId, recurring: Boolean(t.recurrenceRule), href: t.groupId ? `/tasks/${t.groupId}` : "/tasks" },
            ...flatten(t.subtasks),
          ]);
        return flatten(tasks);
      },
    });
    tools.createTask = tool({
      description: "Create a task for the user.",
      inputSchema: z.object({ title: z.string().min(1).max(240), notes: z.string().max(2000).optional(), dueAt: z.string().datetime().optional() }),
      execute: async ({ title, notes, dueAt }) => createTask(userId, { title, notes, dueAt }),
    });
    tools.completeTask = tool({
      description: "Mark a task complete. Use a task id returned by getTasks.",
      inputSchema: z.object({ taskId: z.string().uuid() }),
      execute: async ({ taskId }) => completeTask(userId, taskId),
    });
  }

  return tools;
}
