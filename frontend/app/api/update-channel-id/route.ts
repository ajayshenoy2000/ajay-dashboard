import { NextRequest, NextResponse } from "next/server";
import { updateChannelId } from "@/lib/trend-engine/server/service";
import { requireUserId } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { channelId } = await req.json();
    if (!channelId?.trim()) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }
    const baseline = await updateChannelId(userId, String(channelId).trim());
    if (!baseline) {
      return NextResponse.json({ error: "Failed to fetch channel data" }, { status: 400 });
    }
    return NextResponse.json({ success: true, baseline });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
