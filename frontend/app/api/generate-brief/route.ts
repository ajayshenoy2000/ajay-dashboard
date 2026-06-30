import { NextRequest, NextResponse } from "next/server";
import { generateAndSaveBrief } from "@/lib/trend-engine/server/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { rowId } = await req.json();
    if (!rowId) return NextResponse.json({ error: "rowId is required" }, { status: 400 });
    const brief = await generateAndSaveBrief(String(rowId));
    if (!brief) return NextResponse.json({ error: "Trend not found" }, { status: 404 });
    return NextResponse.json(brief);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
