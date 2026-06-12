"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarCheck, LogIn, LogOut, MapPin, RefreshCw } from "lucide-react";

const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const TOKEN_KEY = "gcalToken";
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

interface CalEvent {
  id: string;
  title: string;
  location: string;
  allDay: boolean;
  start: Date;
  end: Date;
  link: string;
}

function storeToken(token: string, expiresIn: number) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify({
    token,
    expiresAt: Date.now() + expiresIn * 1000 - 60000,
  }));
}

function loadToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const { token, expiresAt } = JSON.parse(raw);
    if (Date.now() < expiresAt) return token;
  } catch { /* noop */ }
  localStorage.removeItem(TOKEN_KEY);
  return null;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatTag(d: Date) {
  const today = new Date();
  const tom = new Date(today); tom.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tom.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

async function fetchEvents(token: string, timeMin: Date, timeMax: Date): Promise<CalEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "20",
  });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`Calendar API ${res.status}`);
  const data = await res.json();
  return (data.items ?? []).map((item: Record<string, unknown>) => {
    const s = item.start as Record<string, string>;
    const e = item.end as Record<string, string>;
    const allDay = !!s.date;
    return {
      id: item.id as string,
      title: (item.summary as string) || "(No title)",
      location: (item.location as string) || "",
      allDay,
      start: new Date(s.dateTime || s.date),
      end: new Date(e.dateTime || e.date),
      link: item.htmlLink as string,
    };
  });
}

