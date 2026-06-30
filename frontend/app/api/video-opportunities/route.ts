import { NextResponse } from "next/server";
import { getVideoOpportunities } from "@/lib/trend-engine/server/service";

export async function GET() {
  try {
    return NextResponse.json(await getVideoOpportunities());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
