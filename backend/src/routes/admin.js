const router = require("express").Router();
const { query, queryOne } = require("../db/client");
const { requireAuth } = require("../middleware/auth");

// All admin routes require auth + is_admin
async function requireAdmin(req, res, next) {
  if (!req.user.is_admin) return res.status(403).json({ error: "Admin only" });
  next();
}

// ── GET /api/admin/stats ──────────────────────────────────────
router.get("/stats", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [
      userStats, planBreakdown, recentUsers,
      aiUsage, platformStats, scheduledStats,
    ] = await Promise.all([
      // Total users + growth
      queryOne(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24h')  AS today,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7d')   AS week,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30d')  AS month,
          COUNT(*) FILTER (WHERE email_verified = true)                 AS verified,
          COUNT(*) FILTER (WHERE oauth_provider IS NOT NULL)            AS oauth_users
        FROM users
      `),
      // Plan breakdown
      query(`SELECT plan, COUNT(*) AS count FROM users GROUP BY plan ORDER BY count DESC`),
      // Recent signups
      query(`SELECT id, name, email, plan, created_at, email_verified, oauth_provider FROM users ORDER BY created_at DESC LIMIT 10`),
      // AI usage last 30 days
      queryOne(`
        SELECT
          COUNT(*) AS total_requests,
          SUM(tokens_used) AS total_tokens,
          SUM(credits_used) AS total_credits
        FROM ai_usage WHERE created_at > NOW() - INTERVAL '30d'
      `),
      // Platform connections
      query(`SELECT platform, COUNT(*) AS count FROM platform_connections WHERE connected = true GROUP BY platform ORDER BY count DESC`),
      // Scheduled posts
      queryOne(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'scheduled') AS pending,
          COUNT(*) FILTER (WHERE status = 'published') AS published,
          COUNT(*) FILTER (WHERE status = 'failed')    AS failed
        FROM scheduled_posts
      `),
    ]);

    res.json({ userStats, planBreakdown, recentUsers, aiUsage, platformStats, scheduledStats });
  } catch (err) { next(err); }
});

// ── GET /api/admin/flags ──────────────────────────────────────
router.get("/flags", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const flags = await query("SELECT key, label, enabled, updated_at FROM feature_flags ORDER BY key");
    res.json({ flags });
  } catch (err) { next(err); }
});

// ── PATCH /api/admin/flags/:key ───────────────────────────────
router.patch("/flags/:key", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { enabled } = req.body;
    await query(
      "UPDATE feature_flags SET enabled = $1, updated_at = NOW() WHERE key = $2",
      [!!enabled, req.params.key]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── GET /api/admin/health ─────────────────────────────────────
// Pings each external API to check if it's reachable
router.get("/health", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const checks = await Promise.allSettled([
      // Anthropic
      fetch("https://api.anthropic.com", { signal: AbortSignal.timeout(5000) })
        .then(r => ({ service: "anthropic", ok: r.status < 500, status: r.status }))
        .catch(() => ({ service: "anthropic", ok: false, status: 0 })),

      // Google OAuth
      fetch("https://accounts.google.com/.well-known/openid-configuration", { signal: AbortSignal.timeout(5000) })
        .then(r => ({ service: "google", ok: r.ok, status: r.status }))
        .catch(() => ({ service: "google", ok: false, status: 0 })),

      // YouTube API
      fetch("https://www.googleapis.com/youtube/v3/i18nLanguages?part=snippet&key=test", { signal: AbortSignal.timeout(5000) })
        .then(r => ({ service: "youtube", ok: r.status !== 500 && r.status !== 503, status: r.status }))
        .catch(() => ({ service: "youtube", ok: false, status: 0 })),

      // TikTok
      fetch("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", signal: AbortSignal.timeout(5000) })
        .then(r => ({ service: "tiktok", ok: r.status < 500, status: r.status }))
        .catch(() => ({ service: "tiktok", ok: false, status: 0 })),

      // Facebook/Meta
      fetch("https://graph.facebook.com/v19.0/", { signal: AbortSignal.timeout(5000) })
        .then(r => ({ service: "meta", ok: r.status < 500, status: r.status }))
        .catch(() => ({ service: "meta", ok: false, status: 0 })),

      // Replicate
      fetch("https://api.replicate.com/v1/models", {
        headers: process.env.REPLICATE_API_TOKEN ? { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` } : {},
        signal: AbortSignal.timeout(5000),
      })
        .then(r => ({ service: "replicate", ok: r.ok, status: r.status }))
        .catch(() => ({ service: "replicate", ok: false, status: 0 })),

      // ElevenLabs
      fetch("https://api.elevenlabs.io/v1/voices", {
        headers: process.env.ELEVENLABS_API_KEY ? { "xi-api-key": process.env.ELEVENLABS_API_KEY } : {},
        signal: AbortSignal.timeout(5000),
      })
        .then(r => ({ service: "elevenlabs", ok: r.ok, status: r.status }))
        .catch(() => ({ service: "elevenlabs", ok: false, status: 0 })),

      // PayPal
      fetch("https://api-m.paypal.com/v1/oauth2/token", { method: "POST", signal: AbortSignal.timeout(5000) })
        .then(r => ({ service: "paypal", ok: r.status < 500, status: r.status }))
        .catch(() => ({ service: "paypal", ok: false, status: 0 })),

      // Resend
      fetch("https://api.resend.com/emails", {
        headers: process.env.RESEND_API_KEY ? { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } : {},
        signal: AbortSignal.timeout(5000),
      })
        .then(r => ({ service: "resend", ok: r.status < 500, status: r.status }))
        .catch(() => ({ service: "resend", ok: false, status: 0 })),
    ]);

    const results = checks.map(c => c.status === "fulfilled" ? c.value : { service: "unknown", ok: false });
    res.json({ results, checkedAt: new Date().toISOString() });
  } catch (err) { next(err); }
});

// ── PATCH /api/admin/users/:id ────────────────────────────────
router.patch("/users/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { plan, credits, is_admin } = req.body;
    const sets = [], vals = [];
    if (plan     !== undefined) { sets.push(`plan = $${sets.length+1}`);     vals.push(plan); }
    if (credits  !== undefined) { sets.push(`credits = $${sets.length+1}`);  vals.push(credits); }
    if (is_admin !== undefined) { sets.push(`is_admin = $${sets.length+1}`); vals.push(is_admin); }
    if (!sets.length) return res.status(400).json({ error: "Nothing to update" });
    vals.push(req.params.id);
    await query(`UPDATE users SET ${sets.join(", ")} WHERE id = $${vals.length}`, vals);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
