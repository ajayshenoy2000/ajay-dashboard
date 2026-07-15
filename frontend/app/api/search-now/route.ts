import { NextRequest, NextResponse } from "next/server";
import { runSearch, TIME_WINDOWS } from "@/lib/trend-engine/server/service";
import { requireUserId } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const maxDuration = 60;

const ALLOWED_REGIONS = new Set(["JP", "US", "GB", "IN", "DE", "FR"]);

export async function POST(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const sources: string[] = (body.sources ?? []).filter((s: string) =>
      ["x", "google_news", "google_trends", "youtube"].includes(s),
    );
    if (!sources.length) {
      return NextResponse.json({ error: "At least one source must be enabled" }, { status: 400 });
    }
    const timeWindow = String(body.timeWindow ?? "24h");
    if (!TIME_WINDOWS[timeWindow]) {
      return NextResponse.json({ error: "Unsupported time window" }, { status: 400 });
    }
    const regionCode = ALLOWED_REGIONS.has(String(body.regionCode ?? "JP"))
      ? String(body.regionCode)
      : "JP";

    const result = await runSearch({
      userId,
      sources,
      timeWindow,
      regionCode,
      checkForChannelFit: Boolean(body.checkForChannelFit),
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: `Search failed: ${e}` }, { status: 500 });
  }
}
