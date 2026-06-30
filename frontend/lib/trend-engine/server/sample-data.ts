import type { Brief, SourceItem, Trend, YouTubeVideo } from "@/lib/types";

const now = new Date().toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

export const sampleSources: SourceItem[] = [
  { id: "news-glp1-1", source: "google_news", title: "GLP-1ダイエットの副作用相談が増加", text: "美容目的のGLP-1利用について、吐き気や低血糖リスクへの関心が高まっています。", url: "https://news.google.com/search?q=GLP-1", keyword: "GLP-1", publishedAt: hoursAgo(5), engagement: 78, metadata: {} },
  { id: "x-glp1-1", source: "x", title: "マンジャロ経験談", text: "マンジャロって本当に痩せるの？副作用が怖くて迷っている。", url: "https://x.com/search?q=マンジャロ", keyword: "マンジャロ", publishedAt: hoursAgo(2), engagement: 412, metadata: {} },
  { id: "news-kuma-1", source: "google_news", title: "クマ取り後のダウンタイムに関する検索が増加", text: "目元施術後の腫れ、内出血、仕事復帰時期についての疑問が集まっています。", url: "https://news.google.com/search?q=クマ取り", keyword: "クマ取り", publishedAt: hoursAgo(9), engagement: 131, metadata: {} },
  { id: "trends-fukuro-1", source: "google_trends", title: "涙袋ヒアルロン酸", text: "涙袋ヒアルロン酸、入れすぎ、失敗、自然に見える量の関連検索が上昇。", url: "https://trends.google.com/trends/explore?geo=JP&q=涙袋", keyword: "涙袋", publishedAt: hoursAgo(3), engagement: 59, metadata: { rising: true } },
];

export const sampleYouTube: YouTubeVideo[] = [
  { id: "yt-kuma-1", title: "クマ取りで失敗しないために知ってほしいこと", description: "クマ取りの適応、ダウンタイム、よくある誤解を解説します。", publishedAt: daysAgo(32), views: 48500, likes: 820, comments: 74, impressions: 320000, ctr: 0.071, avgViewDurationSeconds: 214, avgPercentageViewed: 0.54, subscribersGained: 192, category: "クマ取り" },
  { id: "yt-glp-1", title: "GLP-1ダイエットは危険？医師が注意点を解説", description: "マンジャロ、リベルサスなどの痩身薬について安全性を中心に話します。", publishedAt: daysAgo(18), views: 39200, likes: 690, comments: 118, impressions: 280000, ctr: 0.064, avgViewDurationSeconds: 188, avgPercentageViewed: 0.49, subscribersGained: 161, category: "トレンド解説" },
];

export const sampleTrends: Trend[] = [
  {
    id: "glp1-mounjaro-safety", rowId: "glp1-mounjaro-safety", createdAt: now, hasBrief: false,
    title: "SNSで話題のマンジャロダイエット、実際どうなの？", keyword: "マンジャロ",
    summary: "GLP-1系の痩身目的利用が伸び、効果よりも副作用や適応への不安が増えています。",
    clusterTerms: ["GLP-1", "マンジャロ", "リベルサス", "副作用", "ダイエット注射"],
    score: { trendMomentum: 22, googleSearchDemand: 18, medicalRelevance: 19, youtubeHistoricalFit: 16, conversionPotential: 8, safetyBrandFit: 4, total: 87 },
    sources: sampleSources.slice(0, 2), youtubeHistory: [sampleYouTube[1]], status: "new",
    whyItMatters: "患者さんが自己判断で薬を選びやすい領域で、医師の冷静なリスク整理に価値があります。",
    safetyNotes: ["個別処方の推奨に見えない言い方にする", "副作用と適応外利用の注意を必ず入れる"],
  },
  {
    id: "kuma-downtime-anxiety", rowId: "kuma-downtime-anxiety", createdAt: now, hasBrief: false,
    title: "クマ取り後のダウンタイム、不安になりすぎなくて大丈夫？", keyword: "クマ取り",
    summary: "クマ取り後の腫れ・内出血・左右差について、術前不安と術後不安の検索が増えています。",
    clusterTerms: ["クマ取り", "ダウンタイム", "内出血", "腫れ", "仕事復帰"],
    score: { trendMomentum: 18, googleSearchDemand: 16, medicalRelevance: 20, youtubeHistoricalFit: 19, conversionPotential: 9, safetyBrandFit: 5, total: 87 },
    sources: [sampleSources[2]], youtubeHistory: [sampleYouTube[0]], status: "new",
    whyItMatters: "L'or Clinicの既存視聴者と相性が高く、相談前の不安解消に直結します。",
    safetyNotes: ["術後経過には個人差があることを明確にする"],
  },
];

export const sampleBrief: Brief = {
  id: "brief-glp1-mounjaro-safety", trendId: "glp1-mounjaro-safety", durationMinutes: "3-5",
  titleOptions: ["SNSで話題のマンジャロ、実際どうなの？", "GLP-1ダイエットで後悔しないために", "痩せる注射の前に知ってほしい注意点"],
  hook: "SNSでマンジャロが話題ですが、結論から言うと、合う方もいます。ただし注意点があります。",
  conclusion: "自己判断で始めるものではなく、体質・既往歴・目的を医師と確認することが大切です。",
  outline: ["話題化している理由を短く紹介", "GLP-1が食欲に関わる仕組みをやさしく説明", "よくある誤解: 誰でも安全に楽に痩せるわけではない", "副作用と受診すべきサイン", "不安になりすぎなくて大丈夫ですが、相談して判断する流れを案内"],
  talkingPoints: ["吐き気、便秘、低血糖などのリスク", "美容目的利用と医療管理の違い", "短期的な体重だけでなく健康状態を見る必要性"],
  risksToMention: ["適応外利用", "個人輸入・自己判断", "既往歴による禁忌"],
  cta: "気になる方は、ご自身の体質に合っているかを相談で確認してください。",
};
