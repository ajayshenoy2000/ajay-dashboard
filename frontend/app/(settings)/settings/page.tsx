"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, CircleUserRound, KeyRound, Link2, LogOut, Save, Youtube } from "lucide-react";
import { getSettings, updateChannelId } from "@/lib/api";
import { getSession, signOut } from "@/lib/auth";
import type { AppSettings } from "@/lib/types";

export default function GlobalSettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [identity, setIdentity] = useState({ name: "Guest", email: "Anonymous session", anonymous: true });
  const [channelId, setChannelId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getSettings(), getSession()]).then(([appSettings, session]) => {
      setSettings(appSettings);
      setChannelId(appSettings.channelId ?? "");
      if (session?.user) {
        const metadata = session.user.user_metadata;
        const name = metadata?.full_name || metadata?.name || session.user.email?.split("@")[0] || "Guest";
        setIdentity({ name, email: session.user.email ?? "Anonymous session", anonymous: Boolean(session.user.is_anonymous) });
      }
    });
  }, []);

  async function saveChannel() {
    if (!channelId.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateChannelId(channelId.trim());
      setSettings((current) => current ? { ...current, channelId: channelId.trim() } : current);
      setMessage("YouTube channel connected");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not connect channel");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <header className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sage">Workspace</p>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-ink/45">Account, connections, and shared app services.</p>
      </header>

      <section className="mb-3 flex items-center gap-3 rounded-3xl border border-ink/10 bg-white p-4 shadow-soft">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage/12 text-sage"><CircleUserRound className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{identity.name}</p>
          <p className="truncate text-xs text-ink/40">{identity.email}</p>
        </div>
        {!identity.anonymous && <button onClick={() => signOut()} aria-label="Sign out" className="flex h-10 w-10 items-center justify-center rounded-xl bg-mist text-ink/40"><LogOut className="h-4 w-4" /></button>}
      </section>

      <div className="space-y-2">
        <SettingsGroup icon={Youtube} title="YouTube channel" summary={settings?.channelId ? "Connected" : "Not connected"} open>
          <p className="mb-3 text-xs leading-5 text-ink/45">Connect a channel once. Trend searches can then score opportunities against its historical performance.</p>
          <div className="flex gap-2">
            <input value={channelId} onChange={(event) => setChannelId(event.target.value)} placeholder="Channel ID" className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-mist px-3 text-sm outline-none focus:border-sage" />
            <button onClick={saveChannel} disabled={saving || !channelId.trim()} className="flex h-11 items-center gap-1.5 rounded-xl bg-ink px-3 text-xs font-bold text-white disabled:opacity-30"><Save className="h-3.5 w-3.5" /> {saving ? "Analyzing…" : "Save"}</button>
          </div>
          {message && <p className="mt-2 text-xs font-semibold text-sage">{message}</p>}
        </SettingsGroup>

        <SettingsGroup icon={KeyRound} title="Service connections" summary="Availability across apps">
          <div className="grid grid-cols-2 gap-2">
            <Connection label="YouTube API" connected={Boolean(settings?.apiKeys.youtube)} />
            <Connection label="OpenRouter" connected={Boolean(settings?.apiKeys.openrouter)} />
            <Connection label="X data" connected={Boolean(settings?.apiKeys.x)} />
            <Connection label="Supabase" connected />
          </div>
          <p className="mt-3 text-[11px] leading-5 text-ink/40">Secret keys are managed in deployment settings and are never exposed in this app.</p>
        </SettingsGroup>

        <SettingsGroup icon={Link2} title="Connected apps" summary="Shared data is scoped to your account">
          <div className="grid grid-cols-2 gap-2 text-xs font-bold text-ink/55">
            {["Trend Engine", "MetaScraper", "Tasks", "PowerChat"].map((label) => <div key={label} className="flex items-center gap-2 rounded-xl bg-mist px-3 py-2.5"><CheckCircle2 className="h-3.5 w-3.5 text-sage" /> {label}</div>)}
          </div>
        </SettingsGroup>
      </div>
    </div>
  );
}

function SettingsGroup({ icon: Icon, title, summary, open, children }: { icon: typeof Youtube; title: string; summary: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group rounded-3xl border border-ink/10 bg-white shadow-soft">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mist text-ink/50"><Icon className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{title}</span><span className="block truncate text-[11px] text-ink/40">{summary}</span></span>
        <ChevronDown className="h-4 w-4 text-ink/30 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-ink/6 px-4 pb-4 pt-3">{children}</div>
    </details>
  );
}

function Connection({ label, connected }: { label: string; connected: boolean }) {
  return <div className="rounded-2xl bg-mist p-3"><span className={`mb-2 block h-2 w-2 rounded-full ${connected ? "bg-sage" : "bg-ink/20"}`} /><p className="text-xs font-bold">{label}</p><p className="text-[10px] text-ink/40">{connected ? "Available" : "Not configured"}</p></div>;
}
