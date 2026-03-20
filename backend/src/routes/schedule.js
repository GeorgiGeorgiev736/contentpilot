const router = require("express").Router();
const { query, queryOne } = require("../db/client");
const { requireAuth }     = require("../middleware/auth");

// ── YouTube token refresh helper ───────────────────────────────
async function getYouTubeToken(connection) {
  if (!connection.refresh_token) return connection.access_token;
  try {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: connection.refresh_token,
        grant_type:    "refresh_token",
      }),
    });
    const d = await r.json();
    if (d.access_token) {
      await query("UPDATE platform_connections SET access_token=$1, updated_at=NOW() WHERE id=$2",
        [d.access_token, connection.id]);
      return d.access_token;
    }
  } catch {}
  return connection.access_token;
}

// POST /api/schedule/youtube-initiate
// Step 1: Backend initiates a YouTube resumable upload session on behalf of the user.
// Returns the upload_url — browser then PUTs the video file directly to YouTube (no server disk).
router.post("/youtube-initiate", requireAuth, async (req, res, next) => {
  try {
    const { title, description, tags, file_size, mime_type } = req.body;

    const connection = await queryOne(
      "SELECT * FROM platform_connections WHERE user_id=$1 AND platform='youtube' AND connected=true ORDER BY created_at LIMIT 1",
      [req.user.id]
    );
    if (!connection) return res.status(404).json({ error: "YouTube not connected — go to Platforms to connect it first." });

    const token = await getYouTubeToken(connection);

    const initRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": mime_type || "video/mp4",
          ...(file_size ? { "X-Upload-Content-Length": String(file_size) } : {}),
        },
        body: JSON.stringify({
          snippet: {
            title:       title || "Untitled",
            description: description || "",
            tags:        Array.isArray(tags) ? tags : [],
            categoryId:  "22", // People & Blogs
          },
          status: {
            privacyStatus:           "private", // we schedule via DB; cron makes it public
            selfDeclaredMadeForKids: false,
          },
        }),
      }
    );

    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({}));
      return res.status(400).json({ error: err.error?.message || "YouTube rejected the upload initiation" });
    }

    const uploadUrl = initRes.headers.get("location");
    if (!uploadUrl) return res.status(500).json({ error: "YouTube did not return an upload URL" });

    res.json({ upload_url: uploadUrl });
  } catch (err) { next(err); }
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
