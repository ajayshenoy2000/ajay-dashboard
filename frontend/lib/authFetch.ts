import { ensureSession } from "./session";

// Every API call needs to carry the current (anonymous-or-real) session's
// access token so the server can resolve `userId` via requireUserId() in
// lib/server/auth.ts. This wraps the global fetch to attach it automatically —
// use this instead of bare fetch() for any /api/** call from client code.
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const session = await ensureSession();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  return fetch(input, { ...init, headers });
}
