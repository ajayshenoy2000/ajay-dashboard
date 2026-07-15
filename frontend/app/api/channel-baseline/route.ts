import { NextRequest, NextResponse } from "next/server";
import { getChannelBaseline } from "@/lib/trend-engine/server/service";
import { requireUserId } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ baseline: await getChannelBaseline(userId) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
