"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { API_BASE } from "@/lib/api-config";
import { clearTrendHistory, updateChannelId } from "@/lib/api";

interface Settings {
  keywords: string[];
  apiKeys: {
    youtube: boolean;
    x: boolean;
    anthropic: boolean;
    openai: boolean;
  };
  channelId: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [clearHours, setClearHours] = useState(168);
  const [clearing, setClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState<string | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);
  const [channelIdInput, setChannelIdInput] = useState("");
  const [updatingChannel, setUpdatingChannel] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [channelSuccess, setChannelSuccess] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setKeywords(data.keywords);
      })
      .catch((err) => setError(err.message));
  }, []);

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const handleSaveKeywords = async () => {
    if (keywords.length === 0) {
      setError("Please add at least one keyword");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const response = await fetch(`${API_BASE}/api/keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords }),
      });
      if (!response.ok) throw new Error("Failed to save keywords");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving keywords");
    } finally {
      setSaving(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm(`Delete trend history older than the selected interval? Briefs are never deleted.`)) return;
    setClearing(true);
    setClearError(null);
    setClearMessage(null);
    try {
      const result = await clearTrendHistory(clearHours);
      setClearMessage(`Removed ${result.deletedCount} old trend${result.deletedCount === 1 ? "" : "s"} from history.`);
    } catch (err) {
      setClearError(err instanceof Error ? err.message : "Failed to clear history");
    } finally {
      setClearing(false);
    }
  };

  const handleUpdateChannelId = async () => {
    if (!channelIdInput.trim()) {
      setChannelError("Please enter a valid YouTube Channel ID");
      return;
    }
    setUpdatingChannel(true);
    setChannelError(null);
    setChannelSuccess(false);
    try {
      const result = await updateChannelId(channelIdInput.trim());
      if (result.success) {
        setChannelSuccess(true);
        setChannelIdInput("");
        setSettings((prev) => prev ? { ...prev, channelId: channelIdInput.trim() } : null);
        setTimeout(() => setChannelSuccess(false), 3000);
      }
    } catch (err) {
      setChannelError(err instanceof Error ? err.message : "Failed to update channel ID");
    } finally {
      setUpdatingChannel(false);
    }
  };

  if (!settings) return <div>Loading...</div>;

  return (
    <div>
      <Header title="Settings" subtitle="API connection status and searchable keywords. Keywords are used when you run Search Now. Edit below to customize your search." />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-md border border-ink/10 bg-white p-4 shadow-soft lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold">API Connections</h2>
          <div className="space-y-3 text-sm">
            <Status label="YouTube API Key" ready={settings.apiKeys.youtube} />
            <Status label="YouTube Channel ID" ready={Boolean(settings.channelId)} value={settings.channelId || "Not set"} />
            <Status label="X Bearer Token" ready={settings.apiKeys.x} />
            <Status label="Anthropic API Key" ready={settings.apiKeys.anthropic} />
            <Status label="OpenAI API Key" ready={settings.apiKeys.openai} />
          </div>
        </section>
        <section className="rounded-md border border-ink/10 bg-white p-4 shadow-soft lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold">Search Keywords</h2>
          <div className="mb-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddKeyword()}
                placeholder="Add a keyword..."
                className="min-h-11 flex-1 rounded-md border border-ink/10 bg-mist px-3 text-sm outline-none focus:border-sage"
              />
              <button
                onClick={handleAddKeyword}
                disabled={!newKeyword.trim()}
                className="min-h-11 rounded-md bg-sage px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-ink/25"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword) => (
                <div
                  key={keyword}
                  className="flex items-center gap-2 rounded-md bg-sage/10 px-3 py-2 text-sm font-bold text-sage"
                >
                  {keyword}
                  <button
                    onClick={() => handleRemoveKeyword(keyword)}
                    className="flex h-4 w-4 items-center justify-center hover:opacity-70"
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {error && <p className="text-sm text-coral">{error}</p>}
            {success && <p className="text-sm text-sage font-bold">Keywords updated!</p>}
          </div>
          <button
            onClick={handleSaveKeywords}
            disabled={saving || keywords.length === 0}
            className="min-h-11 w-full rounded-md bg-sage px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-ink/25"
          >
            {saving ? "Saving..." : "Save Keywords"}
          </button>
        </section>
        <section className="rounded-md border border-ink/10 bg-white p-4 shadow-soft lg:col-span-2">
          <h2 className="mb-1 text-xl font-bold">YouTube Channel Profile</h2>
          <p className="mb-4 text-sm text-ink/60">
            Set your YouTube Channel ID to enable the "Check for Channel Fit" feature in Search Now. This analyzes your channel's baseline engagement to identify trends that deviate significantly from your normal performance.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={channelIdInput}
              onChange={(e) => setChannelIdInput(e.target.value)}
              placeholder="e.g., UCdL6_NGoK0NMkB2zB46couA"
              className="min-h-11 flex-1 rounded-md border border-ink/10 bg-mist px-3 text-sm outline-none focus:border-sage"
            />
            <button
              onClick={handleUpdateChannelId}
              disabled={updatingChannel}
              className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-sage px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-ink/25"
            >
              {updatingChannel ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {updatingChannel ? "Analyzing..." : "Update"}
            </button>
          </div>
          {channelError && <p className="mt-3 text-sm text-coral">{channelError}</p>}
          {channelSuccess && <p className="mt-3 text-sm font-bold text-sage">Channel profile updated successfully!</p>}
        </section>
        <section className="rounded-md border border-ink/10 bg-white p-4 shadow-soft lg:col-span-2">
          <h2 className="mb-1 text-xl font-bold">Clear Trend History</h2>
          <p className="mb-4 text-sm text-ink/60">
            Permanently delete trend history entries older than the selected interval. The most recent search results
            (Home tab) and ALL briefs are never deleted.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={clearHours}
              onChange={(e) => setClearHours(Number(e.target.value))}
              className="min-h-11 flex-1 rounded-md border border-ink/10 bg-mist px-3 text-sm outline-none focus:border-sage"
            >
              <option value={24}>Older than 1 day</option>
              <option value={72}>Older than 3 days</option>
              <option value={168}>Older than 7 days</option>
              <option value={336}>Older than 14 days</option>
              <option value={720}>Older than 30 days</option>
              <option value={2160}>Older than 90 days</option>
            </select>
            <button
              onClick={handleClearHistory}
              disabled={clearing}
              className="min-h-11 rounded-md bg-coral px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-ink/25"
            >
              {clearing ? "Clearing..." : "Clear History"}
            </button>
          </div>
          {clearError && <p className="mt-3 text-sm text-coral">{clearError}</p>}
          {clearMessage && <p className="mt-3 text-sm font-bold text-sage">{clearMessage}</p>}
        </section>
      </div>
    </div>
  );
}

function Status({ label, ready, value }: { label: string; ready: boolean; value?: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-md bg-mist px-3">
      <span className="font-bold text-ink/70">{label}</span>
      <span className={`rounded-md px-2 py-1 text-xs font-bold ${ready ? "bg-sage/15 text-sage" : "bg-coral/10 text-coral"}`}>
        {value ?? (ready ? "Configured" : "Missing")}
      </span>
    </div>
  );
}
