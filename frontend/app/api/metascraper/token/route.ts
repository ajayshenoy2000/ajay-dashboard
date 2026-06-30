import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ token: process.env.METASCRAPER_INGEST_TOKEN ?? "" });
}
