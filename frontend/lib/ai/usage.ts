import { getDb } from "@/lib/trend-engine/server/db";

export interface UsageLogRow {
  userId?: string | null;
  useCase: string;
  model: string;
  provider: string;
  success: boolean;
  latencyMs: number;
  promptTokens?: number | null;
  completionTokens?: number | null;
  costUsd?: number | null;
}

// Fire-and-forget: never throws, never blocks the caller. If OPENROUTER cost wasn't
// returned, est_cost_usd is stored as NULL rather than triggering a second network call.
export function logUsage(row: UsageLogRow): void {
  const db = getDb();
  if (!db) return;
  (async () => {
    try {
      const { error } = await db.from("ai_usage_log").insert({
        user_id: row.userId ?? null,
        use_case: row.useCase,
        model: row.model,
        provider: row.provider,
        success: row.success,
        latency_ms: row.latencyMs,
        prompt_tokens: row.promptTokens ?? null,
        completion_tokens: row.completionTokens ?? null,
        est_cost_usd: row.costUsd ?? null,
      });
      if (error) console.error(`ai_usage_log insert failed: ${error.message}`);
    } catch (err) {
      console.error("ai_usage_log insert threw:", err);
    }
  })();
}
