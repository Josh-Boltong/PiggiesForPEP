// ============================================================
//  scorer.js — TrendCheck Virality Scoring Engine
//  Computes sub-scores from video metadata + dataset benchmarks
// ============================================================

const Scorer = {

  // ─── 1. TITLE SCORE (0-100) ─────────────────────────────
  scoreTitle(title) {
    if (!title || title.trim().length === 0) return { score: 0, detail: "No title provided." };

    const t = title.trim();
    const len = t.length;
    const b = TRENDCHECK_DATA.titleBenchmarks;
    let score = 0;
    const notes = [];

    // Length scoring (40 pts)
    if (len >= b.optimalMinLength && len <= b.optimalMaxLength) {
      score += 40;
      notes.push("Optimal length ✓");
    } else if (len < b.optimalMinLength) {
      const penalty = (len / b.optimalMinLength) * 40;
      score += Math.round(penalty);
      notes.push(`Title is short (${len} chars — aim for ${b.optimalMinLength}–${b.optimalMaxLength})`);
    } else if (len <= b.absoluteMax) {
      const over = len - b.optimalMaxLength;
      score += Math.max(20, 40 - over);
      notes.push(`Title slightly long (${len} chars)`);
    } else {
      score += 10;
      notes.push(`Title too long (${len} chars — YouTube truncates at ~100)`);
    }

    // Caps words bonus (15 pts) — e.g. "I QUIT my job"
    const capsWords = t.split(' ').filter(w => w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w));
    if (capsWords.length >= 1 && capsWords.length <= 3) {
      score += 15;
      notes.push("Power caps word detected ✓");
    }

    // Numbers — data shows 0.7x view lift (neutral/negative), no bonus awarded

    // Brackets/parentheses — confirmed 0.51x view lift, apply penalty
    if (/[\(\)\[\]]/.test(t)) {
      score -= 10;
      notes.push("Brackets hurt performance (0.51x lift in data) ⚠️");
    }

    // Exclamation — mild positive energy signal
    if (/[!]/.test(t)) {
      score += 8;
      notes.push("Exclamation mark adds energy ✓");
    }

    // Clickbait power words (5 pts)
    const powerWords = ['secret','exposed','truth','shocking','never','first','only','real','inside','behind','caught','gone wrong','gone right','challenge','24 hours','days','years','vs','versus','reaction'];
    const lower = t.toLowerCase();
    if (powerWords.some(w => lower.includes(w))) {
      score += 5;
      notes.push("Trending keyword detected ✓");
    }

    return { score: Math.min(100, score), detail: notes.join(' · ') };
  },

  // ─── 2. CATEGORY SCORE (0-100) ───────────────────────────
  scoreCategory(category) {
    if (!category) return { score: 0, detail: "No category selected." };
    const score = TRENDCHECK_DATA.categoryScore[category] || 50;
    const topCats = Object.entries(TRENDCHECK_DATA.categoryScore)
      .sort((a,b) => b[1]-a[1]).slice(0,3).map(e => e[0]);
    const isTop = topCats.includes(category);
    return {
      score,
      detail: isTop
        ? `${category} is one of the highest-trending categories ✓`
        : `${category} has moderate trending frequency`
    };
  },

  // ─── 3. TIMING SCORE (0-100) ─────────────────────────────
  scoreTiming(day, timeStr) {
    if (!day) return { score: 0, detail: "No publish day provided." };

    const dayMult = TRENDCHECK_DATA.publishDayScore[day] || 0.75;
    let hourMult = 0.5;
    let hourNote = "";

    if (timeStr) {
      const [h] = timeStr.split(':').map(Number);
      hourMult = TRENDCHECK_DATA.publishHourScore[h] || 0.5;
      if (hourMult >= 0.9) hourNote = `${timeStr} is a peak upload window ✓`;
      else if (hourMult >= 0.7) hourNote = `${timeStr} is a good upload window`;
      else hourNote = `${timeStr} is off-peak — consider 16:00–20:00`;
    }

    const score = Math.round(((dayMult + hourMult) / 2) * 100);
    const dayNote = dayMult >= 0.9 ? `${day} is a top trending day ✓` : `${day} is an average day`;

    return { score, detail: [dayNote, hourNote].filter(Boolean).join(' · ') };
  },

  // ─── 4. TAG SCORE (0-100) ────────────────────────────────
  scoreTags(tagsStr) {
    if (!tagsStr || tagsStr.trim().length === 0) {
      return { score: 20, detail: "No tags provided — trending videos average 10–16 tags" };
    }

    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    const count = tags.length;
    const b = TRENDCHECK_DATA.tagBenchmarks;

    let score = 0;
    let note = "";

    if (count < b.penaltyBelow) {
      score = 20;
      note = `Only ${count} tags — add more (aim for ${b.optimalMin}–${b.optimalMax})`;
    } else if (count >= b.bonusRange[0] && count <= b.bonusRange[1]) {
      score = 100;
      note = `${count} tags — optimal range ✓`;
    } else if (count >= b.optimalMin && count <= b.optimalMax) {
      score = 80;
      note = `${count} tags — good`;
    } else if (count > b.optimalMax) {
      score = 65;
      note = `${count} tags — slightly over the sweet spot`;
    } else {
      score = 50;
      note = `${count} tags — could use a few more`;
    }

    // Diversity bonus: mix of broad + specific
    const avgLen = tags.reduce((s, t) => s + t.length, 0) / tags.length;
    if (avgLen > 8 && avgLen < 25) {
      score = Math.min(100, score + 5);
      note += ' · Good tag specificity ✓';
    }

    return { score, detail: note };
  },

  // ─── 5. ENGAGEMENT SCORE (0-100) — optional ──────────────
  scoreEngagement(views, likes, comments, category) {
    if (!views || views === 0) {
      return { score: null, detail: "No engagement data provided (optional)" };
    }

    const bench = TRENDCHECK_DATA.engagementBenchmarks[category]
      || TRENDCHECK_DATA.engagementBenchmarks["default"];

    const likePer1k  = (likes   / views) * 1000;
    const commentPer1k = (comments / views) * 1000;

    const likeRatio    = Math.min(1.5, likePer1k    / bench.likes);
    const commentRatio = Math.min(1.5, commentPer1k / bench.comments);

    const score = Math.round(((likeRatio + commentRatio) / 2) * 100 * (2/3));
    const clipped = Math.min(100, Math.max(0, score));

    const likeNote = likeRatio >= 1
      ? `Like rate above benchmark ✓ (${likePer1k.toFixed(1)}/1K)`
      : `Like rate below benchmark (${likePer1k.toFixed(1)}/1K vs ${bench.likes} expected)`;

    const commentNote = commentRatio >= 1
      ? `Comment rate above benchmark ✓`
      : `Comment rate below benchmark`;

    return { score: clipped, detail: `${likeNote} · ${commentNote}` };
  },

  // ─── OVERALL SCORE ───────────────────────────────────────
  computeOverall(subs) {
    // Weights: title 25%, category 20%, timing 20%, tags 15%, engagement 20% (if available)
    const { title, category, timing, tags, engagement } = subs;

    if (engagement.score !== null) {
      return Math.round(
        title.score      * 0.25 +
        category.score   * 0.20 +
        timing.score     * 0.20 +
        tags.score       * 0.15 +
        engagement.score * 0.20
      );
    } else {
      // Redistribute engagement weight
      return Math.round(
        title.score    * 0.30 +
        category.score * 0.25 +
        timing.score   * 0.25 +
        tags.score     * 0.20
      );
    }
  },

  // ─── VERDICT ─────────────────────────────────────────────
  getVerdict(score) {
    for (const v of TRENDCHECK_DATA.verdicts) {
      if (score >= v.min) return v;
    }
    return TRENDCHECK_DATA.verdicts[TRENDCHECK_DATA.verdicts.length - 1];
  },

  // ─── FULL ANALYSIS ───────────────────────────────────────
  analyse(input) {
    const title      = this.scoreTitle(input.title);
    const category   = this.scoreCategory(input.category);
    const timing     = this.scoreTiming(input.publishDay, input.publishTime);
    const tags       = this.scoreTags(input.tags);
    const engagement = this.scoreEngagement(
      parseInt(input.views)    || 0,
      parseInt(input.likes)    || 0,
      parseInt(input.comments) || 0,
      input.category
    );

    const overall = this.computeOverall({ title, category, timing, tags, engagement });
    const verdict = this.getVerdict(overall);

    return { overall, verdict, subs: { title, category, timing, tags, engagement } };
  }
};