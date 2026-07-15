import { NextRequest, NextResponse } from "next/server";
import { listConversations } from "@/lib/chatbot/server/service";
import { getAuthContext } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await listConversations(auth.db, auth.userId));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
