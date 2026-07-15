import { NextRequest, NextResponse } from "next/server";
import { getRegionCode, setRegionCode } from "@/lib/trend-engine/server/service";
import { requireUserId } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ regionCode: await getRegionCode(userId) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { regionCode } = await req.json();
    await setRegionCode(userId, String(regionCode ?? "JP"));
    return NextResponse.json({ regionCode: await getRegionCode(userId) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
