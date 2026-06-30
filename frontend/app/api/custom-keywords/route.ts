import { NextRequest, NextResponse } from "next/server";
import { getCustomKeywords, setCustomKeywords } from "@/lib/trend-engine/server/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getCustomKeywords());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { keywords, useCustomOnly } = await req.json();
    await setCustomKeywords(Array.isArray(keywords) ? keywords : [], Boolean(useCustomOnly));
    return NextResponse.json(await getCustomKeywords());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
