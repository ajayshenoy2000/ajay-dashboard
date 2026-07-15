/**
 * Identity bootstrap. Every visitor — anonymous or signed in — gets a real
 * Supabase auth session with a real `auth.uid()`. Anonymous visitors get one
 * via `supabase.auth.signInAnonymously()`, which creates a real `auth.users`
 * row (`is_anonymous = true`). RLS everywhere is a single `auth.uid() = user_id`
 * check — there is no separate device_id model.
 *
 * "Claiming" anonymous history on signup happens IN PLACE via
 * `supabase.auth.updateUser()` on the existing anonymous session (same uid,
 * see auth.ts `signUp`). `mergeAnonymousInto` below covers the secondary case
 * of signing in to a *different*, pre-existing account.
 */

import { supabase } from "./supabase-browser";
import type { Session } from "@supabase/supabase-js";

let ensurePromise: Promise<Session> | null = null;

// Resolves to the current session, creating an anonymous one if none exists.
// Safe to call repeatedly/concurrently — only signs in anonymously once.
export function ensureSession(): Promise<Session> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) return session;
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error || !data.session) throw error ?? new Error("Anonymous sign-in failed");
      return data.session;
    })();
  }
  return ensurePromise;
}

// Reset the cached session promise — call after sign-out so the next
// ensureSession() re-checks (and re-establishes an anonymous session).
export function resetSessionCache(): void {
  ensurePromise = null;
}

export async function getCurrentUserId(): Promise<string> {
  const session = await ensureSession();
  return session.user.id;
}

// Reassign an anonymous user's rows to the currently-authenticated account.
// The server-side RPC restricts the source to still-anonymous users — see
// supabase/migrations/*_merge_rpc.sql `merge_anonymous_into_account`.
export async function mergeAnonymousInto(anonUserId: string): Promise<void> {
  if (!anonUserId) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id === anonUserId) return;
  const { error } = await supabase.rpc("merge_anonymous_into_account", { p_anon_user_id: anonUserId });
  if (error) throw error;
}
