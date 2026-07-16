import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";

export async function DELETE(req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { error } = await auth.db.from("mio_library_items").delete()
    .eq("user_id", auth.userId).eq("library_id", params.id).eq("id", params.itemId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await auth.db.from("mio_libraries").update({ updated_at: new Date().toISOString() }).eq("user_id", auth.userId).eq("id", params.id);
  return NextResponse.json({ deleted: params.itemId });
}
