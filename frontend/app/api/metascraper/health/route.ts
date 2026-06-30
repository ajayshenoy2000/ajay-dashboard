import { NextResponse } from "next/server";
import { getHealth } from "@/lib/metascraper/server/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getHealth());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
