import { NextRequest, NextResponse } from "next/server";
import { clearTrendHistory } from "@/lib/trend-engine/server/service";
import { requireUserId } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { olderThanHours } = await req.json();
    const deletedCount = await clearTrendHistory(userId, Number(olderThanHours) || 168);
    return NextResponse.json({ deletedCount });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
