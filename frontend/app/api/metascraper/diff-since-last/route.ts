import { NextResponse } from "next/server";
import { getDiffSinceLast } from "@/lib/metascraper/server/service";

export async function GET() {
  try {
    return NextResponse.json(await getDiffSinceLast());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
