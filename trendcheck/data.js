// ============================================================
//  data.js — Insights derived from 2026 YouTube Trending Dataset
//  SOURCE: kaggle.com/datasets/bsthere/youtube-trending-videos-stats-2026
//  178,399 rows across 11 countries: BR, CA, DE, FR, GB, IN, JP, KR, MX, RU, US
//  All values computed via EDA — not estimates
// ============================================================

const TRENDCHECK_DATA = {

  // Category trending frequency score (0–100)
  // Normalised frequency count across all 11 countries
  // Gaming dominates globally (100), Music 2nd (59), Entertainment 3rd (38)
  categoryScore: {
    "Gaming":               100,
    "Music":                59,
    "Entertainment":        38,
    "People & Blogs":       15,
    "Film & Animation":     12,
    "Sports":               3,
    "News & Politics":      2,
    "Comedy":               1,
    "Howto & Style":        1,
    "Science & Technology": 1,
    "Autos & Vehicles":     1,
    "Education":            1,
    "Pets & Animals":       1,
    "Travel & Events":      1,
    "Nonprofits & Activism":1,
  },

  // Best publish days ranked by trending appearance frequency
  // Wednesday = #1 globally, Sunday = weakest
  publishDayScore: {
    "Monday":    0.79,
    "Tuesday":   0.93,
    "Wednesday": 1.00,
    "Thursday":  0.92,
    "Friday":    0.87,
    "Saturday":  0.74,
    "Sunday":    0.67,
  },

  // Publish hour score (0–23), normalised
  // Peak: 15:00 (1.0) — strong window: 11:00–16:00
  publishHourScore: [
    0.32, // 00:00
    0.26, // 01:00
    0.20, // 02:00
    0.28, // 03:00
    0.25, // 04:00
    0.27, // 05:00
    0.22, // 06:00
    0.35, // 07:00
    0.56, // 08:00
    0.76, // 09:00
    0.68, // 10:00
    0.81, // 11:00
    0.84, // 12:00
    0.83, // 13:00
    0.86, // 14:00
    1.00, // 15:00 <- global peak
    0.93, // 16:00
    0.75, // 17:00
    0.62, // 18:00
    0.54, // 19:00
    0.62, // 20:00
    0.56, // 21:00
    0.48, // 22:00
    0.40, // 23:00
  ],

  // Title benchmarks — computed from 178,399 trending titles
  // mean=52.5, median=50, p25=35, p75=69
  // Key findings from view-lift analysis:
  //   CAPS words -> 1.2x view lift (confirmed positive signal)
  //   Numbers    -> 0.7x lift (negative — no bonus)
  //   Brackets   -> 0.51x lift (hurts performance — penalise)
  //   Questions  -> 0.97x (neutral)
  titleBenchmarks: {
    optimalMinLength: 35,
    optimalMaxLength: 69,
    absoluteMax: 100,
    capsWordsBonus: true,
    numberBonus: false,
    questionBonus: false,
    bracketPenalty: true,
  },

  // Tag benchmarks — from 178,399 trending videos
  // mean=13.0, median=12, p25=0, p75=21
  tagBenchmarks: {
    optimalMin: 8,
    optimalMax: 21,
    penaltyBelow: 4,
    bonusRange: [10, 18],
  },

  // Engagement benchmarks — median likes & comments per 1,000 views
  // Computed from videos with >1,000 views across all 11 countries
  engagementBenchmarks: {
    "Entertainment":        { likes: 27.2, comments: 0.8 },
    "Music":                { likes: 15.9, comments: 0.6 },
    "Gaming":               { likes: 23.5, comments: 1.0 },
    "News & Politics":      { likes: 30.9, comments: 2.5 },
    "Sports":               { likes: 26.3, comments: 0.7 },
    "Science & Technology": { likes: 41.0, comments: 1.9 },
    "Howto & Style":        { likes: 45.4, comments: 0.9 },
    "People & Blogs":       { likes: 26.8, comments: 0.5 },
    "Comedy":               { likes: 37.7, comments: 0.5 },
    "Film & Animation":     { likes: 22.7, comments: 1.1 },
    "Autos & Vehicles":     { likes: 26.4, comments: 0.7 },
    "Travel & Events":      { likes: 40.7, comments: 0.7 },
    "Education":            { likes: 47.1, comments: 1.1 },
    "Pets & Animals":       { likes: 28.7, comments: 0.3 },
    "Nonprofits & Activism":{ likes: 40.8, comments: 0.6 },
    "default":              { likes: 27.0, comments: 0.9 },
  },

  // Verdict thresholds
  verdicts: [
    { min: 85, label: "🔥 Highly Likely to Trend",  color: "great" },
    { min: 70, label: "⚡ Strong Viral Potential",   color: "high"  },
    { min: 50, label: "📈 Moderate Chance",          color: "mid"   },
    { min: 30, label: "⚠️ Needs Improvement",        color: "low"   },
    { min: 0,  label: "🔴 Low Virality Signal",      color: "low"   },
  ],
};