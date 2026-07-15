import { NextRequest, NextResponse } from "next/server";
import { getConversation, getMessages, deleteConversation } from "@/lib/chatbot/server/service";
import { getAuthContext } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const conversation = await getConversation(auth.db, auth.userId, params.id);
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    const messages = await getMessages(auth.db, auth.userId, params.id);
    return NextResponse.json({ conversation, messages });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await deleteConversation(auth.db, auth.userId, params.id);
    return NextResponse.json({ deleted: params.id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
