import { NextRequest, NextResponse } from "next/server";
import { streamGateway } from "@/lib/ai/gateway";
import { buildToolsForUser } from "@/lib/chatbot/server/tools";
import { createConversation, getConversation, addMessage, maybeSetTitle, getMessages } from "@/lib/chatbot/server/service";
import { getAuthContext } from "@/lib/server/auth";
import { NEMOTRON } from "@/lib/ai/models";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId, db } = auth;

  try {
    const body = await req.json();
    const message = String(body.message ?? "").trim();
    if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });
    const model = String(body.model ?? NEMOTRON);

    let conversationId = body.conversationId as string | undefined;
    if (conversationId) {
      const existing = await getConversation(db, userId, conversationId);
      if (!existing) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    } else {
      const created = await createConversation(db, userId, model);
      conversationId = created.id;
    }

    await addMessage(db, userId, conversationId, "user", message);
    await maybeSetTitle(db, userId, conversationId, message);

    const history = await getMessages(db, userId, conversationId);
    const tools = await buildToolsForUser(db, userId);

    const result = streamGateway("chatbot", {
      system:
        "You are a helpful assistant embedded in a personal dashboard. Use the available tools to answer " +
        "questions about the user's own data when relevant. Be concise. If a tool isn't available, say so " +
        "rather than guessing — the user controls which data sources you can access from Settings.",
      messages: history
        .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "system")
        .map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
      tools,
      modelOverride: model,
      userId,
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
