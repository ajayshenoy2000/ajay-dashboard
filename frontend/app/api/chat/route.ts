import { NextRequest, NextResponse } from "next/server";
import { streamGateway } from "@/lib/ai/gateway";
import { buildToolsForUser } from "@/lib/chatbot/server/tools";
import { createConversation, getConversation, addMessage, maybeSetTitle, getMessages } from "@/lib/chatbot/server/service";
import { getAuthContext } from "@/lib/server/auth";
import { MINIMAX } from "@/lib/ai/models";
import type { ModelMessage, UserContent } from "ai";
import type { ChatAttachment, ChatMessage } from "@/lib/chatbot/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildKnowledgeContext, maintainConversationKnowledge } from "@/lib/chatbot/server/knowledge";
import type { Conversation } from "@/lib/chatbot/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId, db } = auth;

  try {
    const body = await req.json();
    const message = String(body.message ?? "").trim();
    const attachments = Array.isArray(body.attachments) ? body.attachments as ChatAttachment[] : [];
    if (!message && !attachments.length) return NextResponse.json({ error: "message or attachment is required" }, { status: 400 });
    if (attachments.length > 4) return NextResponse.json({ error: "Up to 4 attachments are allowed" }, { status: 400 });
    if (attachments.some((item) => !item.storagePath?.startsWith(`${userId}/`) || item.size > 10 * 1024 * 1024)) {
      return NextResponse.json({ error: "Invalid attachment" }, { status: 400 });
    }

    let conversationId = body.conversationId as string | undefined;
    let conversation: Conversation;
    if (conversationId) {
      const existing = await getConversation(db, userId, conversationId);
      if (!existing) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      conversation = existing;
    } else {
      const created = await createConversation(db, userId, MINIMAX);
      conversationId = created.id;
      conversation = created;
    }

    await addMessage(db, userId, conversationId, "user", message, attachments);
    await maybeSetTitle(db, userId, conversationId, message || `Attachment: ${attachments[0]?.name ?? "file"}`);

    const history = await getMessages(db, userId, conversationId);
    const maintainedSummary = await maintainConversationKnowledge(
      db,
      userId,
      conversationId,
      conversation.summary,
      conversation.memoryProcessedThroughMessageId,
      history,
    ).catch((error) => {
      console.error("[mio] maintenance skipped:", error);
      return null;
    });
    const summary = maintainedSummary ?? conversation.summary;
    const knowledge = await buildKnowledgeContext(db, message).catch(() => ({ memories: [], libraryHits: [], text: "" }));
    const toolIntentContext = history.slice(-4).map((item) => item.content).join("\n");
    const tools = await buildToolsForUser(db, userId, toolIntentContext);

    const modelMessages = await buildModelMessages(db, userId, history, summary);
    const result = streamGateway("chatbot", {
      system:
        "You are Mio, a warm, concise, capable personal assistant embedded in the user's private dashboard. " +
        "Use the available tools to answer " +
        "questions about the user's own data and take supported actions when the user asks. Be concise. " +
        "Never perform an action unless the user clearly requested it. If a tool isn't available, say so " +
        "rather than guessing. Clearly distinguish remembered preferences, imported library facts, and live app data. " +
        "The user controls data access from Mio's dock. " +
        "When library context is supplied, cite its [L#] marker and source name. When a tool result includes an href, include the most useful href in the answer.\n\n" +
        (knowledge.text ? `${knowledge.text}\n\n` : "") +
        (summary ? `CONVERSATION SUMMARY:\n${summary}` : ""),
      messages: modelMessages,
      tools,
      userId,
      sessionId: conversationId,
      onFinish: (text) => {
        addMessage(db, userId, conversationId!, "assistant", text).catch((e) =>
          console.error("[chat] failed to persist assistant message:", e),
        );
      },
    });

    const response = result.toTextStreamResponse();
    response.headers.set("X-Conversation-Id", conversationId);
    return response;
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

async function buildModelMessages(
  db: SupabaseClient,
  userId: string,
  history: ChatMessage[],
  summary: string | null,
): Promise<ModelMessage[]> {
  const recentHistory = history.slice(-16);
  const eligible = new Set<string>();
  let totalBytes = 0;
  for (const message of [...recentHistory].reverse()) {
    if (message.role !== "user") continue;
    for (const attachment of message.attachments) {
      if (eligible.size >= 4 || totalBytes + attachment.size > 20 * 1024 * 1024) continue;
      if (!attachment.storagePath.startsWith(`${userId}/`)) continue;
      eligible.add(attachment.id);
      totalBytes += attachment.size;
    }
    if (eligible.size >= 4) break;
  }

  const messages: ModelMessage[] = [];
  if (summary && history.length > recentHistory.length) {
    messages.push({ role: "system", content: `Earlier conversation was compacted as: ${summary}` });
  }
  for (const message of recentHistory) {
    if (message.role !== "user" && message.role !== "assistant" && message.role !== "system") continue;
    if (message.role !== "user" || !message.attachments.length) {
      messages.push({ role: message.role, content: message.content });
      continue;
    }

    const content: UserContent = [{ type: "text", text: message.content || "Please inspect the attached file." }];
    for (const attachment of message.attachments) {
      if (!eligible.has(attachment.id)) {
        content.push({ type: "text", text: `[Earlier attachment: ${attachment.name}]` });
        continue;
      }
      const { data, error } = await db.storage.from("chat-attachments").download(attachment.storagePath);
      if (error || !data) {
        content.push({ type: "text", text: `[Attachment unavailable: ${attachment.name}]` });
        continue;
      }
      const bytes = new Uint8Array(await data.arrayBuffer());
      const mediaType = data.type || attachment.mediaType;
      if (mediaType.startsWith("image/")) {
        content.push({ type: "image", image: bytes, mediaType });
      } else {
        content.push({ type: "file", data: bytes, filename: attachment.name, mediaType });
      }
    }
    messages.push({ role: "user", content });
  }
  return messages;
}
