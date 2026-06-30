import { NextRequest, NextResponse } from "next/server";
import { runSearch, TIME_WINDOWS } from "@/lib/trend-engine/server/service";

export const maxDuration = 60;

const ALLOWED_REGIONS = new Set(["JP", "US", "GB", "IN", "DE", "FR"]);

export async function POST(req: NextRequest) {
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
    const analysisModelProvider = body.analysisModelProvider === "claude" ? "claude" : "gpt";
    const briefModelProvider = body.briefModelProvider === "claude" ? "claude" : "gpt";
    const regionCode = ALLOWED_REGIONS.has(String(body.regionCode ?? "JP"))
      ? String(body.regionCode)
      : "JP";

    const result = await runSearch({
      sources,
      timeWindow,
      analysisModelProvider,
      briefModelProvider,
      regionCode,
      checkForChannelFit: Boolean(body.checkForChannelFit),
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: `Search failed: ${e}` }, { status: 500 });
  }
}
