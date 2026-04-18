// ============================================================
//  app.js — TrendCheck Main Application Logic
//  Handles form → score → Claude AI suggestions → render
// ============================================================

// ── YOUR GEMINI API KEY (FREE) ───────────────────────────────
// Get a free key at: https://aistudio.google.com → "Get API Key"
// No credit card required
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";
// ────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

// ── TITLE CHARACTER COUNTER ──────────────────────────────────
$('title').addEventListener('input', function() {
  const len = this.value.length;
  const hint = $('titleHint');
  hint.textContent = `${len} characters`;
  if (len >= 40 && len <= 70) {
    hint.style.color = '#e8ff3b';
  } else if (len > 70) {
    hint.style.color = '#ff4d6d';
  } else {
    hint.style.color = '#444';
  }
});

// ── TAG COUNTER ───────────────────────────────────────────────
$('tags').addEventListener('input', function() {
  const count = this.value.split(',').filter(t => t.trim().length > 0).length;
  const hint = $('tagHint');
  hint.textContent = `${count} tag${count !== 1 ? 's' : ''}`;
  if (count >= 10 && count <= 16) {
    hint.style.color = '#e8ff3b';
  } else if (count > 20) {
    hint.style.color = '#ff4d6d';
  } else {
    hint.style.color = '#444';
  }
});

// ── FORM SUBMIT ───────────────────────────────────────────────
$('videoForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const input = {
    url:         $('url').value.trim(),
    title:       $('title').value.trim(),
    category:    $('category').value,
    publishDay:  $('publishDay').value,
    publishTime: $('publishTime').value,
    duration:    $('duration').value.trim(),
    tags:        $('tags').value.trim(),
    description: $('description').value.trim(),
    views:       $('views').value,
    likes:       $('likes').value,
    comments:    $('comments').value,
    channelSize: $('channelSize').value,
  };

  // Button loading state
  const btn = $('submitBtn');
  btn.classList.add('loading');
  btn.querySelector('.btn-text').textContent = 'Analysing...';

  // Run local scoring
  const result = Scorer.analyse(input);

  // Show results section
  $('results').style.display = 'block';
  $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Render scores
  renderScores(result, input);

  // Fetch AI suggestions
  await fetchAISuggestions(input, result);

  // Reset button
  btn.classList.remove('loading');
  btn.querySelector('.btn-text').textContent = 'Analyse Virality';
});

// ── RENDER SCORES ─────────────────────────────────────────────
function renderScores(result, input) {
  const { overall, verdict, subs } = result;

  // Overall score number
  animateNumber($('overallScore'), overall);
  $('ringScore').textContent = overall;
  $('scoreVerdict').textContent = verdict.label;

  // Ring fill animation (circumference = 2π×50 ≈ 314)
  const offset = 314 - (314 * overall / 100);
  setTimeout(() => {
    $('ringFill').style.strokeDashoffset = offset;
  }, 100);

  // Score colour class
  const scoreCard = document.querySelector('.score-card');
  scoreCard.className = `score-card score-${verdict.color}`;

  // Sub scores
  const subDefs = [
    { key: 'title',      label: 'Title Strength',    color: ''        },
    { key: 'category',   label: 'Category Momentum', color: ''        },
    { key: 'timing',     label: 'Timing Window',     color: 'accent3' },
    { key: 'tags',       label: 'Tag Quality',       color: ''        },
  ];

  if (subs.engagement.score !== null) {
    subDefs.push({ key: 'engagement', label: 'Engagement Profile', color: 'accent2' });
  }

  const container = $('subScores');
  container.innerHTML = '';

  subDefs.forEach(({ key, label, color }, i) => {
    const sub = subs[key];
    const score = sub.score ?? 0;
    const card = document.createElement('div');
    card.className = 'sub-score-card';
    card.style.animationDelay = `${i * 0.1}s`;
    card.innerHTML = `
      <div class="sub-score-name">${label}</div>
      <div class="sub-score-bar-wrap">
        <div class="sub-score-bar ${color}" style="transform: scaleX(0)" data-target="${score / 100}"></div>
      </div>
      <div class="sub-score-val">${score}<span style="font-size:0.8rem;color:var(--muted)">/100</span></div>
      <div style="font-size:0.68rem;color:var(--muted);margin-top:0.4rem;line-height:1.5">${sub.detail || ''}</div>
    `;
    container.appendChild(card);
  });

  // Animate bars
  setTimeout(() => {
    document.querySelectorAll('.sub-score-bar').forEach(bar => {
      bar.style.transform = `scaleX(${bar.dataset.target})`;
      bar.style.transition = 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
    });
  }, 200);
}

// ── ANIMATE NUMBER ────────────────────────────────────────────
function animateNumber(el, target) {
  let current = 0;
  const step = target / 40;
  const interval = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = Math.round(current);
    if (current >= target) clearInterval(interval);
  }, 20);
}

// ── CLAUDE AI SUGGESTIONS ─────────────────────────────────────
async function fetchAISuggestions(input, result) {
  const { overall, verdict, subs } = result;
  const body = $('analysisBody');

  body.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';

  const prompt = buildPrompt(input, result);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1000 }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    body.innerHTML = formatAnalysis(text);

  } catch (err) {
    console.error(err);
    // Fallback: show rule-based suggestions
    body.innerHTML = formatAnalysis(buildFallbackSuggestions(input, result));
  }
}

