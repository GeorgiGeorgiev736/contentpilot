// Credit cost per AI feature — single source of truth
// Costs reflect output length, API cost, and perceived value
//
// Unlimited plans (pro, business, max) are never blocked — costs still
// logged for analytics but credits are not deducted from their balance.

const CREDIT_COSTS = {
  // ── Trend features ──────────────────────────────────────────
  scan_trends:          3,   // 5 detailed trends, medium-long output
  analyze_trend:        2,   // deep single-trend analysis

  // ── Script writer ────────────────────────────────────────────
  generate_script:      5,   // full script with b-roll notes, long output

  // ── Video optimizer ─────────────────────────────────────────
  optimize_video:       2,   // title/tags/SEO optimization

  // ── Thumbnail ────────────────────────────────────────────────
  generate_thumbnail:   2,   // thumbnail concept + prompt
  analyze_thumbnail:    1,   // critique existing thumbnail

  // ── Analytics / growth ───────────────────────────────────────
  analyze_growth:       2,   // channel growth analysis
  revenue_strategy:     3,   // monetization strategy (high value)

  // ── Scheduler AI helpers ─────────────────────────────────────
  schedule_title:       1,   // 3 title options, short output
  schedule_description: 2,   // full description, medium output
  schedule_hashtags:    1,   // hashtag list, short output

  // ── Video Clipper ─────────────────────────────────────────────
  suggest_clips:        3,   // AI analyzes video to suggest best Short segments
  batch_clips:          8,   // AI suggests + ffmpeg trims + batch schedules short clips

  // ── AI Avatar ────────────────────────────────────────────────
  avatar_generate:     15,   // ElevenLabs TTS + SadTalker render on Replicate

  // ── AI Pipeline stages ───────────────────────────────────────
  trend:                3,   // same as scan_trends
  virality:             1,
  idea:                 1,
  script:               5,   // same as generate_script
  thumbnail:            2,
  tags:                 1,
  schedule:             1,
};

const DEFAULT_COST = 1;

function getCost(feature) {
  return CREDIT_COSTS[feature] ?? DEFAULT_COST;
}

module.exports = { CREDIT_COSTS, getCost };
