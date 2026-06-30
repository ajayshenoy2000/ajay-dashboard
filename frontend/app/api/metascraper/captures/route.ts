import { NextResponse } from "next/server";
import { getCaptures } from "@/lib/metascraper/server/service";

export async function GET() {
  try {
    return NextResponse.json(await getCaptures());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
