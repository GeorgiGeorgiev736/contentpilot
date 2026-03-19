// Prompts for each AI feature
// Each receives a context object from the frontend

const FEATURE_PROMPTS = {

  scan_trends: ({ niche, platforms }) => `
Detect the top 5 emerging content trends for a creator in the "${niche}" niche on ${platforms || "TikTok and YouTube"}.

For each trend provide:
1. **TOPIC** — specific, searchable hashtag or theme
2. **VIRALITY SCORE** — 1-100
3. **GROWTH RATE** — percentage growth in last 7 days
4. **TIMING WINDOW** — how long until saturation
5. **CONTENT ANGLE** — unique angle for this creator
6. **HOOK IDEA** — one specific opening line
7. **BEST PLATFORM** — where it performs best right now

Be specific. Reference real viral patterns. No generic advice.`,

  analyze_trend: ({ topic, growth, window, platforms, niche }) => `
Deep-analyze this trending topic for a ${niche} creator:

Topic: ${topic}
Growth: ${growth}
Timing window: ${window}
Platforms: ${platforms}

Provide:
1. **WHY IT'S TRENDING** — the psychological/cultural trigger
2. **UNIQUE CONTENT ANGLE** — specific to this niche, not generic
3. **3 HOOK IDEAS** — exact opening lines that stop the scroll
4. **FORMAT** — ideal length, style, format per platform
5. **HASHTAG STACK** — 10 tiered hashtags (3 mega + 4 mid + 3 niche)
6. **COMPETITOR GAP** — what existing videos on this trend are missing
7. **URGENCY** — act today / this week / this month — and why`,

  optimize_video: ({ title, platform, views, issues }) => `
Full SEO optimization for this ${platform} video:

Title: "${title}"
${views ? `Current views: ${views}` : ""}
${issues?.length ? `Known issues: ${issues.join(", ")}` : ""}

Provide:
## TITLE — 3 A/B test alternatives with reasoning (include keyword, curiosity gap, emotion triggers)
## TAGS — 30 optimized tags in priority order (5 branded + 10 broad + 10 mid-tail + 5 long-tail)
## DESCRIPTION — full optimized description, first 200 chars critical for SEO, include timestamps format, CTA, hashtags
## CHAPTERS — suggested timestamp markers for this type of video
## THUMBNAIL TIPS — 3 specific improvements
## POSTING TIME — optimal day + time for ${platform}
## ENGAGEMENT PLAYBOOK — first 60 minutes after posting
## PREDICTED IMPACT — realistic CTR and view boost estimates`,

  generate_thumbnail: ({ title, style }) => `
Design 4 high-CTR YouTube thumbnail concepts for: "${title}"
Requested style: ${style || "bold text"}

For EACH concept:
## CONCEPT [N]: [PUNCHY NAME]
**Background**: exact color (hex code) or scene description
**Main text** (max 4 words): "EXACT TEXT IN QUOTES"
**Sub text**: "EXACT TEXT" (or "none")
**Text style**: bold/outlined/gradient/drop-shadow
**Face/subject**: expression, pose, angle, what they hold
**Color psychology**: why these colors trigger clicks
**CTR prediction**: X-X% expected click-through rate
**Psychological trigger**: curiosity / fear / FOMO / social proof / etc

Finish with:
**A/B TEST RECOMMENDATION**: which 2 to test first and exactly why`,

  analyze_thumbnail: ({ title, style, ctr, score }) => `
Analyze this existing thumbnail and give specific improvements:

Video: "${title}"
Style: ${style}, Current CTR: ${ctr}, Score: ${score}/100

1. **WHAT'S WORKING** — specific elements driving clicks
2. **CRITICAL WEAKNESSES** — exactly what's hurting CTR
3. **3 IMPROVEMENTS** — detailed, specific visual changes
4. **REDESIGNED CONCEPT** — full description of optimized version with hex colors
5. **EXPECTED CTR AFTER** — realistic prediction with reasoning
6. **A/B VARIANT** — a second slight variation to test`,

  generate_script: ({ topic, format, tone, audience, style }) => `
Write a complete, production-ready ${format} script for: "${topic}"
Tone: ${tone}, Audience: ${audience}
${style ? `Channel style: ${style}` : ""}

FORMAT THE SCRIPT EXACTLY LIKE THIS:

---
## HOOK (0-5s)
[VISUAL: exact scene description]
[MUSIC: vibe + tempo]
Spoken: "exact words"
[TEXT OVERLAY: on-screen text]

## BUILD ([time range])
[VISUAL: ...]
[B-ROLL: specific footage to find/shoot]
Spoken: "..."
[TEXT OVERLAY: ...]
→ Pattern interrupt at [timestamp]

## CLIMAX ([time range])
...

## CTA ([time range])
...

📸 THUMBNAIL FRAME → [describe the exact frame]
---

After the script:
**PERFORMANCE PREDICTIONS**
- Expected completion rate: X%
- Best posting time: day + time + timezone
- Top 5 hashtags
- Why this hook works (psychological trigger)
- One thing that could make this script 20% better`,

  analyze_growth: ({ platform, views, subscribers, revenue }) => `
Analyze growth for a creator with these stats:
Platform: ${platform}
Views (30 days): ${views}
Subscribers/Followers: ${subscribers}
Revenue: ${revenue || "not specified"}

1. **GROWTH VELOCITY** — is this fast/slow/average for this niche? Why?
2. **KEY GROWTH DRIVERS** — what's actually working
3. **BOTTLENECKS** — what's holding growth back
4. **COMPOUND EFFECTS** — what happens if current trajectory continues for 90 days
5. **3 HIGHEST LEVERAGE ACTIONS** — ranked by impact vs effort
6. **30-DAY GROWTH PLAN** — specific weekly targets and tactics`,

  revenue_strategy: ({ subscribers, monthlyViews, currentRevenue, platforms }) => `
Revenue optimization for a creator:
Subscribers/Followers: ${subscribers}
Monthly views: ${monthlyViews}
Current monthly revenue: ${currentRevenue || "unknown"}
Active platforms: ${platforms}

1. **CURRENT REVENUE AUDIT** — what they're likely earning and from what
2. **UNTAPPED REVENUE STREAMS** — ranked by realistic earning potential
3. **MONETIZATION STACK** — ideal mix of income sources for this creator size
4. **90-DAY REVENUE ROADMAP** — specific steps to 2x income
5. **PRICING STRATEGY** — for sponsorships, products, or services
6. **REALISTIC PROJECTIONS** — monthly income at 6 months and 12 months if they execute

Be specific with dollar amounts. Reference real creator economy rates.`,


  // ── Scheduler AI helpers ──────────────────────────────────────
  schedule_title: ({ currentTitle, description, platforms }) => `You are an expert content strategist. Generate 3 high-performing video titles.

Current draft: "${currentTitle || "none"}"
Description hint: "${description || "not provided"}"
Target platforms: ${(platforms || []).join(", ") || "YouTube, TikTok, Instagram"}

Rules:
- YouTube: 50-70 chars, keyword-rich, curiosity gap or number hook
- TikTok/Instagram: punchy, < 50 chars, emotion-driven
- Return exactly 3 numbered options, no extra text`,

  schedule_description: ({ title, platforms, hashtags }) => `Write a complete video description optimized for ${(platforms || []).join(", ") || "YouTube"}.

Video title: "${title || "untitled"}"
Existing hashtags: "${hashtags || "none"}"

Include:
- Compelling opening sentence (matches title energy)
- Key value points viewers will get
- Timestamps section (use placeholder: 00:00 Intro etc.)
- Call to action (subscribe/follow/comment)
- 5-10 SEO keywords naturally woven in
- Keep under 400 words`,

  schedule_hashtags: ({ title, description, platforms }) => `Generate the optimal hashtag set for "${title || "this video"}" on ${(platforms || []).join(", ") || "YouTube, TikTok, Instagram"}.

Description context: "${(description || "").slice(0, 200)}"

Return ONLY hashtags (with #), space-separated, no explanation:
- 5 broad/high-volume tags
- 8 mid-tier niche tags
- 5 long-tail specific tags
- 2 trending/timely tags`,

};

