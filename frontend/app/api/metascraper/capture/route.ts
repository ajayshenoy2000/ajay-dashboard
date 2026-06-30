import { NextRequest, NextResponse } from "next/server";
import { ingestCapture } from "@/lib/metascraper/server/service";

function checkToken(req: NextRequest): boolean {
  const expected = process.env.METASCRAPER_INGEST_TOKEN;
  if (!expected) return true; // open when unset (local dev)
  let provided =
    req.headers.get("x-ingest-token") ??
    req.headers.get("authorization") ??
    "";
  if (provided.toLowerCase().startsWith("bearer ")) provided = provided.slice(7);
  return provided === expected;
}

export async function POST(req: NextRequest) {
  if (!checkToken(req)) {
    return NextResponse.json({ error: "Invalid or missing ingest token" }, { status: 401 });
  }
  try {
    const body = await req.json();
    if (!body?.captured_date) {
      return NextResponse.json({ error: "captured_date is required" }, { status: 400 });
    }
    const capture = {
      captured_date: String(body.captured_date),
      country: String(body.country ?? "JP"),
      ads: Array.isArray(body.ads) ? body.ads : [],
      hunted_scope: Array.isArray(body.hunted_scope) ? body.hunted_scope : [],
    };
    return NextResponse.json(await ingestCapture(capture));
  } catch (e) {
    return NextResponse.json({ error: `Ingest failed: ${e}` }, { status: 500 });
  }
}
