import { NextRequest, NextResponse } from "next/server";
import { loadSettings, saveSettings } from "@/lib/trend-engine/server/settings";

export async function GET() {
  try {
    const settings = await loadSettings();
    return NextResponse.json({ keywords: settings.keywords });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { keywords } = await req.json();
    if (!Array.isArray(keywords) || !keywords.every((k) => typeof k === "string" && k.trim())) {
      return NextResponse.json({ error: "keywords must be non-empty strings" }, { status: 400 });
    }
    await saveSettings({ keywords });
    return NextResponse.json({ keywords });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
