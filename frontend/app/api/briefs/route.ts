import { NextResponse } from "next/server";
import { getBriefs } from "@/lib/trend-engine/server/service";

export async function GET() {
  try {
    return NextResponse.json(await getBriefs());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
