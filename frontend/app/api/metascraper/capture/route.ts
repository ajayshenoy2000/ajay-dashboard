import { NextRequest, NextResponse } from "next/server";
import { ingestCapture } from "@/lib/metascraper/server/service";

export const dynamic = "force-dynamic";

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
  // This route is hit externally (pasted into Claude-in-Chrome) with only the
  // ingest token above — there's no browser session to resolve a userId from,
  // so it's stamped with the single owning account instead. Set once, after
  // completing real signup, per Phase 2 of the overhaul plan.
  const userId = process.env.OWNER_USER_ID;
  if (!userId) {
    return NextResponse.json({ error: "OWNER_USER_ID is not configured" }, { status: 500 });
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
    return NextResponse.json(await ingestCapture(userId, capture));
  } catch (e) {
    return NextResponse.json({ error: `Ingest failed: ${e}` }, { status: 500 });
  }
}
