import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage, ChatRole, Conversation } from "../types";

// NOTE (Phase 7 revision): the chatbot persists via an RLS-scoped client
// authenticated as the calling user (see lib/server/auth.ts getAuthContext),
// passed in as `db` — NOT the service-role getDb() the older sub-apps use.
// This makes chat persistence work with only the public anon key present
// (verifiable in local dev, no server secret required) and enforces row-level
// security instead of bypassing it.

function conversationFromRow(row: Record<string, unknown>): Conversation {
  return {
    id: row.id as string,
    title: (row.title as string) ?? null,
    model: row.model as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function messageFromRow(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    role: row.role as ChatRole,
    content: row.content as string,
    createdAt: row.created_at as string,
  };
}

export async function listConversations(db: SupabaseClient, userId: string): Promise<Conversation[]> {
  const { data } = await db
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return (data ?? []).map(conversationFromRow);
}

export async function createConversation(db: SupabaseClient, userId: string, model: string): Promise<Conversation> {
  const { data, error } = await db
    .from("conversations")
    .insert({ user_id: userId, model })
    .select("*")
    .single();
  if (error) throw new Error(`conversations insert failed: ${error.message}`);
  return conversationFromRow(data);
}

export async function getConversation(db: SupabaseClient, userId: string, id: string): Promise<Conversation | null> {
  const { data } = await db.from("conversations").select("*").eq("user_id", userId).eq("id", id).limit(1);
  if (!data?.length) return null;
  return conversationFromRow(data[0]);
}

export async function deleteConversation(db: SupabaseClient, userId: string, id: string): Promise<void> {
  await db.from("conversations").delete().eq("user_id", userId).eq("id", id);
}

export async function getMessages(db: SupabaseClient, userId: string, conversationId: string): Promise<ChatMessage[]> {
  const { data } = await db
    .from("messages")
    .select("*")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .order("created_at");
  return (data ?? []).map(messageFromRow);
}

export async function addMessage(
  db: SupabaseClient,
  userId: string,
  conversationId: string,
  role: ChatRole,
  content: string,
): Promise<void> {
  const { error } = await db.from("messages").insert({ user_id: userId, conversation_id: conversationId, role, content });
  if (error) throw new Error(`messages insert failed: ${error.message}`);
  await db.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
}

// First user message, trimmed, becomes the conversation's title if it doesn't have one yet.
export async function maybeSetTitle(db: SupabaseClient, userId: string, conversationId: string, firstUserMessage: string): Promise<void> {
  const { data } = await db.from("conversations").select("title").eq("id", conversationId).limit(1);
  if (data?.length && !data[0].title) {
    await db
      .from("conversations")
      .update({ title: firstUserMessage.slice(0, 60) })
      .eq("user_id", userId)
      .eq("id", conversationId);
  }
}