// Pipeline stage prompts (used by the AI Pipeline page)
const STAGE_PROMPTS = {
  trend:     ({ niche, platforms }) => FEATURE_PROMPTS.scan_trends({ niche, platforms }),
  virality:  ({ topic, platforms }) => `Predict virality score (1-100) for "${topic}" on ${platforms}. Include psychological drivers, engagement forecast, and optimization tips to push score above 90.`,
  idea:      ({ topic, niche })     => `Generate the single BEST content idea for a ${niche} creator around: "${topic}". Include hook, angle, format, and why it beats existing content.`,
  script:    ({ idea, platform })   => FEATURE_PROMPTS.generate_script({ topic: idea, format: platform === "tiktok" ? "TikTok 60s" : "YouTube 8-12 min", tone: "conversational", audience: "general" }),
  thumbnail: ({ idea })             => FEATURE_PROMPTS.generate_thumbnail({ title: idea, style: "bold" }),
  tags:      ({ idea, platform })   => FEATURE_PROMPTS.optimize_video({ title: idea, platform }),
  schedule:  ({ idea, platforms })  => `Create the optimal posting schedule and 24-hour engagement playbook for: "${idea}" on ${platforms}. Include exact times by timezone, cross-posting plan, and what to do minute-by-minute after posting.`,
};

module.exports = { FEATURE_PROMPTS, STAGE_PROMPTS };
