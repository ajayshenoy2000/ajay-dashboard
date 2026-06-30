import { NextRequest, NextResponse } from "next/server";
import { patchAd } from "@/lib/metascraper/server/service";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { library_id: string } },
) {
  try {
    const body = await req.json();
    const updated = await patchAd(params.library_id, {
      hook_category: body.hook_category,
      notes: body.notes,
    });
    if (!updated) return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
