"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3, Check, ChevronDown, Database, Globe2, Plus, Search, SlidersHorizontal, Trash2, X,
} from "lucide-react";
import { saveKeywordBanks, searchNow } from "@/lib/api";
import { authFetch } from "@/lib/authFetch";
import type { AppSettings, KeywordBank, SearchSource, TimeWindow } from "@/lib/types";

const SOURCES: Array<{ id: SearchSource; label: string }> = [
  { id: "google_news", label: "News" },
  { id: "google_trends", label: "Search" },
  { id: "youtube", label: "YouTube" },
  { id: "x", label: "X" },
];
const WINDOWS: TimeWindow[] = ["12h", "24h", "3d", "7d", "30d", "60d", "90d"];
const REGIONS = [["JP", "Japan"], ["US", "United States"], ["GB", "United Kingdom"], ["IN", "India"], ["DE", "Germany"], ["FR", "France"]];
const WEIGHT_LABELS: Record<string, string> = {
  trend_momentum: "Momentum",
  google_search_demand: "Search demand",
  medical_relevance: "Medical relevance",
  youtube_historical_fit: "Channel fit",
  conversion_potential: "Conversion",
  safety_brand_fit: "Safety",
};

export function SearchControls({ settings }: { settings: AppSettings }) {
  const router = useRouter();
  const [banks, setBanks] = useState<KeywordBank[]>(settings.keywordBanks);
  const [activeBankId, setActiveBankId] = useState(settings.activeKeywordBankId);
  const [enabledSources, setEnabledSources] = useState<SearchSource[]>(["google_news", "google_trends", "youtube"]);
  const savedWindow = WINDOWS.includes(settings.lastSearch.timeWindow as TimeWindow)
    ? settings.lastSearch.timeWindow as TimeWindow
    : "24h";
  const [timeWindow, setTimeWindow] = useState<TimeWindow>(savedWindow);
  const [regionCode, setRegionCode] = useState("JP");
  const [weights, setWeights] = useState(settings.scoringWeights);
  const [checkForChannelFit, setCheckForChannelFit] = useState(Boolean(settings.channelId));
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [bankEditorOpen, setBankEditorOpen] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankKeywords, setBankKeywords] = useState("");

  const activeBank = banks.find((bank) => bank.id === activeBankId) ?? banks[0];
  const weightTotal = useMemo(() => Object.values(weights).reduce((sum, value) => sum + Number(value || 0), 0), [weights]);

  async function persistBanks(nextBanks = banks, nextActive = activeBankId) {
    const saved = await saveKeywordBanks(nextBanks, nextActive);
    setBanks(saved.keywordBanks);
    setActiveBankId(saved.activeKeywordBankId);
  }

  async function selectBank(id: string) {
    const previous = activeBankId;
    setActiveBankId(id);
    try {
      await persistBanks(banks, id);
    } catch (error) {
      setActiveBankId(previous);
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not switch bank" });
    }
  }

  async function addBank() {
    const keywords = [...new Set(bankKeywords.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean))];
    if (!bankName.trim() || !keywords.length) return;
    const id = `${bankName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "bank"}-${Date.now().toString(36)}`;
    const next = [...banks, { id, name: bankName.trim(), keywords }];
    setBanks(next);
    setActiveBankId(id);
    await persistBanks(next, id);
    setBankName("");
    setBankKeywords("");
    setBankEditorOpen(false);
  }

  async function removeBank(id: string) {
    if (banks.length === 1) return;
    const next = banks.filter((bank) => bank.id !== id);
    const nextActive = id === activeBankId ? next[0].id : activeBankId;
    setBanks(next);
    setActiveBankId(nextActive);
    await persistBanks(next, nextActive);
  }

  async function saveWeights() {
    setMessage(null);
    const response = await authFetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scoringWeights: weights }),
    });
    setMessage(response.ok
      ? { tone: "ok", text: "Scoring saved" }
      : { tone: "error", text: "Could not save scoring" });
  }

  async function handleSearch() {
    if (!enabledSources.length || !activeBank) return;
    setIsSearching(true);
    setMessage(null);
    try {
      await persistBanks();
      const response = await searchNow({ sources: enabledSources, timeWindow, regionCode, checkForChannelFit });
      setMessage({ tone: "ok", text: `${response.trends.length} results saved from the latest search` });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Search failed" });
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-3 shadow-soft">
      <div className="mb-3 flex items-center justify-between px-1 pt-1">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-coral">New search</p>
          <h2 className="text-lg font-bold">Discover signals</h2>
        </div>
        <span className="rounded-full bg-mist px-2.5 py-1 text-[11px] font-bold text-ink/45">{activeBank?.keywords.length ?? 0} keywords</span>
      </div>

      <div className="space-y-2">
        <Panel icon={Database} title="Keyword bank" summary={activeBank?.name ?? "Choose a bank"} open>
          <div className="grid grid-cols-2 gap-2">
            {banks.map((bank) => {
              const active = bank.id === activeBankId;
              return (
                <button key={bank.id} onClick={() => selectBank(bank.id)} className={`relative rounded-2xl border p-3 text-left ${active ? "border-coral bg-coral/8" : "border-ink/10 bg-mist/60"}`}>
                  <span className="block truncate text-xs font-bold">{bank.name}</span>
                  <span className="mt-1 block text-[10px] text-ink/40">{bank.keywords.length} terms</span>
                  {active && <Check className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-coral" />}
                </button>
              );
            })}
          </div>
          {activeBank && (
            <div className="mt-2 flex flex-wrap gap-1.5 rounded-2xl bg-mist/70 p-3">
              {activeBank.keywords.slice(0, 10).map((keyword) => <span key={keyword} className="rounded-lg bg-white px-2 py-1 text-[10px] font-semibold text-ink/55">{keyword}</span>)}
              {activeBank.keywords.length > 10 && <span className="px-1 py-1 text-[10px] font-bold text-ink/35">+{activeBank.keywords.length - 10}</span>}
            </div>
          )}
          <div className="mt-2 flex gap-2">
            <button onClick={() => setBankEditorOpen((value) => !value)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink/10 py-2 text-xs font-bold text-ink/55"><Plus className="h-3.5 w-3.5" /> New bank</button>
            {banks.length > 1 && <button onClick={() => removeBank(activeBankId)} aria-label="Delete bank" className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink/10 text-ink/35"><Trash2 className="h-3.5 w-3.5" /></button>}
          </div>
          {bankEditorOpen && (
            <div className="mt-2 rounded-2xl border border-ink/10 p-3">
              <div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold">Create keyword bank</p><button onClick={() => setBankEditorOpen(false)}><X className="h-4 w-4 text-ink/35" /></button></div>
              <input value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="Bank name" className="mb-2 w-full rounded-xl border border-ink/10 bg-mist px-3 py-2 text-sm outline-none focus:border-coral" />
              <textarea value={bankKeywords} onChange={(event) => setBankKeywords(event.target.value)} placeholder="Keywords, separated by commas or lines" className="min-h-20 w-full resize-none rounded-xl border border-ink/10 bg-mist px-3 py-2 text-sm outline-none focus:border-coral" />
              <button onClick={addBank} disabled={!bankName.trim() || !bankKeywords.trim()} className="mt-2 w-full rounded-xl bg-ink py-2.5 text-xs font-bold text-white disabled:opacity-30">Save bank</button>
            </div>
          )}
        </Panel>

        <Panel icon={Globe2} title="Search scope" summary={`${timeWindow} · ${regionCode} · ${enabledSources.length} sources`}>
          <div className="grid grid-cols-4 gap-1.5">
            {SOURCES.map((source) => {
              const active = enabledSources.includes(source.id);
              return <button key={source.id} onClick={() => setEnabledSources((current) => active ? current.filter((id) => id !== source.id) : [...current, source.id])} className={`rounded-xl px-1 py-2 text-[10px] font-bold ${active ? "bg-sage text-white" : "bg-mist text-ink/40"}`}>{source.label}</button>;
            })}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select value={timeWindow} onChange={(event) => setTimeWindow(event.target.value as TimeWindow)} className="rounded-xl border border-ink/10 bg-mist px-3 py-2.5 text-xs font-bold outline-none">{WINDOWS.map((window) => <option key={window}>{window}</option>)}</select>
            <select value={regionCode} onChange={(event) => setRegionCode(event.target.value)} className="rounded-xl border border-ink/10 bg-mist px-3 py-2.5 text-xs font-bold outline-none">{REGIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select>
          </div>
        </Panel>

        <Panel icon={BarChart3} title="Scoring" summary={`${weightTotal} total weight`}>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {Object.keys(WEIGHT_LABELS).map((key) => (
              <label key={key} className="min-w-0">
                <span className="mb-1 flex justify-between text-[10px] font-bold text-ink/45"><span className="truncate">{WEIGHT_LABELS[key]}</span><span>{weights[key] ?? 0}</span></span>
                <input type="range" min="0" max="40" value={weights[key] ?? 0} onChange={(event) => setWeights((current) => ({ ...current, [key]: Number(event.target.value) }))} className="w-full accent-coral" />
              </label>
            ))}
          </div>
          <button onClick={saveWeights} className="mt-3 w-full rounded-xl bg-mist py-2 text-xs font-bold text-ink/55">Save scoring</button>
        </Panel>

        {settings.channelId && (
          <label className="flex items-center justify-between rounded-2xl bg-mist/70 px-3 py-2.5">
            <span className="flex items-center gap-2 text-xs font-bold text-ink/60"><SlidersHorizontal className="h-3.5 w-3.5" /> Use channel fit</span>
            <button type="button" role="switch" aria-checked={checkForChannelFit} onClick={() => setCheckForChannelFit((value) => !value)} className={`relative h-6 w-11 rounded-full ${checkForChannelFit ? "bg-sage" : "bg-ink/15"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checkForChannelFit ? "translate-x-5" : "translate-x-0.5"}`} /></button>
          </label>
        )}
      </div>

      <button onClick={handleSearch} disabled={!enabledSources.length || isSearching} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-coral text-sm font-bold text-white active:scale-[0.99] disabled:opacity-35">
        <Search className={`h-4 w-4 ${isSearching ? "animate-pulse" : ""}`} /> {isSearching ? "Searching sources…" : `Search ${activeBank?.name ?? "bank"}`}
      </button>
      {message && <p className={`mt-2 rounded-xl px-3 py-2 text-xs font-semibold ${message.tone === "ok" ? "bg-sage/10 text-sage" : "bg-coral/10 text-coral"}`}>{message.text}</p>}
    </section>
  );
}

function Panel({ icon: Icon, title, summary, open, children }: { icon: typeof Database; title: string; summary: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group rounded-2xl border border-ink/8 bg-white open:bg-mist/35">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-mist text-ink/50"><Icon className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><span className="block text-xs font-bold">{title}</span><span className="block truncate text-[10px] text-ink/40">{summary}</span></span>
        <ChevronDown className="h-4 w-4 text-ink/30 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-ink/6 px-3 pb-3 pt-3">{children}</div>
    </details>
  );
}
