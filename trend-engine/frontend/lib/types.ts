export type SourceItem = {
  id: string;
  source: "x" | "google_news" | "google_trends" | "youtube" | "manual";
  title: string;
  text: string;
  url: string;
  keyword: string;
  publishedAt: string;
  engagement: number;
  metadata: Record<string, unknown>;
};

export type YouTubeVideo = {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  impressions?: number;
  ctr?: number;
  avgViewDurationSeconds?: number;
  avgPercentageViewed?: number;
  subscribersGained?: number;
  category: string;
};

export type Score = {
  trendMomentum: number;
  googleSearchDemand: number;
  medicalRelevance: number;
  youtubeHistoricalFit: number;
  conversionPotential: number;
  safetyBrandFit: number;
  total: number;
};

export type Trend = {
  id: string;
  rowId: string | null;
  createdAt: string | null;
  hasBrief: boolean;
  title: string;
  keyword: string;
  summary: string;
  clusterTerms: string[];
  score: Score;
  sources: SourceItem[];
  youtubeHistory: YouTubeVideo[];
  status: "new" | "approved" | "rejected";
  whyItMatters: string;
  safetyNotes: string[];
};

export type Brief = {
  id: string;
  trendId: string;
  titleOptions: string[];
  hook: string;
  conclusion: string;
  outline: string[];
  talkingPoints: string[];
  risksToMention: string[];
  cta: string;
  durationMinutes: string;
};

export type SearchSource = "x" | "google_news" | "google_trends" | "youtube";
export type TimeWindow = "12h" | "24h" | "3d" | "7d" | "30d" | "60d" | "90d";
export type ModelProvider = "gpt" | "claude";

export type SearchNowRequest = {
  sources: SearchSource[];
  timeWindow: TimeWindow;
  analysisModelProvider: ModelProvider;
  briefModelProvider: ModelProvider;
  regionCode?: string;
  checkForChannelFit?: boolean;
};

export type SearchNowResponse = {
  trends: Trend[];
  recordThisWeek: Trend[];
  meta: {
    mode: string;
    timeWindow: string;
    sources: string[];
    analysisModelProvider: string;
    briefModelProvider: string;
    hours?: number;
    keywordsUsed?: string[];
    xAvailable?: boolean;
  };
};

export type AppSettings = {
  keywords: string[];
  scoringWeights: Record<string, number>;
  channelId: string;
  modelProvider: string;
  analysisModelProvider: ModelProvider;
  briefModelProvider: ModelProvider;
  lastSearch: SearchNowResponse["meta"];
  apiKeys: {
    youtube: boolean;
    x: boolean;
    anthropic: boolean;
    openai: boolean;
  };
};
