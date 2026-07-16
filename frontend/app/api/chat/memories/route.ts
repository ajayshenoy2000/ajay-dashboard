import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";
import { saveMemory } from "@/lib/chatbot/server/knowledge";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await auth.db.from("mio_memories").select("*").eq("archived", false)
    .order("pinned", { ascending: false }).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    content: row.content,
    confidence: row.confidence,
    sourceType: row.source_type,
    pinned: row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })));
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();
  if (!title || !content) return NextResponse.json({ error: "title and content are required" }, { status: 400 });
  try {
    const memory = await saveMemory(auth.db, auth.userId, {
      kind: String(body.kind ?? "other"),
      title,
      content,
      sourceType: "explicit",
      pinned: Boolean(body.pinned),
    });
    return NextResponse.json(memory, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
