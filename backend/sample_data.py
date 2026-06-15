from __future__ import annotations

from datetime import datetime, timedelta, timezone

from backend.db.models import ScoreBreakdown, SourceItem, Trend, VideoBrief, YouTubeVideo


now = datetime.now(timezone.utc)


sample_sources = [
    SourceItem(
        id="news-glp1-1",
        source="google_news",
        title="GLP-1ダイエットの副作用相談が増加",
        text="美容目的のGLP-1利用について、吐き気や低血糖リスクへの関心が高まっています。",
        url="https://news.google.com/search?q=GLP-1%20%E3%83%80%E3%82%A4%E3%82%A8%E3%83%83%E3%83%88",
        keyword="GLP-1",
        published_at=now - timedelta(hours=5),
        engagement=78,
    ),
    SourceItem(
        id="x-glp1-1",
        source="x",
        title="マンジャロ経験談",
        text="マンジャロって本当に痩せるの？副作用が怖くて迷っている、という投稿が伸びています。",
        url="https://x.com/search?q=%E3%83%9E%E3%83%B3%E3%82%B8%E3%83%A3%E3%83%AD",
        keyword="マンジャロ",
        published_at=now - timedelta(hours=2),
        engagement=412,
    ),
    SourceItem(
        id="news-kuma-1",
        source="google_news",
        title="クマ取り後のダウンタイムに関する検索が増加",
        text="目元施術後の腫れ、内出血、仕事復帰時期についての疑問が集まっています。",
        url="https://news.google.com/search?q=%E3%82%AF%E3%83%9E%E5%8F%96%E3%82%8A%20%E3%83%80%E3%82%A6%E3%83%B3%E3%82%BF%E3%82%A4%E3%83%A0",
        keyword="クマ取り",
        published_at=now - timedelta(hours=9),
        engagement=131,
    ),
    SourceItem(
        id="trends-fukuro-1",
        source="google_trends",
        title="涙袋ヒアルロン酸",
        text="涙袋ヒアルロン酸、入れすぎ、失敗、自然に見える量の関連検索が上昇。",
        url="https://trends.google.com/trends/explore?geo=JP&q=%E6%B6%99%E8%A2%8B,%E3%83%92%E3%82%A2%E3%83%AB%E3%83%AD%E3%83%B3%E9%85%B8",
        keyword="涙袋",
        published_at=now - timedelta(hours=3),
        engagement=59,
    ),
]


sample_youtube = [
    YouTubeVideo(
        id="yt-kuma-1",
        title="クマ取りで失敗しないために知ってほしいこと",
        description="クマ取りの適応、ダウンタイム、よくある誤解を解説します。",
        published_at=now - timedelta(days=32),
        views=48500,
        likes=820,
        comments=74,
        impressions=320000,
        ctr=0.071,
        avg_view_duration_seconds=214,
        avg_percentage_viewed=0.54,
        subscribers_gained=192,
        category="クマ取り",
    ),
    YouTubeVideo(
        id="yt-glp-1",
        title="GLP-1ダイエットは危険？医師が注意点を解説",
        description="マンジャロ、リベルサスなどの痩身薬について安全性を中心に話します。",
        published_at=now - timedelta(days=18),
        views=39200,
        likes=690,
        comments=118,
        impressions=280000,
        ctr=0.064,
        avg_view_duration_seconds=188,
        avg_percentage_viewed=0.49,
        subscribers_gained=161,
        category="トレンド解説",
    ),
]


sample_trends = [
    Trend(
        id="glp1-mounjaro-safety",
        title="SNSで話題のマンジャロダイエット、実際どうなの？",
        keyword="マンジャロ",
        summary="GLP-1系の痩身目的利用が伸び、効果よりも副作用や適応への不安が増えています。",
        cluster_terms=["GLP-1", "マンジャロ", "リベルサス", "副作用", "ダイエット注射"],
        score=ScoreBreakdown(22, 18, 19, 16, 8, 4),
        sources=sample_sources[:2],
        youtube_history=[sample_youtube[1]],
        why_it_matters="患者さんが自己判断で薬を選びやすい領域で、医師の冷静なリスク整理に価値があります。",
        safety_notes=["個別処方の推奨に見えない言い方にする", "副作用と適応外利用の注意を必ず入れる"],
    ),
    Trend(
        id="kuma-downtime-anxiety",
        title="クマ取り後のダウンタイム、不安になりすぎなくて大丈夫？",
        keyword="クマ取り",
        summary="クマ取り後の腫れ・内出血・左右差について、術前不安と術後不安の検索が増えています。",
        cluster_terms=["クマ取り", "ダウンタイム", "内出血", "腫れ", "仕事復帰"],
        score=ScoreBreakdown(18, 16, 20, 19, 9, 5),
        sources=[sample_sources[2]],
        youtube_history=[sample_youtube[0]],
        why_it_matters="L'or Clinicの既存視聴者と相性が高く、相談前の不安解消に直結します。",
        safety_notes=["術後経過には個人差があることを明確にする"],
    ),
    Trend(
        id="tear-bag-filler-natural",
        title="SNSで人気の涙袋ヒアルロン酸、自然に見せるには？",
        keyword="涙袋",
        summary="韓国アイドル顔の文脈で涙袋注入が拡散し、入れすぎや不自然さへの疑問が出ています。",
        cluster_terms=["涙袋", "ヒアルロン酸", "韓国アイドル顔", "入れすぎ", "自然"],
        score=ScoreBreakdown(19, 14, 18, 13, 7, 4),
        sources=[sample_sources[3]],
        youtube_history=[],
        why_it_matters="デザインと解剖の説明で医師らしい差別化がしやすいテーマです。",
        safety_notes=["流行顔の押し付けを避け、本人の目元に合う設計を軸にする"],
    ),
]


sample_briefs = [
    VideoBrief(
        id="brief-glp1-mounjaro-safety",
        trend_id="glp1-mounjaro-safety",
        title_options=[
            "SNSで話題のマンジャロ、実際どうなの？",
            "GLP-1ダイエットで後悔しないために",
            "痩せる注射の前に知ってほしい注意点",
        ],
        hook="SNSでマンジャロが話題ですが、結論から言うと、合う方もいます。ただし注意点があります。",
        conclusion="自己判断で始めるものではなく、体質・既往歴・目的を医師と確認することが大切です。",
        outline=[
            "話題化している理由を短く紹介",
            "GLP-1が食欲に関わる仕組みをやさしく説明",
            "よくある誤解: 誰でも安全に楽に痩せるわけではない",
            "副作用と受診すべきサイン",
            "不安になりすぎず、相談して判断する流れを案内",
        ],
        talking_points=[
            "吐き気、便秘、低血糖などのリスク",
            "美容目的利用と医療管理の違い",
            "短期的な体重だけでなく健康状態を見る必要性",
        ],
        risks_to_mention=["適応外利用", "個人輸入・自己判断", "既往歴による禁忌"],
        cta="気になる方は、ご自身の体質に合っているかを相談で確認してください。",
    )
]
