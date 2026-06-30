import { NextRequest, NextResponse } from "next/server";
import { clearTrendHistory } from "@/lib/trend-engine/server/service";

export async function POST(req: NextRequest) {
  try {
    const { olderThanHours } = await req.json();
    const deletedCount = await clearTrendHistory(Number(olderThanHours) || 168);
    return NextResponse.json({ deletedCount });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
