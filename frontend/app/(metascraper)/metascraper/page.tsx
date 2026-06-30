"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check, ChevronDown, Clipboard, Copy, Plus, RotateCcw, Save, Terminal, Upload, X,
} from "lucide-react";
import { MetaHeader, MetaSubNav } from "@/components/metascraper/MetaSubNav";
import { getConfig, getIngestToken, importCapture, resetConfig, saveConfig } from "@/lib/metascraper/api";
import { buildHuntCommand } from "@/lib/metascraper/command";
import type { AppConfig, Competitor, Niche, NicheMode } from "@/lib/metascraper/types";

const PLATFORMS = ["FACEBOOK", "INSTAGRAM", "MESSENGER", "AUDIENCE_NETWORK"];
const MEDIA_TYPES = ["all", "image", "video", "carousel"];
const MODES: NicheMode[] = ["keyword", "competitors", "both"];
const GROUP_ORDER = ["surgical", "injectable", "skin", "hair_removal", "body", "hair_loss", "mens", "other"];
const TOKEN_KEY = "metascraper.ingestToken";

export default function MetaScraperConsole() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [groupLabels, setGroupLabels] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [command, setCommand] = useState<string>("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [ingestToken, setIngestToken] = useState("");
  const [autoSubmit, setAutoSubmit] = useState(true);

  useEffect(() => {
    getConfig().then((res) => {
      if (res) {
        setConfig(res.config);
        setGroupLabels(res.groupLabels);
      }
    });
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      setIngestToken(stored);
    } else {
      getIngestToken().then((t) => {
        if (t) {
          setIngestToken(t);
          localStorage.setItem(TOKEN_KEY, t);
        }
      });
    }
  }, []);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const mutate = useCallback((fn: (draft: AppConfig) => void) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev) as AppConfig;
      fn(next);
      return next;
    });
    setDirty(true);
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, Niche[]> = {};
    (config?.niches ?? []).forEach((n) => (map[n.group] ??= []).push(n));
    return map;
  }, [config]);

  const enabledCount = config?.niches.filter((n) => n.enabled).length ?? 0;

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      const saved = await saveConfig(config);
      setConfig(saved);
      setDirty(false);
      flash("Config saved.");
    } catch {
      flash("Save failed — is the backend running?");
    }
    setSaving(false);
  }

  async function handleReset() {
    if (!confirm("Reset all niches and settings to seed defaults?")) return;
    try {
      const seeded = await resetConfig();
      setConfig(seeded);
      setDirty(false);
      flash("Reset to seed defaults.");
    } catch {
      flash("Reset failed.");
    }
  }

  function handleGenerate() {
    if (!config) return;
    localStorage.setItem(TOKEN_KEY, ingestToken);
    const cmd = buildHuntCommand(config, {
      ingestUrl: autoSubmit ? `${window.location.origin}/api/metascraper/capture` : null,
      ingestToken: autoSubmit ? ingestToken.trim() || null : null,
    });
    setCommand(cmd);
    navigator.clipboard?.writeText(cmd).then(
      () => flash("Command copied."),
      () => flash("Command generated (copy manually)."),
    );
  }

  if (!config) {
    return (
      <>
        <MetaHeader subtitle="Loading console…" />
        <div className="h-64 animate-pulse rounded-2xl bg-ink/8" />
      </>
    );
  }

  return (
    <>
      <MetaHeader subtitle="Configure the weekly Meta Ad Library hunt, then generate a command to paste into Claude-in-Chrome." />
      <MetaSubNav />

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(24,33,31,0.25)]">
          {toast}
        </div>
      )}

      {/* Global settings bar */}
      <section className="mb-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink/40">Global filters</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink/55">Country</span>
            <input
              value={config.global.country}
              onChange={(e) => mutate((d) => (d.global.country = e.target.value.toUpperCase()))}
              className="w-full rounded-xl border border-ink/12 bg-mist px-3 py-2 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink/55">Media type</span>
            <div className="relative">
              <select
                value={config.global.media_type}
                onChange={(e) => mutate((d) => (d.global.media_type = e.target.value as AppConfig["global"]["media_type"]))}
                className="w-full appearance-none rounded-xl border border-ink/12 bg-mist px-3 py-2 text-sm outline-none focus:border-coral"
              >
                {MEDIA_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink/55">Capture depth (ads/source)</span>
            <input
              type="number"
              min={1}
              max={100}
              value={config.global.capture_depth}
              onChange={(e) => mutate((d) => (d.global.capture_depth = Math.max(1, Number(e.target.value) || 1)))}
              className="w-full rounded-xl border border-ink/12 bg-mist px-3 py-2 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
            />
          </label>
          <div className="block">
            <span className="mb-1 block text-xs font-semibold text-ink/55">Platforms</span>
            <div className="flex flex-wrap gap-1">
              {PLATFORMS.map((p) => {
                const on = config.global.platforms.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => mutate((d) => {
                      d.global.platforms = on
                        ? d.global.platforms.filter((x) => x !== p)
                        : [...d.global.platforms, p];
                    })}
                    className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
                      on ? "bg-coral text-white" : "bg-ink/6 text-ink/45 hover:bg-ink/10"
                    }`}
                  >
                    {p.replace("AUDIENCE_NETWORK", "AUD NET")}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Generate hunt command — the signature element */}
      <section className="mb-4 overflow-hidden rounded-2xl bg-ink p-5 text-white shadow-[0_8px_32px_rgba(24,33,31,0.2)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gold">
            <Terminal className="h-4 w-4" /> Hunt command
          </span>
          <span className="text-xs text-white/50">{enabledCount} niche{enabledCount !== 1 ? "s" : ""} enabled</span>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={autoSubmit} onChange={(e) => setAutoSubmit(e.target.checked)} className="h-4 w-4 accent-coral" />
            <span className="text-white/75">Auto-submit to backend (no manual import)</span>
          </label>
          {autoSubmit && (
            <input
              value={ingestToken}
              onChange={(e) => setIngestToken(e.target.value)}
              placeholder="Ingest token (optional)"
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white placeholder-white/40 outline-none focus:border-gold"
            />
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={enabledCount === 0}
          className="mb-3 inline-flex items-center gap-2 rounded-xl bg-coral px-4 py-2.5 text-sm font-bold text-white transition hover:bg-coral/85 active:scale-95 disabled:opacity-40"
        >
          <Copy className="h-4 w-4" /> Generate hunt command
        </button>
        {command && (
          <pre className="max-h-72 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] leading-5 text-white/80 whitespace-pre-wrap break-words">
            {command}
          </pre>
        )}
        {enabledCount === 0 && <p className="text-xs text-white/45">Enable at least one niche below to build a command.</p>}
      </section>

      {/* Import captures (manual fallback) */}
      <ImportPanel onImported={(msg) => flash(msg)} />

      {/* Niche manager */}
      <section className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Niches & competitors</h2>
          <div className="flex gap-2">
            <button onClick={handleReset} className="inline-flex items-center gap-1.5 rounded-xl border border-ink/12 px-3 py-2 text-xs font-semibold text-ink/55 transition hover:bg-ink/5">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white transition hover:bg-ink/85 active:scale-95 disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {GROUP_ORDER.filter((g) => grouped[g]?.length).map((group) => {
            const isCollapsed = collapsed.has(group);
            const niches = grouped[group];
            const onCount = niches.filter((n) => n.enabled).length;
            return (
              <div key={group} className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-soft">
                <button
                  onClick={() => setCollapsed((prev) => {
                    const next = new Set(prev);
                    next.has(group) ? next.delete(group) : next.add(group);
                    return next;
                  })}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-mist/60"
                >
                  <span className="flex items-center gap-2 font-bold">
                    {groupLabels[group] ?? group}
                    <span className="rounded-full bg-coral/12 px-2 py-0.5 text-[10px] font-bold text-coral">{onCount}/{niches.length}</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-ink/40 transition-transform ${isCollapsed ? "" : "rotate-180"}`} />
                </button>
                {!isCollapsed && (
                  <div className="divide-y divide-ink/6 border-t border-ink/6">
                    {niches.map((niche) => (
                      <NicheRow key={niche.id} niche={niche} mutate={mutate} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

// ─── Niche row ────────────────────────────────────────────────────────────────
function NicheRow({ niche, mutate }: { niche: Niche; mutate: (fn: (d: AppConfig) => void) => void }) {
  const [keywordInput, setKeywordInput] = useState("");
  const [compName, setCompName] = useState("");
  const [compUrl, setCompUrl] = useState("");

  const edit = (fn: (n: Niche) => void) =>
    mutate((d) => {
      const target = d.niches.find((x) => x.id === niche.id);
      if (target) fn(target);
    });

  return (
    <div className={`px-4 py-3 transition ${niche.enabled ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => edit((n) => (n.enabled = !n.enabled))}
          className={`relative h-5 w-9 shrink-0 rounded-full transition ${niche.enabled ? "bg-coral" : "bg-ink/15"}`}
          aria-label={`Toggle ${niche.label_jp}`}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${niche.enabled ? "left-[18px]" : "left-0.5"}`} />
        </button>
        <span className="font-semibold">{niche.label_jp}</span>
        <span className="text-[10px] font-mono text-ink/30">{niche.id}</span>
        <div className="relative ml-auto">
          <select
            value={niche.mode}
            onChange={(e) => edit((n) => (n.mode = e.target.value as NicheMode))}
            className="appearance-none rounded-lg border border-ink/12 bg-mist py-1 pl-2.5 pr-7 text-xs font-semibold outline-none focus:border-coral"
          >
            {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-ink/40" />
        </div>
      </div>

      {niche.enabled && (
        <div className="mt-3 space-y-2 pl-12">
          {niche.mode !== "competitors" && (
            <div>
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink/35">Keywords</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {niche.keywords.map((kw) => (
                  <span key={kw} className="inline-flex items-center gap-1 rounded-lg bg-sage/12 px-2 py-1 text-xs font-medium text-sage">
                    {kw}
                    <button onClick={() => edit((n) => (n.keywords = n.keywords.filter((k) => k !== kw)))} className="text-sage/60 hover:text-sage">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && keywordInput.trim()) {
                      const kw = keywordInput.trim();
                      edit((n) => { if (!n.keywords.includes(kw)) n.keywords.push(kw); });
                      setKeywordInput("");
                    }
                  }}
                  placeholder="+ keyword"
                  className="w-24 rounded-lg border border-ink/12 bg-white px-2 py-1 text-xs outline-none focus:border-coral"
                />
              </div>
            </div>
          )}

          {niche.mode !== "keyword" && (
            <div>
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink/35">
                Tracked clinics ({niche.competitors.length})
              </span>
              {niche.competitors.length === 0 && (
                <p className="mb-1.5 text-xs text-ink/35">No clinics tracked yet — add one, or run a keyword hunt to discover them.</p>
              )}
              <div className="space-y-1.5">
                {niche.competitors.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-mist px-2.5 py-1.5 text-xs">
                    <span className="font-semibold">{c.name}</span>
                    <a href={c.url} target="_blank" rel="noreferrer" className="truncate text-ink/40 hover:text-coral">{c.url}</a>
                    <button onClick={() => edit((n) => n.competitors.splice(i, 1))} className="ml-auto text-ink/30 hover:text-coral">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <input value={compName} onChange={(e) => setCompName(e.target.value)} placeholder="Clinic name" className="w-32 rounded-lg border border-ink/12 bg-white px-2 py-1 text-xs outline-none focus:border-coral" />
                <input value={compUrl} onChange={(e) => setCompUrl(e.target.value)} placeholder="Ad Library URL or Page ID" className="min-w-0 flex-1 rounded-lg border border-ink/12 bg-white px-2 py-1 text-xs outline-none focus:border-coral" />
                <button
                  onClick={() => {
                    if (!compName.trim() || !compUrl.trim()) return;
                    const comp: Competitor = { name: compName.trim(), url: compUrl.trim(), page_id: null };
                    edit((n) => n.competitors.push(comp));
                    setCompName(""); setCompUrl("");
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-ink px-2.5 py-1 text-xs font-bold text-white transition hover:bg-ink/85"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Import panel (manual fallback) ───────────────────────────────────────────
function ImportPanel({ onImported }: { onImported: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(raw: string) {
    setBusy(true);
    try {
      const parsed = JSON.parse(raw);
      const token = localStorage.getItem("metascraper.ingestToken") ?? undefined;
      const result = (await importCapture(parsed, token)) as { ingested?: number };
      onImported(`Imported ${result.ingested ?? 0} ads.`);
      setText("");
      setOpen(false);
    } catch (err) {
      onImported(err instanceof Error && err.message ? `Import failed: ${err.message}` : "Import failed — check the JSON.");
    }
    setBusy(false);
  }

  return (
    <section className="mb-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 text-sm font-bold">
          <Upload className="h-4 w-4 text-ink/50" /> Manual import (fallback)
        </span>
        <ChevronDown className={`h-4 w-4 text-ink/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-ink/45">
            Only needed if auto-submit was off or the POST failed. Paste the capture JSON, or upload the file.
          </p>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-ink/12 px-3 py-2 text-xs font-semibold text-ink/60 transition hover:bg-mist">
              <Clipboard className="h-3.5 w-3.5" /> Upload JSON file
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) file.text().then(submit);
                }}
              />
            </label>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='{ "captured_date": "2026-06-30", "country": "JP", "ads": [...] }'
            className="h-28 w-full rounded-xl border border-ink/12 bg-mist px-3 py-2 font-mono text-[11px] outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
          />
          <button
            onClick={() => text.trim() && submit(text)}
            disabled={busy || !text.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-coral px-4 py-2 text-xs font-bold text-white transition hover:bg-coral/85 active:scale-95 disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" /> {busy ? "Importing…" : "Import capture"}
          </button>
        </div>
      )}
    </section>
  );
}
