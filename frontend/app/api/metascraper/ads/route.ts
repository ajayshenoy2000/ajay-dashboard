import { NextResponse } from "next/server";
import { getAdsView } from "@/lib/metascraper/server/service";

export async function GET() {
  try {
    return NextResponse.json(await getAdsView());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
