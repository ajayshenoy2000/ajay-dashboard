import { NextRequest, NextResponse } from "next/server";
import { getCustomKeywords, setCustomKeywords } from "@/lib/trend-engine/server/service";
import { requireUserId } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getCustomKeywords(userId));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { keywords, useCustomOnly } = await req.json();
    await setCustomKeywords(userId, Array.isArray(keywords) ? keywords : [], Boolean(useCustomOnly));
    return NextResponse.json(await getCustomKeywords(userId));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
