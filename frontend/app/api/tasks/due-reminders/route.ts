import { NextRequest, NextResponse } from "next/server";
import { getDueReminders, markReminderSent } from "@/lib/tasks/server/service";
import { sendPush } from "@/lib/notifications/push";

export const dynamic = "force-dynamic";

// Cron target (see vercel.json). Not user-scoped — runs under the
// service-role key across every user's due reminders. Guarded by a shared
// secret rather than requireUserId, matching the pattern already used by
// /api/metascraper/capture for other non-session-based callers.
function checkCronSecret(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true; // open when unset (local dev / before Phase 5's cron is enabled)
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

export async function GET(req: NextRequest) {
  if (!checkCronSecret(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const due = await getDueReminders();
    let sent = 0;
    for (const reminder of due) {
      const ok = await sendPush(reminder.userId, "Task due", reminder.title);
      if (ok) {
        await markReminderSent(reminder.id);
        sent++;
      }
    }
    return NextResponse.json({ checked: due.length, sent });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
