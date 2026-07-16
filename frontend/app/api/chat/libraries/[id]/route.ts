import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [{ data: library }, { data: items, error }] = await Promise.all([
    auth.db.from("mio_libraries").select("*").eq("user_id", auth.userId).eq("id", params.id).maybeSingle(),
    auth.db.from("mio_library_items").select("id,title,source_type,status,media_type,created_at,updated_at").eq("user_id", auth.userId).eq("library_id", params.id).order("created_at", { ascending: false }),
  ]);
  if (!library) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ library, items: items ?? [] });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { error } = await auth.db.from("mio_libraries").delete().eq("user_id", auth.userId).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: params.id });
}
