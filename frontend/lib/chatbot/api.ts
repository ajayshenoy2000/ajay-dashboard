import { authFetch } from "../authFetch";
import type { ChatAttachment, ChatbotDataAccess, ChatMessage, Conversation } from "./types";
import { supabase } from "@/lib/supabase-browser";

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
  message: string,
  attachments: ChatAttachment[],
  onChunk: (textSoFar: string) => void,
): Promise<{ conversationId: string; fullText: string }> {
  const res = await authFetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, message, attachments }),
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

export async function uploadAttachment(file: File): Promise<ChatAttachment> {
  const res = await authFetch("/api/chat/attachments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, mediaType: file.type }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `Could not upload ${file.name}`);
  const { attachment, token } = await res.json() as { attachment: ChatAttachment; token: string };
  const { error } = await supabase.storage.from("chat-attachments").uploadToSignedUrl(attachment.storagePath, token, file, {
    contentType: attachment.mediaType,
  });
  if (error) throw new Error(`Could not upload ${file.name}: ${error.message}`);
  return attachment;
}

export function attachmentUrl(path: string): string {
  return `/api/chat/attachments?path=${encodeURIComponent(path)}`;
}
