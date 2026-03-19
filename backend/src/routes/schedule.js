const router = require("express").Router();
const multer = require("multer");
const path   = require("path");
const fs     = require("fs");
const { query, queryOne } = require("../db/client");
const { requireAuth }     = require("../middleware/auth");

// ── File upload setup ─────────────────────────────────────────
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const safe = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, "_").slice(0, 40);
    cb(null, `${req.user.id}_${Date.now()}_${safe}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/") || file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only video and image files are allowed"));
  },
});

// POST /api/schedule/upload — upload video + optional thumbnail
router.post("/upload", requireAuth, upload.fields([
  { name: "video",     maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]), (req, res) => {
  const result = {};
  if (req.files?.video?.[0])     result.video_url     = `/uploads/${req.files.video[0].filename}`;
  if (req.files?.thumbnail?.[0]) result.thumbnail_url = `/uploads/${req.files.thumbnail[0].filename}`;
  res.json(result);
});

// ── GET /api/schedule — list all scheduled posts ──────────────
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const posts = await query(
      `SELECT * FROM scheduled_posts WHERE user_id=$1 ORDER BY scheduled_for ASC`,
      [req.user.id]
    );
    res.json({ posts });
  } catch (err) { next(err); }
});

// ── POST /api/schedule — create a scheduled post ─────────────
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { title, description, hashtags, platforms, scheduled_for, video_url, thumbnail_url, campaign_id, is_short } = req.body;

    if (!platforms?.length)  return res.status(400).json({ error: "Select at least one platform" });
    if (!scheduled_for)      return res.status(400).json({ error: "Schedule time is required" });
    if (!title)              return res.status(400).json({ error: "Title is required" });

    // Create one post per platform
    const created = [];
    for (const platform of platforms) {
      const [post] = await query(
        `INSERT INTO scheduled_posts
           (user_id, campaign_id, platform, title, description, hashtags, scheduled_for, video_url, thumbnail_url, status, is_short)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'scheduled',$10)
         RETURNING *`,
        [req.user.id, campaign_id || null, platform, title, description || "", hashtags || [], scheduled_for, video_url || null, thumbnail_url || null, !!is_short]
      );
      created.push(post);
    }

    res.status(201).json({ posts: created });
  } catch (err) { next(err); }
});

// ── DELETE /api/schedule/:id — cancel a scheduled post ────────
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const post = await queryOne(
      "SELECT id FROM scheduled_posts WHERE id=$1 AND user_id=$2",
      [req.params.id, req.user.id]
    );
    if (!post) return res.status(404).json({ error: "Post not found" });

    await query(
      "UPDATE scheduled_posts SET status='cancelled', updated_at=NOW() WHERE id=$1",
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── GET /api/schedule/calendar — posts grouped by date ────────
router.get("/calendar", requireAuth, async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const posts = await query(
      `SELECT * FROM scheduled_posts
       WHERE user_id=$1
         AND EXTRACT(MONTH FROM scheduled_for)=$2
         AND EXTRACT(YEAR  FROM scheduled_for)=$3
         AND status != 'cancelled'
       ORDER BY scheduled_for ASC`,
      [req.user.id, month || new Date().getMonth() + 1, year || new Date().getFullYear()]
    );
    res.json({ posts });
  } catch (err) { next(err); }
});

module.exports = router;
