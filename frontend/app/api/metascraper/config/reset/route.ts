import { NextResponse } from "next/server";
import { resetConfig } from "@/lib/metascraper/server/service";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return NextResponse.json(await resetConfig());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
