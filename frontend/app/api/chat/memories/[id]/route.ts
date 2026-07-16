import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === "string") patch.title = body.title.trim().slice(0, 160);
  if (typeof body.content === "string") patch.content = body.content.trim().slice(0, 4000);
  if (typeof body.kind === "string") patch.kind = body.kind;
  if (typeof body.pinned === "boolean") patch.pinned = body.pinned;
  if (typeof body.archived === "boolean") patch.archived = body.archived;
  const { data, error } = await auth.db.from("mio_memories").update(patch).eq("user_id", auth.userId).eq("id", params.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { error } = await auth.db.from("mio_memories").delete().eq("user_id", auth.userId).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: params.id });
}
