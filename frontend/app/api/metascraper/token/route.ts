import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ token: process.env.METASCRAPER_INGEST_TOKEN ?? "" });
}
