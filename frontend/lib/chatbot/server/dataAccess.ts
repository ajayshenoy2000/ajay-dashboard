import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatbotDataAccess } from "../types";

// Uses the RLS-scoped per-user client (see lib/chatbot/server/service.ts note),
// not service-role.
const DEFAULTS: ChatbotDataAccess = { trendEngine: true, metascraper: true, schedule: true, tasks: true };

export async function getDataAccess(db: SupabaseClient, userId: string): Promise<ChatbotDataAccess> {
  const { data } = await db.from("chatbot_data_access").select("*").eq("user_id", userId).limit(1);
  if (!data?.length) return DEFAULTS;
  const row = data[0];
  return {
    trendEngine: Boolean(row.trend_engine),
    metascraper: Boolean(row.metascraper),
    schedule: Boolean(row.schedule),
    tasks: Boolean(row.tasks),
  };
}

export async function setDataAccess(db: SupabaseClient, userId: string, patch: Partial<ChatbotDataAccess>): Promise<ChatbotDataAccess> {
  const current = await getDataAccess(db, userId);
  const next = { ...current, ...patch };
  const { error } = await db.from("chatbot_data_access").upsert({
    user_id: userId,
    trend_engine: next.trendEngine,
    metascraper: next.metascraper,
    schedule: next.schedule,
    tasks: next.tasks,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`chatbot_data_access upsert failed: ${error.message}`);
  return next;
}
