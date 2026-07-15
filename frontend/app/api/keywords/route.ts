import { NextRequest, NextResponse } from "next/server";
import { loadSettings, saveSettings } from "@/lib/trend-engine/server/settings";
import { requireUserId } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const settings = await loadSettings(userId);
    return NextResponse.json({ keywords: settings.keywords });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { keywords } = await req.json();
    if (!Array.isArray(keywords) || !keywords.every((k) => typeof k === "string" && k.trim())) {
      return NextResponse.json({ error: "keywords must be non-empty strings" }, { status: 400 });
    }
    await saveSettings(userId, { keywords });
    return NextResponse.json({ keywords });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
