import { NextResponse } from "next/server";
import { getTrendHistory } from "@/lib/trend-engine/server/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getTrendHistory());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
