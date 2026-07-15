import { supabase } from "./supabase-browser";
import { ensureSession, resetSessionCache, mergeAnonymousInto } from "./session";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

export type AuthUser = User;
export type AuthSession = Session;

// ── Sign up ───────────────────────────────────────────────────
// If the current session is anonymous, upgrade it IN PLACE — same uid, so all
// existing rows are already owned by the now-permanent account. Otherwise this
// is a fresh signup (e.g. after an explicit sign-out).

export async function signUp(email: string, password: string) {
  const session = await ensureSession();

  if (session.user.is_anonymous) {
    const { data, error } = await supabase.auth.updateUser({ email, password });
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

// ── Sign in ───────────────────────────────────────────────────
// If this browser had an anonymous session with local data, merge it into the
// account being signed into (best-effort, non-fatal).

export async function signIn(email: string, password: string) {
  const session = await ensureSession();
  const anonUserId = session.user.is_anonymous ? session.user.id : null;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  if (anonUserId) {
    try {
      await mergeAnonymousInto(anonUserId);
    } catch (e) {
      // Non-fatal but worth surfacing — anon data won't transfer silently.
      console.warn("[auth] anon→account merge failed after signIn:", e);
    }
  }
  return data;
}

// ── Sign out ──────────────────────────────────────────────────

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  resetSessionCache();
  // Re-establish a fresh anonymous session immediately so the app keeps working.
  await ensureSession();
}

// ── Session ───────────────────────────────────────────────────

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(cb: (session: Session | null, event: AuthChangeEvent) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    cb(session, event);
  });
  return () => subscription.unsubscribe();
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
