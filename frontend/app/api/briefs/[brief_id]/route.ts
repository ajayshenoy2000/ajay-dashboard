import { NextRequest, NextResponse } from "next/server";
import { getBrief, deleteBrief } from "@/lib/trend-engine/server/service";
import { requireUserId } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { brief_id: string } }) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const brief = await getBrief(userId, params.brief_id);
    if (!brief) return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    return NextResponse.json(brief);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { brief_id: string } }) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await deleteBrief(userId, params.brief_id);
    return NextResponse.json({ deleted: params.brief_id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
