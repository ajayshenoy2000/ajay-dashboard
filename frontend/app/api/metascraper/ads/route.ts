import { NextRequest, NextResponse } from "next/server";
import { getAdsView } from "@/lib/metascraper/server/service";
import { requireUserId } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getAdsView(userId));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
