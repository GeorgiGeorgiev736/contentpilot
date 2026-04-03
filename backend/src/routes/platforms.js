const router = require("express").Router();
const { query, queryOne } = require("../db/client");
const { requireAuth } = require("../middleware/auth");

// GET /api/platforms — get all connected platforms for user
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const connections = await query(
      "SELECT id, platform, channel_id, handle, followers, video_count, connected, created_at FROM platform_connections WHERE user_id = $1",
      [req.user.id]
    );
    res.json({ connections });
  } catch (err) { next(err); }
});

// POST /api/platforms/connect — save platform connection after OAuth
// In production this would validate the OAuth token with the platform API
router.post("/connect", requireAuth, async (req, res, next) => {
  try {
    const { platform, handle, access_token, refresh_token, followers, video_count } = req.body;

    if (!["youtube", "tiktok", "instagram"].includes(platform)) {
      return res.status(400).json({ error: "Invalid platform" });
    }

    await query(
      `INSERT INTO platform_connections
        (user_id, platform, handle, access_token, refresh_token, followers, video_count, connected)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT (user_id, platform)
       DO UPDATE SET
         handle = $3, access_token = $4, refresh_token = $5,
         followers = $6, video_count = $7, connected = true, updated_at = NOW()`,
      [req.user.id, platform, handle, access_token, refresh_token, followers || 0, video_count || 0]
    );

    res.json({ success: true, platform, handle });
  } catch (err) { next(err); }
});

