import { authFetch } from "../authFetch";
import type { ChatbotDataAccess, ChatMessage, Conversation } from "./types";

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await authFetch(path, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export function listConversations(): Promise<Conversation[]> {
  return getJson<Conversation[]>("/api/chat/conversations", []);
}

export function getConversation(id: string): Promise<{ conversation: Conversation; messages: ChatMessage[] } | null> {
  return getJson(`/api/chat/conversations/${id}`, null);
}

export async function deleteConversation(id: string): Promise<void> {
  await authFetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
}

export function getDataAccess(): Promise<ChatbotDataAccess> {
  return getJson<ChatbotDataAccess>("/api/chatbot/data-access", {
    trendEngine: false, metascraper: false, schedule: false, tasks: false,
  });
}

export async function setDataAccess(patch: Partial<ChatbotDataAccess>): Promise<ChatbotDataAccess> {
  const res = await authFetch("/api/chatbot/data-access", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to update data access");
  return res.json();
}

// Streams the assistant's reply as plain text chunks via onChunk, and returns
// the conversationId (server-created on the first message of a new thread).
export async function sendMessage(
  conversationId: string | undefined,
  model: string,
  message: string,
  onChunk: (textSoFar: string) => void,
): Promise<{ conversationId: string; fullText: string }> {
  const res = await authFetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, model, message }),
  });
  if (!res.ok || !res.body) throw new Error((await res.text().catch(() => "")) || "Chat request failed");

  const newConversationId = res.headers.get("X-Conversation-Id") ?? conversationId ?? "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    fullText += decoder.decode(value, { stream: true });
    onChunk(fullText);
  }
  return { conversationId: newConversationId, fullText };
}
