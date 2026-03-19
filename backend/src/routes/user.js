const router = require("express").Router();
const { query, queryOne } = require("../db/client");
const { requireAuth } = require("../middleware/auth");

// GET /api/user/profile
router.get("/profile", requireAuth, async (req, res, next) => {
  try {
    const user = await queryOne(
      "SELECT id, email, name, plan, credits, subscription_status, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    res.json({ user });
  } catch (err) { next(err); }
});

// GET /api/user/usage — AI usage history
router.get("/usage", requireAuth, async (req, res, next) => {
  try {
    const usage = await query(
      "SELECT feature, COUNT(*) as count, SUM(tokens_used) as total_tokens FROM ai_usage WHERE user_id = $1 GROUP BY feature ORDER BY count DESC",
      [req.user.id]
    );
    const total = await queryOne(
      "SELECT COUNT(*) as total_requests, SUM(tokens_used) as total_tokens FROM ai_usage WHERE user_id = $1",
      [req.user.id]
    );
    res.json({ usage, total });
  } catch (err) { next(err); }
});

// PATCH /api/user/profile — update name
router.patch("/profile", requireAuth, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });
    const [user] = await query(
      "UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, name, plan, credits",
      [name, req.user.id]
    );
    res.json({ user });
  } catch (err) { next(err); }
});

module.exports = router;
