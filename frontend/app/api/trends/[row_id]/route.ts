import { NextRequest, NextResponse } from "next/server";
import { getTrend, deleteTrend, setTopicStatus } from "@/lib/trend-engine/server/service";
import { requireUserId } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { row_id: string } }) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const trend = await getTrend(userId, params.row_id);
    if (!trend) return NextResponse.json({ error: "Trend not found" }, { status: 404 });
    return NextResponse.json(trend);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { row_id: string } }) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await deleteTrend(userId, params.row_id);
    return NextResponse.json({ deleted: params.row_id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { row_id: string } }) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { status } = await req.json();
    const trend = await setTopicStatus(userId, params.row_id, status);
    if (!trend) return NextResponse.json({ error: "Trend not found" }, { status: 404 });
    return NextResponse.json(trend);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
