import { NextResponse } from "next/server";
import { getTopTrends } from "@/lib/trend-engine/server/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getTopTrends());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