// ── PROMPT BUILDER ────────────────────────────────────────────
function buildPrompt(input, result) {
  const { overall, subs } = result;
  const tagCount = input.tags ? input.tags.split(',').filter(t=>t.trim()).length : 0;

  return `You are TrendCheck, an AI virality analyst for YouTube creators. You have access to real 2026 YouTube trending data from 11 countries (178,399 videos: BR, CA, DE, FR, GB, IN, JP, KR, MX, RU, US).

Key findings from the dataset:
- Gaming dominates trending globally (2x more than Music)
- Wednesday is the #1 publish day; Sunday is weakest
- Peak upload window: 15:00 local time; strong zone: 11:00-16:00
- CAPS words in titles = 1.2x higher median views
- Brackets/parentheses in titles = 0.51x views (negative signal - advise removing)
- Optimal title length: 35-69 characters
- Optimal tag count: 10-18 tags
- Education and Howto & Style have highest like-rates per 1K views

A creator has submitted their video for virality analysis. Here are their video details and scores:

A creator has submitted their video for virality analysis. Here are their video details and scores:

**VIDEO DETAILS:**
- Title: "${input.title}"
- Category: ${input.category || "Not specified"}
- Publish Day: ${input.publishDay || "Not specified"}
- Publish Time: ${input.publishTime || "Not specified"}
- Tags (${tagCount}): ${input.tags || "None provided"}
- Description snippet: ${input.description || "Not provided"}
- Channel size: ${input.channelSize || "Not specified"}
${input.views ? `- Views: ${input.views}, Likes: ${input.likes}, Comments: ${input.comments}` : ""}

**VIRALITY SCORES:**
- Overall Score: ${overall}/100
- Title Strength: ${subs.title.score}/100 (${subs.title.detail})
- Category Momentum: ${subs.category.score}/100
- Timing Window: ${subs.timing.score}/100 (${subs.timing.detail})
- Tag Quality: ${subs.tags.score}/100 (${subs.tags.detail})
${subs.engagement.score !== null ? `- Engagement Profile: ${subs.engagement.score}/100 (${subs.engagement.detail})` : ""}

Provide a concise, actionable virality analysis with the following structure:

## Overall Assessment
2-3 sentences summarising the video's viral potential based on the scores.

## Top 3 Improvements
The 3 highest-impact changes this creator should make, with specific, actionable advice. Be specific — don't say "improve your title", say HOW to improve it.

## What's Working
1-2 things they're already doing right.

## Timing Tip
One specific publish timing recommendation based on their category and the trending data.

Keep your tone direct, data-driven, and encouraging. Use creator-friendly language. Do not use markdown headers with # — use the format shown above literally with ##.`;
}

// ── FORMAT ANALYSIS ───────────────────────────────────────────
function formatAnalysis(text) {
  // Convert ## headers to styled h4
  let html = text
    .replace(/^## (.+)$/gm, '<h4>$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((<li>.+?<\/li>\s*)+)/gs, '<ul>$1</ul>');

  return `<p>${html}</p>`;
}

// ── FALLBACK SUGGESTIONS (no API key) ────────────────────────
function buildFallbackSuggestions(input, result) {
  const { subs } = result;
  const suggestions = [];

  if (subs.title.score < 70) {
    const len = input.title?.length || 0;
    if (len < 40) suggestions.push(`Your title is too short (${len} chars). Aim for 40–70 characters. Try adding context, a number, or an emotional hook.`);
    else if (len > 70) suggestions.push(`Your title is long (${len} chars). Trim it to under 70 characters to avoid truncation in search results.`);
    else suggestions.push(`Add a number or power word to your title — e.g. "100 Days", "FIRST EVER", or "Why I..." to boost click-through.`);
  }

  if (subs.tags.score < 70) {
    const count = input.tags?.split(',').filter(t=>t.trim()).length || 0;
    if (count < 10) suggestions.push(`You only have ${count} tags. Trending videos typically use 10–16 tags — add a mix of broad (e.g. "gaming") and specific (e.g. "minecraft survival 2026") tags.`);
  }

  if (subs.timing.score < 70) {
    suggestions.push(`For ${input.category || "your category"}, the best upload window is Thursday–Friday between 4pm–7pm local time. This aligns with peak viewer activity in the trending data.`);
  }

  if (subs.category.score < 60) {
    suggestions.push(`${input.category} is a lower-frequency trending category. Consider cross-tagging into higher-traffic categories like Entertainment or Music if the content allows.`);
  }

  const working = [];
  if (subs.title.score >= 70) working.push("strong title structure");
  if (subs.timing.score >= 80) working.push("great publish timing");
  if (subs.tags.score >= 80) working.push("solid tag coverage");
  if (subs.category.score >= 75) working.push("high-momentum category");

  let text = "## Overall Assessment\n";
  text += `Your video scores ${result.overall}/100 for virality potential. `;
  text += result.overall >= 70
    ? "You're in a strong position — a few tweaks could push you over the trending threshold."
    : "There are clear opportunities to improve your chances before publishing.";
  text += "\n\n## Top Improvements\n";
  if (suggestions.length === 0) {
    text += "Your setup looks solid across the key signals. Focus on thumbnail quality and initial engagement velocity in the first hour after publishing.\n";
  } else {
    suggestions.forEach((s, i) => { text += `${i+1}. ${s}\n`; });
  }

  if (working.length > 0) {
    text += `\n## What's Working\nYou have a ${working.join(', ')} — these are genuine strengths based on the trending data.\n`;
  }

  text += `\n## Timing Tip\nFor ${input.category || "your category"}, Thursday and Friday uploads between 4pm–6pm consistently outperform other windows in the 2026 trending dataset.`;

  return text;
}

// ── RESET BUTTON ─────────────────────────────────────────────
$('resetBtn').addEventListener('click', () => {
  $('results').style.display = 'none';
  document.querySelector('.analyser').scrollIntoView({ behavior: 'smooth' });
});