// Sends a push notification via OneSignal (Phase 5 of the overhaul plan).
// Returns false (never throws) when OneSignal isn't configured yet, so
// callers — currently only the Tasks due-reminders cron — can run safely
// before Phase 5's ONESIGNAL_APP_ID/ONESIGNAL_API_KEY are set.
//
// Requires the client to have called OneSignal.login(userId) (Phase 5's
// pushClient.ts) so `external_id` below resolves to a real subscribed device.
export async function sendPush(userId: string, title: string, body: string): Promise<boolean> {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_API_KEY;
  if (!appId || !apiKey) return false;

  try {
    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        include_aliases: { external_id: [userId] },
        target_channel: "push",
        headings: { en: title },
        contents: { en: body },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
