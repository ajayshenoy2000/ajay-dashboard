import { NextRequest, NextResponse } from "next/server";
import { getDataAccess, setDataAccess } from "@/lib/chatbot/server/dataAccess";
import { getAuthContext } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getDataAccess(auth.db, auth.userId));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    return NextResponse.json(await setDataAccess(auth.db, auth.userId, body));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
