import { NextRequest, NextResponse } from "next/server";
import { getRegionCode, setRegionCode } from "@/lib/trend-engine/server/service";

export async function GET() {
  try {
    return NextResponse.json({ regionCode: await getRegionCode() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { regionCode } = await req.json();
    await setRegionCode(String(regionCode ?? "JP"));
    return NextResponse.json({ regionCode: await getRegionCode() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
