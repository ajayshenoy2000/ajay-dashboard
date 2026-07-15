import { NextRequest, NextResponse } from "next/server";
import { getConfig, putConfig } from "@/lib/metascraper/server/service";
import { requireUserId } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getConfig(userId));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body?.config?.niches || !body?.config?.global) {
      return NextResponse.json({ error: "config must include 'global' and 'niches'" }, { status: 400 });
    }
    return NextResponse.json(await putConfig(userId, body.config));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
