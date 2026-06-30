import { NextRequest, NextResponse } from "next/server";
import { getTrend, deleteTrend, setTopicStatus } from "@/lib/trend-engine/server/service";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { row_id: string } }) {
  try {
    const trend = await getTrend(params.row_id);
    if (!trend) return NextResponse.json({ error: "Trend not found" }, { status: 404 });
    return NextResponse.json(trend);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { row_id: string } }) {
  try {
    await deleteTrend(params.row_id);
    return NextResponse.json({ deleted: params.row_id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { row_id: string } }) {
  try {
    const { status } = await req.json();
    const trend = await setTopicStatus(params.row_id, status);
    if (!trend) return NextResponse.json({ error: "Trend not found" }, { status: 404 });
    return NextResponse.json(trend);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
