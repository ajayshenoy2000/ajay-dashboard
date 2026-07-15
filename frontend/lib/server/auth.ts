import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

let anonClient: ReturnType<typeof createClient> | null = null;

function getAnonClient() {
  if (anonClient) return anonClient;
  // NEXT_PUBLIC_SUPABASE_URL, not the server-only SUPABASE_URL: this client only
  // ever validates a bearer token with the anon key, so it needs the same public
  // URL the browser client uses, not the service-role-only variable.
  anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return anonClient;
}

// Resolves the calling user's id from either:
// 1. An `Authorization: Bearer <access_token>` header — used by every call
//    site that goes through lib/authFetch.ts.
// 2. The Supabase session cookie — a fallback for any request that reaches
//    an API route via a plain same-origin fetch() without that header
//    (browsers attach cookies automatically, so this is what keeps those
//    requests working rather than silently 401ing).
// Never uses the service-role key, so a forged/expired token/cookie can't be
// used to impersonate another user. Returns null if neither resolves — callers
// should respond 401 in that case.
export async function requireUserId(req: NextRequest): Promise<string | null> {
  const auth = await getAuthContext(req);
  return auth?.userId ?? null;
}

export interface AuthContext {
  userId: string;
  // An RLS-scoped Supabase client authenticated AS the calling user (never the
  // service-role key). Every query through it runs under `auth.uid() = <user>`
  // row-level security. Used by the chatbot so its persistence works in any
  // environment with only the public anon key present (no server-only
  // SUPABASE_SERVICE_KEY needed), and is defense-in-depth vs. the service-role
  // pattern the older sub-apps use.
  db: SupabaseClient;
}

export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // 1. Bearer-token path (client calls via lib/authFetch.ts).
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    const { data, error } = await getAnonClient().auth.getUser(token);
    if (!error && data.user) {
      const db = createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      });
      return { userId: data.user.id, db };
    }
  }

  // 2. Cookie path (plain same-origin fetch without the bearer header).
  const db = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: () => {
        // Route Handlers are read-only here — no response object to attach
        // refreshed cookies to. The browser client refreshes its own cookie
        // independently, so this is safe to no-op.
      },
    },
  });
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return null;
  return { userId: data.user.id, db };
}
