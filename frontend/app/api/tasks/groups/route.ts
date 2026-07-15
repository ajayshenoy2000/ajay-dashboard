import { NextRequest, NextResponse } from "next/server";
import { listGroups, createGroup } from "@/lib/tasks/server/service";
import { requireUserId } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await listGroups(userId));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body?.name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
    return NextResponse.json(await createGroup(userId, String(body.name).trim(), body.color ?? null));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
