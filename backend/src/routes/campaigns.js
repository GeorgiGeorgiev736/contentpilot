const router = require("express").Router();
const { query, queryOne } = require("../db/client");
const { requireAuth } = require("../middleware/auth");

// GET /api/campaigns
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const campaigns = await query(
      "SELECT * FROM campaigns WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json({ campaigns });
  } catch (err) { next(err); }
});

// POST /api/campaigns
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { name, niche, platform } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const [campaign] = await query(
      "INSERT INTO campaigns (user_id, name, niche, platform) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.user.id, name, niche, platform]
    );
    res.status(201).json({ campaign });
  } catch (err) { next(err); }
});

// GET /api/campaigns/:id
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const campaign = await queryOne(
      "SELECT * FROM campaigns WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const outputs = await query(
      "SELECT stage, output, created_at FROM pipeline_outputs WHERE campaign_id = $1",
      [campaign.id]
    );

    res.json({ campaign, outputs });
  } catch (err) { next(err); }
});

// PATCH /api/campaigns/:id
router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const { name, niche, platform, status, stage } = req.body;
    const campaign = await queryOne(
      "SELECT id FROM campaigns WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const [updated] = await query(
      `UPDATE campaigns SET
        name = COALESCE($1, name),
        niche = COALESCE($2, niche),
        platform = COALESCE($3, platform),
        status = COALESCE($4, status),
        stage = COALESCE($5, stage),
        updated_at = NOW()
      WHERE id = $6 RETURNING *`,
      [name, niche, platform, status, stage, req.params.id]
    );
    res.json({ campaign: updated });
  } catch (err) { next(err); }
});

// DELETE /api/campaigns/:id
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    await query("DELETE FROM campaigns WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/campaigns/:id/output — save a pipeline stage output
router.post("/:id/output", requireAuth, async (req, res, next) => {
  try {
    const { stage, output } = req.body;
    const campaign = await queryOne(
      "SELECT id FROM campaigns WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    await query(
      `INSERT INTO pipeline_outputs (campaign_id, stage, output)
       VALUES ($1, $2, $3)
       ON CONFLICT (campaign_id, stage) DO UPDATE SET output = $3`,
      [req.params.id, stage, output]
    );

    // Advance campaign stage
    await query(
      "UPDATE campaigns SET stage = $1, updated_at = NOW() WHERE id = $2",
      [stage, req.params.id]
    );

    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
