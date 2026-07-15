import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// For Server Components / Route Handlers that need the current session
// without an explicit Authorization header (see lib/server/auth.ts's
// requireUserId for the header-based equivalent used by client-fetched API
// routes). Relies on lib/supabase-browser.ts's createBrowserClient mirroring
// the session into cookies.
async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Server Components can't set cookies (only Server Actions/Route
        // Handlers/middleware can) — safe to no-op here, since the browser
        // client already keeps the cookie fresh on its own.
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // no-op, see above
        }
      },
    },
  });
}

// Returns the current session's user id, or null if there is none yet (e.g.
// a very first cold visit that lands directly on a Server Component route
// before the client-side ensureSession() anonymous sign-in has ever run).
export async function getServerUserId(): Promise<string | null> {
  const client = await createServerSupabaseClient();
  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}
