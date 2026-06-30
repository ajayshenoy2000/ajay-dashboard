import { NextResponse } from "next/server";
import { getSummary } from "@/lib/metascraper/server/service";

export async function GET() {
  try {
    return NextResponse.json(await getSummary());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
