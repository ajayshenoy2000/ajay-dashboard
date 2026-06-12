import type { Brief, SourceItem, Trend } from "./types";

const now = new Date();
const oneHoursAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

export const sampleTrends: Trend[] = [
  {
    id: "glp1-mounjaro-safety",
    rowId: "glp1-mounjaro-safety",
    createdAt: oneHoursAgo.toISOString(),
    hasBrief: true,
    title: "SNSで話題のマンジャロダイエット、実際どうなの？",
    keyword: "マンジャロ",
    summary: "GLP-1系の痩身目的利用が伸び、効果よりも副作用や適応への不安が増えています。",
    clusterTerms: ["GLP-1", "マンジャロ", "リベルサス", "副作用", "ダイエット注射"],
    score: { trendMomentum: 22, googleSearchDemand: 18, medicalRelevance: 19, youtubeHistoricalFit: 16, conversionPotential: 8, safetyBrandFit: 4, total: 87 },
    sources: [],
    youtubeHistory: [],
    status: "new",
    whyItMatters: "患者さんが自己判断で薬を選びやすい領域で、医師の冷静なリスク整理に価値があります。",
    safetyNotes: ["個別処方の推奨に見えない言い方にする", "副作用と適応外利用の注意を必ず入れる"]
  },
  {
    id: "kuma-downtime-anxiety",
    rowId: "kuma-downtime-anxiety",
    createdAt: sixHoursAgo.toISOString(),
    hasBrief: false,
    title: "クマ取り後のダウンタイム、不安になりすぎなくて大丈夫？",
    keyword: "クマ取り",
    summary: "クマ取り後の腫れ・内出血・左右差について、術前不安と術後不安の検索が増えています。",
    clusterTerms: ["クマ取り", "ダウンタイム", "内出血", "腫れ", "仕事復帰"],
    score: { trendMomentum: 18, googleSearchDemand: 16, medicalRelevance: 20, youtubeHistoricalFit: 19, conversionPotential: 9, safetyBrandFit: 5, total: 87 },
    sources: [],
    youtubeHistory: [],
    status: "new",
    whyItMatters: "L'or Clinicの既存視聴者と相性が高く、相談前の不安解消に直結します。",
    safetyNotes: ["術後経過には個人差があることを明確にする"]
  },
  {
    id: "tear-bag-filler-natural",
    rowId: "tear-bag-filler-natural",
    createdAt: oneDayAgo.toISOString(),
    hasBrief: false,
    title: "SNSで人気の涙袋ヒアルロン酸、自然に見せるには？",
    keyword: "涙袋",
    summary: "韓国アイドル顔の文脈で涙袋注入が拡散し、入れすぎや不自然さへの疑問が出ています。",
    clusterTerms: ["涙袋", "ヒアルロン酸", "韓国アイドル顔", "入れすぎ", "自然"],
    score: { trendMomentum: 19, googleSearchDemand: 14, medicalRelevance: 18, youtubeHistoricalFit: 13, conversionPotential: 7, safetyBrandFit: 4, total: 75 },
    sources: [],
    youtubeHistory: [],
    status: "new",
    whyItMatters: "デザインと解剖の説明で医師らしい差別化がしやすいテーマです。",
    safetyNotes: ["流行顔の押し付けを避け、本人の目元に合う設計を軸にする"]
  }
];

export const sampleSources: SourceItem[] = [
  {
    id: "news-glp1-1",
    source: "google_news",
    title: "GLP-1ダイエットの副作用相談が増加",
    text: "美容目的のGLP-1利用について、吐き気や低血糖リスクへの関心が高まっています。",
    url: "https://news.google.com/search?q=GLP-1",
    keyword: "GLP-1",
    publishedAt: new Date().toISOString(),
    engagement: 78,
    metadata: {}
  },
  {
    id: "x-glp1-1",
    source: "x",
    title: "マンジャロ経験談",
    text: "マンジャロって本当に痩せるの？副作用が怖くて迷っている、という投稿が伸びています。",
    url: "https://x.com/search?q=%E3%83%9E%E3%83%B3%E3%82%B8%E3%83%A3%E3%83%AD",
    keyword: "マンジャロ",
    publishedAt: new Date().toISOString(),
    engagement: 412,
    metadata: {}
  }
];

export const sampleBrief: Brief = {
  id: "brief-glp1-mounjaro-safety",
  trendId: "glp1-mounjaro-safety",
  titleOptions: ["SNSで話題のマンジャロ、実際どうなの？", "GLP-1ダイエットで後悔しないために"],
  hook: "SNSでマンジャロが話題ですが、結論から言うと、合う方もいます。ただし注意点があります。",
  conclusion: "自己判断で始めるものではなく、体質・既往歴・目的を医師と確認することが大切です。",
  outline: ["話題化している理由を紹介", "仕組みをやさしく説明", "よくある誤解を整理", "副作用と受診目安", "相談の流れを案内"],
  talkingPoints: ["吐き気、便秘、低血糖などのリスク", "美容目的利用と医療管理の違い", "短期的な体重だけでなく健康状態を見る必要性"],
  risksToMention: ["適応外利用", "個人輸入・自己判断", "既往歴による禁忌"],
  cta: "気になる方は、ご自身の体質に合っているかを相談で確認してください。",
  durationMinutes: "3-5"
};
