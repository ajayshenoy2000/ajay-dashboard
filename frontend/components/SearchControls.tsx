"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Square, RefreshCw } from "lucide-react";
import { searchNow, setCustomKeywords } from "@/lib/api";
import type { AppSettings, ModelProvider, SearchSource, SearchNowResponse, TimeWindow } from "@/lib/types";

const sources: Array<{ id: SearchSource; label: string; detail: string }> = [
  { id: "x", label: "X", detail: "Recent posts" },
  { id: "google_news", label: "Google News", detail: "RSS articles" },
  { id: "google_trends", label: "Google Trends", detail: "Search demand" },
  { id: "youtube", label: "YouTube", detail: "Historical fit" }
];

const timeWindows: TimeWindow[] = ["12h", "24h", "3d", "7d", "30d", "60d", "90d"];
const regions = [
  { code: "JP", label: "Japan" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "IN", label: "India" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" }
];

export function SearchControls({ settings }: { settings: AppSettings }) {
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [enabledSources, setEnabledSources] = useState<SearchSource[]>(["x", "google_news", "google_trends", "youtube"]);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("24h");
  const [regionCode, setRegionCode] = useState("JP");
  const [analysisModelProvider, setAnalysisModelProvider] = useState<ModelProvider>(settings.analysisModelProvider ?? "gpt");
  const [briefModelProvider, setBriefModelProvider] = useState<ModelProvider>(settings.briefModelProvider ?? "claude");
  const [customKeywordsText, setCustomKeywordsText] = useState("");
  const [useCustomOnly, setUseCustomOnly] = useState(false);
  const [checkForChannelFit, setCheckForChannelFit] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SearchNowResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressLog, setProgressLog] = useState<string | null>(null);

  const disabled = enabledSources.length === 0 || isSearching;
  const sourceText = useMemo(() => enabledSources.join(", "), [enabledSources]);

  function parseCustomKeywords(text: string): string[] {
    return text
      .split(/[,;\n]/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
  }

  async function handleSearch() {
    setIsSearching(true);
    setError(null);
    setProgressLog("Initializing search...");
    setResult(null);

    const keywords = parseCustomKeywords(customKeywordsText);
    if (useCustomOnly && keywords.length === 0) {
      setError("Please enter at least one custom keyword");
      setIsSearching(false);
      return;
    }

    try {
      if (keywords.length > 0) {
        setProgressLog("Setting custom keywords...");
        await setCustomKeywords(keywords, useCustomOnly);
      }

      setProgressLog("Collecting data from sources...");
      const response = await searchNow({
        sources: enabledSources,
        timeWindow,
        analysisModelProvider,
        briefModelProvider,
        regionCode,
        checkForChannelFit
      });

      setProgressLog("Analyzing trends...");
      setResult(response);
      setProgressLog(null);
      router.refresh();
    } catch (searchError) {
      let message = "Search failed";
      if (searchError instanceof Error) {
        message = searchError.message;
        // Extract API error from response text if available
        if (message.includes("<!DOCTYPE")) {
          message = "Server error - please check the backend is running";
        }
      }
      setError(message);
      console.error("Search error:", searchError);
      setProgressLog(null);
    } finally {
      setIsSearching(false);
    }
  }

  function handleStop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsSearching(false);
    setProgressLog(null);
  }

  function toggleSource(source: SearchSource) {
    setEnabledSources((current) =>
      current.includes(source) ? current.filter((item) => item !== source) : [...current, source]
    );
  }

  return (
    <section className="rounded-md border border-ink/10 bg-white p-4 shadow-soft lg:col-span-2">
      <h2 className="mb-4 text-xl font-bold">Search Now</h2>

      {progressLog && (
        <div className="mb-4 rounded-md border border-sage/25 bg-sage/5 p-3 text-sm font-semibold text-sage">
          {progressLog}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h3 className="mb-2 text-sm font-bold">Sources</h3>
          <div className="grid grid-cols-2 gap-2">
            {sources.map((source) => {
              const checked = enabledSources.includes(source.id);
              return (
                <button
                  key={source.id}
                  className={`min-h-16 rounded-md border px-3 text-left transition ${
                    checked ? "border-sage bg-sage/10" : "border-ink/10 bg-mist"
                  }`}
                  onClick={() => toggleSource(source.id)}
                  type="button"
                >
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <span className={`h-3 w-3 rounded-sm border ${checked ? "border-sage bg-sage" : "border-ink/25 bg-white"}`} />
                    {source.label}
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-ink/50">{source.detail}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-bold">Data Window</h3>
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-4">
              {timeWindows.map((window) => (
                <button
                  key={window}
                  className={`min-h-11 rounded-md text-sm font-bold ${
                    timeWindow === window ? "bg-ink text-white" : "bg-mist text-ink/70"
                  }`}
                  onClick={() => setTimeWindow(window)}
                  type="button"
                >
                  {window}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ModelSelect label="Analysis Model" value={analysisModelProvider} onChange={setAnalysisModelProvider} />
            <ModelSelect label="Brief Model" value={briefModelProvider} onChange={setBriefModelProvider} />
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-ink/70">Region</span>
            <select
              className="w-full min-h-11 rounded-md border border-ink/10 bg-mist px-3 text-sm font-bold outline-none focus:border-sage"
              value={regionCode}
              onChange={(e) => setRegionCode(e.target.value)}
            >
              {regions.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-ink/70">Custom Keywords</span>
            <textarea
              className="min-h-20 w-full rounded-md border border-ink/10 bg-mist px-3 py-2 text-sm font-semibold outline-none focus:border-sage"
              placeholder="Enter keywords separated by comma, semicolon, or newline..."
              value={customKeywordsText}
              onChange={(e) => setCustomKeywordsText(e.target.value)}
            />
            <p className="mt-1 text-xs text-ink/50">Separate with commas, semicolons, or line breaks</p>
          </label>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useCustomOnly}
              onChange={(e) => setUseCustomOnly(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm font-bold text-ink">Use custom keywords only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={checkForChannelFit}
              onChange={(e) => setCheckForChannelFit(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm font-bold text-ink">Check for Channel Fit</span>
          </label>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-coral px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-ink/25"
          disabled={disabled}
          onClick={handleSearch}
          type="button"
        >
          {isSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {isSearching ? "Searching" : "Search Now"}
        </button>
        {isSearching && (
          <button
            className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-coral/30 px-4 text-sm font-bold text-coral hover:bg-coral/10"
            onClick={handleStop}
            type="button"
          >
            <Square className="h-4 w-4" />
            Stop
          </button>
        )}
      </div>

      <div className="mt-4 rounded-md bg-mist p-3 text-sm leading-6 text-ink/65">
        <strong className="text-ink">Current request:</strong> {timeWindow} · {sourceText || "No sources"} · region {regionCode} · analysis {analysisModelProvider} · briefs {briefModelProvider}
      </div>

      {result ? (
        <div className="mt-3 rounded-md border border-sage/25 bg-sage/10 p-3 text-sm font-semibold text-ink/75">
          ✓ Search complete: {result.trends.length} trends ranked, {result.recordThisWeek.length} record recommendations.
        </div>
      ) : null}
      {error ? <div className="mt-3 rounded-md border border-coral/30 bg-coral/10 p-3 text-sm font-semibold text-coral">Error: {error}</div> : null}
    </section>
  );
}

function ModelSelect({
  label,
  value,
  onChange
}: {
  label: string;
  value: ModelProvider;
  onChange: (value: ModelProvider) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-ink/70">{label}</span>
      <select
        className="min-h-11 w-full rounded-md border border-ink/10 bg-mist px-3 text-sm font-bold outline-none focus:border-sage"
        value={value}
        onChange={(event) => onChange(event.target.value as ModelProvider)}
      >
        <option value="gpt">GPT</option>
        <option value="claude">Claude</option>
      </select>
    </label>
  );
}