// DELETE /api/platforms/:platform — disconnect a platform (optionally specific channel)
router.delete("/:platform", requireAuth, async (req, res, next) => {
  try {
    const { channel_id } = req.query;
    if (channel_id) {
      await query(
        "UPDATE platform_connections SET connected = false, access_token = null, refresh_token = null, updated_at = NOW() WHERE user_id = $1 AND platform = $2 AND channel_id = $3",
        [req.user.id, req.params.platform, channel_id]
      );
    } else {
      await query(
        "UPDATE platform_connections SET connected = false, access_token = null, refresh_token = null, updated_at = NOW() WHERE user_id = $1 AND platform = $2",
        [req.user.id, req.params.platform]
      );
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Token refresh helper ──────────────────────────────────────
async function refreshGoogleToken(connection) {
  if (!connection.refresh_token) throw new Error("No refresh token stored");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type:    "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Token refresh failed: " + (data.error_description || data.error));
  await query("UPDATE platform_connections SET access_token = $1, updated_at = NOW() WHERE id = $2",
    [data.access_token, connection.id]);
  return data.access_token;
}

// Fetch with automatic Google token refresh on 401
async function googleFetch(url, connection) {
  let token = connection.access_token;
  let res   = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    token = await refreshGoogleToken(connection);
    res   = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  }
  return res.json();
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parseDuration(iso) {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return (parseInt(m?.[1] || 0) * 3600) + (parseInt(m?.[2] || 0) * 60) + parseInt(m?.[3] || 0);
}

// GET /api/platforms/youtube/top-videos — top 5 videos by view count
router.get("/youtube/top-videos", requireAuth, async (req, res, next) => {
  try {
    const connection = await queryOne(
      "SELECT * FROM platform_connections WHERE user_id=$1 AND platform='youtube' AND connected=true",
      [req.user.id]
    );
    if (!connection) return res.json({ videos: [] });

    const searchData = await googleFetch(
      "https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&order=viewCount&maxResults=5",
      connection
    );
    const ids = searchData.items?.map(i => i.id.videoId).filter(Boolean).join(",");
    if (!ids) return res.json({ videos: [] });

    const statsData = await googleFetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${ids}`,
      connection
    );
    const videos = (statsData.items || []).map(v => ({
      title:    v.snippet?.title || "Untitled",
      platform: "youtube",
      views:    parseInt(v.statistics?.viewCount    || 0).toLocaleString(),
      likes:    parseInt(v.statistics?.likeCount    || 0).toLocaleString(),
      comments: parseInt(v.statistics?.commentCount || 0).toLocaleString(),
      duration: formatDuration(parseDuration(v.contentDetails?.duration || "")),
    }));
    res.json({ videos });
  } catch (err) { next(err); }
});

// GET /api/platforms/:platform/stats — real stats from platform APIs
router.get("/:platform/stats", requireAuth, async (req, res, next) => {
  try {
    const { channel_id } = req.query;
    const connection = channel_id
      ? await queryOne(
          "SELECT * FROM platform_connections WHERE user_id = $1 AND platform = $2 AND channel_id = $3 AND connected = true",
          [req.user.id, req.params.platform, channel_id]
        )
      : await queryOne(
          "SELECT * FROM platform_connections WHERE user_id = $1 AND platform = $2 AND connected = true ORDER BY created_at ASC LIMIT 1",
          [req.user.id, req.params.platform]
        );
    if (!connection) return res.status(404).json({ error: "Platform not connected" });

    const platform = req.params.platform;

    // ── YouTube & YouTube Shorts (same API) ──────────────────
    if (platform === "youtube" || platform === "youtube_shorts") {
      // Channel totals
      const channelData = await googleFetch(
        "https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true",
        connection
      );
      const s = channelData.items?.[0]?.statistics || {};

      // 30-day analytics (requires YouTube Analytics API enabled in Google Cloud)
      const endDate   = new Date().toISOString().slice(0, 10);
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      let row = [0, 0, 0, 0];
      try {
        const analytics = await googleFetch(
          `https://youtubeanalytics.googleapis.com/v2/reports?` +
          new URLSearchParams({
            ids:       "channel==MINE",
            startDate,
            endDate,
            metrics:   "views,estimatedMinutesWatched,subscribersGained,averageViewDuration",
          }),
          connection
        );
        row = analytics.rows?.[0] || [0, 0, 0, 0];
      } catch (e) {
        console.warn("YouTube Analytics API not available:", e.message);
      }

      return res.json({ platform, stats: {
        subscribers:    parseInt(s.subscriberCount  || 0).toLocaleString(),
        totalVideos:    parseInt(s.videoCount        || 0).toLocaleString(),
        views30d:       parseInt(row[0] || 0).toLocaleString(),
        watchTime30d:   Math.round((row[1] || 0) / 60) + "h",
        newSubs30d:     parseInt(row[2] || 0).toLocaleString(),
        avgViewDuration: formatDuration(row[3] || 0),
      }});
    }

    // ── TikTok ───────────────────────────────────────────────
    if (platform === "tiktok") {
      const userRes = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=display_name,follower_count,video_count,likes_count",
        { headers: { Authorization: `Bearer ${connection.access_token}` } }
      );
      const userData = await userRes.json();
      const p = userData.data?.user || {};
      return res.json({ platform, stats: {
        followers:   parseInt(p.follower_count || 0).toLocaleString(),
        totalVideos: parseInt(p.video_count    || 0).toLocaleString(),
        totalLikes:  parseInt(p.likes_count    || 0).toLocaleString(),
      }});
    }

    // ── Instagram ────────────────────────────────────────────
    if (platform === "instagram") {
      const igRes = await fetch(
        `https://graph.facebook.com/v19.0/me?fields=instagram_business_account&access_token=${connection.access_token}`
      );
      const igData = await igRes.json();
      const igId   = igData.instagram_business_account?.id;
      if (!igId) return res.json({ platform, stats: { note: "No Instagram Business account found" } });

      const profileRes = await fetch(
        `https://graph.facebook.com/v19.0/${igId}?fields=username,followers_count,media_count,profile_views&access_token=${connection.access_token}`
      );
      const profile = await profileRes.json();
      return res.json({ platform, stats: {
        followers:    parseInt(profile.followers_count || 0).toLocaleString(),
        totalMedia:   parseInt(profile.media_count     || 0).toLocaleString(),
        profileViews: parseInt(profile.profile_views   || 0).toLocaleString(),
      }});
    }

    res.json({ platform, stats: {} });
  } catch (err) { next(err); }
});

module.exports = router;
