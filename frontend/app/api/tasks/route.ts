import { NextRequest, NextResponse } from "next/server";
import { listTasks, createTask } from "@/lib/tasks/server/service";
import { requireUserId } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const groupId = req.nextUrl.searchParams.get("groupId") ?? undefined;
    const includeDone = req.nextUrl.searchParams.get("includeDone") === "true";
    return NextResponse.json(await listTasks(userId, { groupId, includeDone }));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body?.title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
    const task = await createTask(userId, {
      title: String(body.title).trim(),
      notes: body.notes ?? null,
      groupId: body.groupId ?? null,
      parentTaskId: body.parentTaskId ?? null,
      dueAt: body.dueAt ?? null,
      recurrenceRule: body.recurrenceRule ?? null,
      reminderAt: body.reminderAt ?? null,
    });
    return NextResponse.json(task);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
