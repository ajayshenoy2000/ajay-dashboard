import { NextRequest, NextResponse } from "next/server";
import { getAppSettings, saveKeywordBanks } from "@/lib/trend-engine/server/service";
import { requireUserId } from "@/lib/server/auth";
import type { KeywordBank } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getAppSettings(userId));
}

export async function PUT(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json() as { keywordBanks?: KeywordBank[]; activeKeywordBankId?: string };
    if (!Array.isArray(body.keywordBanks)) {
      return NextResponse.json({ error: "keywordBanks must be an array" }, { status: 400 });
    }
    await saveKeywordBanks(userId, body.keywordBanks, String(body.activeKeywordBankId ?? ""));
    return NextResponse.json(await getAppSettings(userId));
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
