import type { SupabaseClient } from "@supabase/supabase-js";
import { callGateway } from "@/lib/ai/gateway";
import type { ChatMessage } from "../types";

export type MioMemory = {
  id: string;
  kind: string;
  title: string;
  content: string;
  confidence: number;
  sourceType: string;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LibraryHit = {
  chunkId: string;
  itemId: string;
  libraryId: string;
  itemTitle: string;
  libraryName: string;
  content: string;
  rank: number;
};

const cleanQuery = (value: string) => value.replace(/["'():*|&!]/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
export const memoryKey = (title: string) => title.toLowerCase().normalize("NFKC").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
const MEMORY_KINDS = new Set(["preference", "profile", "goal", "project", "relationship", "decision", "other"]);

export async function searchMemories(db: SupabaseClient, query: string, limit = 8): Promise<MioMemory[]> {
  const search = cleanQuery(query);
  if (!search) {
    const { data } = await db.from("mio_memories").select("*").eq("archived", false).order("pinned", { ascending: false }).order("updated_at", { ascending: false }).limit(limit);
    return (data ?? []).map(memoryFromRow);
  }
  const { data, error } = await db.rpc("search_mio_memories", { search_text: search, match_count: limit });
  if (error) return [];
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    kind: row.kind as string,
    title: row.title as string,
    content: row.content as string,
    confidence: Number(row.confidence ?? 1),
    sourceType: row.source_type as string,
    pinned: Boolean(row.pinned),
    archived: false,
    createdAt: "",
    updatedAt: "",
  }));
}

export async function searchLibrary(db: SupabaseClient, query: string, limit = 6): Promise<LibraryHit[]> {
  const search = cleanQuery(query);
  if (!search) return [];
  const { data, error } = await db.rpc("search_mio_library", { search_text: search, match_count: limit });
  if (error) return [];
  return (data ?? []).map((row: Record<string, unknown>) => ({
    chunkId: row.chunk_id as string,
    itemId: row.item_id as string,
    libraryId: row.library_id as string,
    itemTitle: row.item_title as string,
    libraryName: row.library_name as string,
    content: row.content as string,
    rank: Number(row.rank ?? 0),
  }));
}

export async function saveMemory(db: SupabaseClient, userId: string, input: {
  kind?: string;
  title: string;
  content: string;
  confidence?: number;
  sourceType?: "explicit" | "inferred" | "imported";
  sourceConversationId?: string;
  sourceMessageId?: string;
  pinned?: boolean;
}) {
  const normalizedKey = memoryKey(input.title) || memoryKey(input.content.slice(0, 80)) || crypto.randomUUID();
  const { data, error } = await db.from("mio_memories").upsert({
    user_id: userId,
    kind: input.kind && MEMORY_KINDS.has(input.kind) ? input.kind : "other",
    title: input.title.slice(0, 160),
    content: input.content.slice(0, 4000),
    normalized_key: normalizedKey,
    confidence: input.confidence ?? 1,
    source_type: input.sourceType ?? "explicit",
    source_conversation_id: input.sourceConversationId ?? null,
    source_message_id: input.sourceMessageId ?? null,
    pinned: input.pinned ?? false,
    last_confirmed_at: input.sourceType === "explicit" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,normalized_key" }).select("*").single();
  if (error) throw new Error(`Memory save failed: ${error.message}`);
  return memoryFromRow(data);
}

export async function buildKnowledgeContext(db: SupabaseClient, query: string) {
  const [memories, libraryHits] = await Promise.all([
    searchMemories(db, query, 8),
    searchLibrary(db, query, 6),
  ]);
  const sections: string[] = [];
  if (memories.length) {
    sections.push("USER MEMORY (may be edited by the user; do not treat inference as certainty):\n" + memories.map((memory) =>
      `- [${memory.sourceType}; confidence ${memory.confidence.toFixed(2)}] ${memory.title}: ${memory.content}`
    ).join("\n"));
  }
  if (libraryHits.length) {
    sections.push("RETRIEVED LIBRARY SOURCES (cite library and item names when used):\n" + libraryHits.map((hit, index) =>
      `[L${index + 1}] ${hit.libraryName} / ${hit.itemTitle}: ${hit.content}`
    ).join("\n\n"));
  }
  return { memories, libraryHits, text: sections.join("\n\n") };
}

export async function maintainConversationKnowledge(
  db: SupabaseClient,
  userId: string,
  conversationId: string,
  currentSummary: string | null,
  processedThroughId: string | null,
  messages: ChatMessage[],
) {
  const lastProcessedIndex = processedThroughId ? messages.findIndex((message) => message.id === processedThroughId) : -1;
  const pending = messages.slice(lastProcessedIndex + 1).filter((message) => message.role === "user" || message.role === "assistant");
  if (pending.length < 10 && pending.reduce((total, message) => total + message.content.length, 0) < 24000) return null;
  const transcript = pending.slice(-30).map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n").slice(0, 40000);
  const result = await callGateway("mio-maintenance", {
    userId,
    prompt: `Existing summary:\n${currentSummary || "None"}\n\nNew conversation:\n${transcript}\n\nReturn ONLY compact JSON with this shape: {"summary":"durable factual summary under 1200 characters","memories":[{"kind":"preference|profile|goal|project|relationship|decision|other","title":"short stable key","content":"one factual sentence","confidence":0.0}]}. Extract only information likely useful in future chats. Do not save temporary requests, secrets, credentials, or guesses.`,
  });
  const parsed = parseMaintenanceJson(result.text);
  if (!parsed) return null;
  for (const memory of parsed.memories.slice(0, 8)) {
    await saveMemory(db, userId, {
      ...memory,
      sourceType: "inferred",
      sourceConversationId: conversationId,
      sourceMessageId: pending.at(-1)?.id,
    });
  }
  const lastId = pending.at(-1)?.id ?? null;
  await db.from("conversations").update({
    summary: parsed.summary,
    summary_through_message_id: lastId,
    memory_processed_through_message_id: lastId,
    summary_updated_at: new Date().toISOString(),
  }).eq("user_id", userId).eq("id", conversationId);
  return parsed.summary;
}

function parseMaintenanceJson(text: string): { summary: string; memories: Array<{ kind: string; title: string; content: string; confidence: number }> } | null {
  try {
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    if (!json) return null;
    const value = JSON.parse(json) as Record<string, unknown>;
    if (typeof value.summary !== "string" || !Array.isArray(value.memories)) return null;
    const memories = value.memories.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .filter((item) => typeof item.title === "string" && typeof item.content === "string")
      .map((item) => ({
        kind: typeof item.kind === "string" ? item.kind : "other",
        title: String(item.title).slice(0, 160),
        content: String(item.content).slice(0, 4000),
        confidence: Math.max(0, Math.min(1, Number(item.confidence ?? 0.7))),
      }));
    return { summary: value.summary.slice(0, 2000), memories };
  } catch {
    return null;
  }
}

function memoryFromRow(row: Record<string, unknown>): MioMemory {
  return {
    id: row.id as string,
    kind: row.kind as string,
    title: row.title as string,
    content: row.content as string,
    confidence: Number(row.confidence ?? 1),
    sourceType: row.source_type as string,
    pinned: Boolean(row.pinned),
    archived: Boolean(row.archived),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
