import type { SourceItem, YouTubeVideo } from "@/lib/types";
import { classifyTopic, medicalRelevance } from "./classify";
import { rejectionReasons } from "./safety-filter";

export type ScoreBreakdown = {
  trendMomentum: number;
  googleSearchDemand: number;
  medicalRelevance: number;
  youtubeHistoricalFit: number;
  conversionPotential: number;
  safetyBrandFit: number;
  total: number;
};

export const DEFAULT_WEIGHTS = {
  trend_momentum: 25,
  google_search_demand: 20,
  medical_relevance: 20,
  youtube_historical_fit: 20,
  conversion_potential: 10,
  safety_brand_fit: 5,
};

const CONVERSION_TERMS = ["相談", "施術", "ダウンタイム", "副作用", "失敗", "デザイン", "適応"];
const NEWS_HALFLIFE_HOURS = 12;

function bounded(v: number, max: number): number {
  return Math.max(0, Math.min(max, v));
}

function keywordsRelated(k1: string, k2: string): boolean {
  return k1 === k2 || k1.includes(k2) || k2.includes(k1);
}

const SOURCE_WEIGHTS: Record<string, number> = { x: 0.35, google_trends: 0.30, google_news: 0.25, youtube: 0.10 };

function crossSourceConfidence(keyword: string, allSources: SourceItem[]): number {
  const present = new Set(allSources.filter((s) => keywordsRelated(s.keyword, keyword)).map((s) => s.source));
  return [...present].reduce((sum, s) => sum + (SOURCE_WEIGHTS[s] ?? 0), 0);
}

export function scoreTrend(
  keyword: string,
  sources: SourceItem[],
  youtubeHistory: YouTubeVideo[],
  allSources?: SourceItem[],
  weights: Record<string, number> = DEFAULT_WEIGHTS,
): ScoreBreakdown {
  const text = [keyword, ...sources.map((s) => `${s.title} ${s.text}`)].join(" ");
  const engagement = sources.reduce((sum, s) => sum + s.engagement, 0);
  const sourceDiversity = new Set(sources.map((s) => s.source)).size;

  const category = classifyTopic(text);
  const relatedYt = youtubeHistory.filter(
    (v) => keyword.toLowerCase().includes(v.title.toLowerCase().slice(0, 4)) ||
      v.title.toLowerCase().includes(keyword.toLowerCase().slice(0, 4)) ||
      v.category === category,
  );

  // Trend momentum
  const trendMomentum = bounded(
    (Math.log10(engagement + 10) / 3.0 + sourceDiversity * 0.12) * weights.trend_momentum,
    weights.trend_momentum,
  );

  // Google search demand: recency-weighted news + trends signal
  const now = Date.now();
  const newsItems = sources.filter((s) => s.source === "google_news");
  const newsSignal = newsItems.reduce((sum, s) => {
    const ageHours = (now - new Date(s.publishedAt).getTime()) / 3_600_000;
    return sum + Math.exp(-0.693 * Math.max(0, ageHours) / NEWS_HALFLIFE_HOURS);
  }, 0) / Math.max(1, sources.length);

  const trendsItems = sources.filter((s) => s.source === "google_trends");
  const trendsValue = Math.max(0, ...trendsItems.map((s) => s.engagement)) / 100;
  const risingBonus = trendsItems.some((s) => s.metadata?.rising) ? 0.15 : 0;
  const googleSearchDemand = bounded(
    (newsSignal * 0.4 + trendsValue * 0.6 + risingBonus) * weights.google_search_demand,
    weights.google_search_demand,
  );

  const medical = medicalRelevance(text) * weights.medical_relevance;

  // YouTube fit using anomaly score from scoring
  const totalAnomaly = relatedYt.reduce((sum, v) => {
    const score = (v as YouTubeVideo & { anomalyScore?: number }).anomalyScore ?? 0;
    return sum + Math.min(Math.max(0, score), 2);
  }, 0);
  const youtubeFit = bounded(
    (totalAnomaly / 4 + relatedYt.length * 0.05) * weights.youtube_historical_fit,
    weights.youtube_historical_fit,
  );

  const matchedConversion = CONVERSION_TERMS.filter((t) => text.includes(t)).length;
  const conversion = bounded(
    (matchedConversion / CONVERSION_TERMS.length) * weights.conversion_potential,
    weights.conversion_potential,
  );

  const safetyPenalty = rejectionReasons(text).length * 2.5;
  const safety = bounded(weights.safety_brand_fit - safetyPenalty, weights.safety_brand_fit);

  // Cross-source confidence multiplier on trend_momentum
  let finalMomentum = trendMomentum;
  if (allSources) {
    const confidence = crossSourceConfidence(keyword, allSources);
    finalMomentum = bounded(trendMomentum * (0.7 + 0.3 * confidence), weights.trend_momentum);
  }

  const total = +(finalMomentum + googleSearchDemand + medical + youtubeFit + conversion + safety).toFixed(2);
  return {
    trendMomentum: +finalMomentum.toFixed(2),
    googleSearchDemand: +googleSearchDemand.toFixed(2),
    medicalRelevance: +medical.toFixed(2),
    youtubeHistoricalFit: +youtubeFit.toFixed(2),
    conversionPotential: +conversion.toFixed(2),
    safetyBrandFit: +safety.toFixed(2),
    total,
  };
}
