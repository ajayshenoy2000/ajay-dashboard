import { NextRequest, NextResponse } from "next/server";
import { getBrief, deleteBrief } from "@/lib/trend-engine/server/service";

export async function GET(_req: NextRequest, { params }: { params: { brief_id: string } }) {
  try {
    const brief = await getBrief(params.brief_id);
    if (!brief) return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    return NextResponse.json(brief);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { brief_id: string } }) {
  try {
    await deleteBrief(params.brief_id);
    return NextResponse.json({ deleted: params.brief_id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
