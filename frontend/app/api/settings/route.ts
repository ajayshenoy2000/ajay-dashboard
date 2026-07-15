import { NextRequest, NextResponse } from "next/server";
import { getAppSettings, setScoringWeights } from "@/lib/trend-engine/server/service";
import { requireUserId } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getAppSettings(userId));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { scoringWeights } = await req.json();
    if (!scoringWeights || typeof scoringWeights !== "object") {
      return NextResponse.json({ error: "scoringWeights must be an object" }, { status: 400 });
    }
    await setScoringWeights(userId, scoringWeights);
    return NextResponse.json(await getAppSettings(userId));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
