import { NextRequest, NextResponse } from "next/server";
import { getConfig, putConfig } from "@/lib/metascraper/server/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getConfig());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.config?.niches || !body?.config?.global) {
      return NextResponse.json({ error: "config must include 'global' and 'niches'" }, { status: 400 });
    }
    return NextResponse.json(await putConfig(body.config));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
