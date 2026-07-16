import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await auth.db.from("mio_libraries").select("*, mio_library_items(count)").order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    itemCount: row.mio_library_items?.[0]?.count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })));
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const { data, error } = await auth.db.from("mio_libraries").insert({
    user_id: auth.userId,
    name: name.slice(0, 120),
    description: String(body.description ?? "").trim().slice(0, 500) || null,
    color: /^#[0-9a-f]{6}$/i.test(body.color) ? body.color : "#d96f58",
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
