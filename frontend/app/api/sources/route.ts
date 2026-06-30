import { NextResponse } from "next/server";
import { getSources } from "@/lib/trend-engine/server/service";

export async function GET() {
  try {
    return NextResponse.json(await getSources());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