export default function CalendarPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [todayEvents, setTodayEvents] = useState<CalEvent[]>([]);
  const [weekEvents, setWeekEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(true);
  const tokenClientRef = useRef<{ requestAccessToken: (opts: { prompt: string }) => void } | null>(null);

  const todayDateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  useEffect(() => {
    if (!CLIENT_ID || CLIENT_ID.startsWith("YOUR_")) {
      setConfigured(false);
      return;
    }
    const existing = loadToken();
    if (existing) { setSignedIn(true); loadCalendar(existing); }
  }, []);

  function getOrCreateTokenClient(onToken: (token: string) => void) {
    const win = window as unknown as { google?: { accounts?: { oauth2?: { initTokenClient: (opts: unknown) => unknown; revoke: (t: string, cb: () => void) => void } } } };
    if (!win.google?.accounts?.oauth2) { setError("Google Identity Services failed to load."); return; }
    if (!tokenClientRef.current) {
      tokenClientRef.current = win.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: (resp: { error?: string; access_token: string; expires_in: number }) => {
          if (resp.error) { setError("Sign-in failed. Try again."); return; }
          storeToken(resp.access_token, resp.expires_in);
          setSignedIn(true);
          onToken(resp.access_token);
        },
      }) as typeof tokenClientRef.current;
    }
    tokenClientRef.current!.requestAccessToken({ prompt: "consent" });
  }

  async function loadCalendar(token: string) {
    setLoading(true);
    setError("");
    try {
      const now = new Date();
      const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(startOfToday); endOfToday.setDate(endOfToday.getDate() + 1);
      const endOfWeek = new Date(startOfToday); endOfWeek.setDate(endOfWeek.getDate() + 7);
      const [te, we] = await Promise.all([
        fetchEvents(token, startOfToday, endOfToday),
        fetchEvents(token, endOfToday, endOfWeek),
      ]);
      setTodayEvents(te);
      setWeekEvents(we.slice(0, 8));
    } catch (e) {
      if ((e as Error).message === "UNAUTHORIZED") {
        localStorage.removeItem(TOKEN_KEY);
        setSignedIn(false);
        setError("Session expired — sign in again.");
      } else {
        setError("Could not load calendar. Try refreshing.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSignIn() {
    getOrCreateTokenClient((token) => loadCalendar(token));
  }

  function handleSignOut() {
    localStorage.removeItem(TOKEN_KEY);
    setSignedIn(false);
    setTodayEvents([]);
    setWeekEvents([]);
  }

  function handleRefresh() {
    const token = loadToken();
    if (token) loadCalendar(token);
    else handleSignIn();
  }

  if (!configured) {
    return (
      <div className="pb-10">
        <div className="mb-5">
          <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold text-ink/50 hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
        </div>
        <div className="rounded-xl border border-ink/10 bg-white p-6 text-center shadow-soft">
          <CalendarCheck className="mx-auto mb-3 h-10 w-10 text-ink/30" />
          <p className="font-semibold">Google Calendar not configured</p>
          <p className="mt-1 text-sm text-ink/50">Set <code className="rounded bg-mist px-1 py-0.5 text-xs">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in your environment.</p>
        </div>
      </div>
    );
  }

  const heroText = !signedIn
    ? "Sign in to see your events for the day right here."
    : todayEvents.length === 0
    ? "Your calendar is clear today. Zero meetings — make the most of it!"
    : `You have ${todayEvents.length} event${todayEvents.length !== 1 ? "s" : ""} today. Next up: ${todayEvents[0].title}${todayEvents[0].allDay ? "" : ` at ${formatTime(todayEvents[0].start)}`}.`;

  return (
    <div className="pb-10">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold text-ink/50 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        {signedIn && (
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} className={`flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 text-ink/50 transition hover:text-ink ${loading ? "animate-spin" : ""}`}>
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={handleSignOut} className="flex items-center gap-1.5 rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink/60 hover:text-ink">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        )}
      </div>

      <header className="mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-sm text-ink/50">{todayDateStr}</p>
      </header>

      {/* Hero banner */}
      <div className="mb-5 rounded-xl bg-ink p-5 text-white shadow-soft">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-gold">Today at a glance</p>
        <p className="text-sm leading-6 text-white/85">{heroText}</p>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p>}

      {!signedIn ? (
        <div className="rounded-xl border border-ink/10 bg-white p-8 text-center shadow-soft">
          <CalendarCheck className="mx-auto mb-4 h-12 w-12 text-ink/20" />
          <p className="font-bold">Connect Google Calendar</p>
          <p className="mb-5 mt-1 text-sm text-ink/50">See your events, meetings, and schedule in one place.</p>
          <button onClick={handleSignIn} className="inline-flex items-center gap-2 rounded-lg bg-coral px-5 py-2.5 text-sm font-bold text-white transition hover:bg-coral/85">
            <LogIn className="h-4 w-4" /> Sign in with Google
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-ink/5" />)}
        </div>
      ) : (
        <>
          {/* Today's events */}
          <section className="mb-5">
            <h2 className="mb-3 text-base font-bold">Today</h2>
            {todayEvents.length === 0 ? (
              <p className="rounded-xl border border-ink/10 bg-white px-5 py-4 text-sm text-ink/40 shadow-soft">Nothing today — enjoy the free time!</p>
            ) : (
              <div className="space-y-2">
                {todayEvents.map((ev) => <EventCard key={ev.id} ev={ev} />)}
              </div>
            )}
          </section>

          {/* Upcoming (next 7 days) */}
          <section>
            <h2 className="mb-3 text-base font-bold">Next 7 Days</h2>
            {weekEvents.length === 0 ? (
              <p className="rounded-xl border border-ink/10 bg-white px-5 py-4 text-sm text-ink/40 shadow-soft">Nothing coming up.</p>
            ) : (
              <div className="space-y-2">
                {weekEvents.map((ev) => <EventCard key={ev.id} ev={ev} showTag />)}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function EventCard({ ev, showTag }: { ev: CalEvent; showTag?: boolean }) {
  return (
    <a
      href={ev.link}
      target="_blank"
      rel="noreferrer"
      className="flex items-start gap-3 rounded-xl border border-ink/10 bg-white p-4 shadow-soft transition hover:border-ink/25"
    >
      <div className="mt-0.5 w-16 shrink-0 text-xs font-bold text-ink/50">
        {ev.allDay ? "All day" : formatTime(ev.start)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{ev.title}</p>
        {ev.location && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink/50">
            <MapPin className="h-3 w-3 shrink-0" /> {ev.location}
          </p>
        )}
        {showTag && (
          <p className="mt-1 text-xs font-semibold text-sage">{formatTag(ev.start)}</p>
        )}
      </div>
    </a>
  );
}
