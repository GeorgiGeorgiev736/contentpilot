// Background worker — posts scheduled content to platforms at the right time.
// Run alongside the main server: node src/workers/publisher.js

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const fs   = require("fs");
const path = require("path");
const { query }  = require("../db/client");
const { logger } = require("../utils/logger");

const INTERVAL_MS  = 60 * 1000;
const UPLOADS_DIR  = path.join(__dirname, "../../uploads");
const BACKEND_URL  = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;

// ── helpers ───────────────────────────────────────────────────

function diskPath(url) {
  if (!url) return null;
  return path.join(UPLOADS_DIR, path.basename(url));
}

async function refreshGoogleToken(refreshToken) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Google token refresh failed: " + (data.error_description || data.error));
  return data.access_token;
}

// ── YouTube ───────────────────────────────────────────────────

async function publishToYouTube({ accessToken, refreshToken, title, description, hashtags, videoUrl, thumbnailUrl }) {
  const filePath = diskPath(videoUrl);
  if (!filePath || !fs.existsSync(filePath)) throw new Error("Video file not found: " + videoUrl);

  const fileSize = fs.statSync(filePath).size;

  // Try to refresh token first if we have a refresh token
  let token = accessToken;
  if (refreshToken) {
    try { token = await refreshGoogleToken(refreshToken); } catch {}
  }

  const fullDescription = [
    description,
    hashtags?.length ? "\n" + hashtags.join(" ") : "",
  ].filter(Boolean).join("\n");

  const metadata = {
    snippet: {
      title:       title.slice(0, 100),
      description: fullDescription.slice(0, 5000),
      tags:        hashtags?.map(h => h.replace(/^#/, "")).filter(Boolean).slice(0, 500) || [],
      categoryId:  "22",
    },
    status: { privacyStatus: "public" },
  };

  // Initiate resumable upload
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method:  "POST",
      headers: {
        Authorization:            `Bearer ${token}`,
        "Content-Type":           "application/json",
        "X-Upload-Content-Type":  "video/mp4",
        "X-Upload-Content-Length": String(fileSize),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`YouTube upload init failed (${initRes.status}): ${err}`);
  }

  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube did not return an upload URL");

  // Upload the file in one shot (works up to ~256 MB reliably; for larger files chunk it)
  const fileBuffer = fs.readFileSync(filePath);
  const ext        = path.extname(filePath).toLowerCase();
  const mime       = ext === ".webm" ? "video/webm" : ext === ".mov" ? "video/quicktime" : "video/mp4";

  const uploadRes = await fetch(uploadUrl, {
    method:  "PUT",
    headers: { "Content-Type": mime, "Content-Length": String(fileSize) },
    body:    fileBuffer,
  });

  if (!uploadRes.ok && uploadRes.status !== 201) {
    const err = await uploadRes.text();
    throw new Error(`YouTube video upload failed (${uploadRes.status}): ${err}`);
  }

  const videoData = await uploadRes.json();
  const videoId   = videoData.id;

  // Upload thumbnail if provided
  const thumbPath = diskPath(thumbnailUrl);
  if (thumbPath && fs.existsSync(thumbPath)) {
    try {
      const thumbBuffer = fs.readFileSync(thumbPath);
      const thumbExt    = path.extname(thumbPath).toLowerCase();
      const thumbMime   = thumbExt === ".png" ? "image/png" : "image/jpeg";
      await fetch(
        `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`,
        {
          method:  "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": thumbMime },
          body:    thumbBuffer,
        }
      );
    } catch (e) {
      logger.warn(`[YouTube] Thumbnail upload failed (non-fatal): ${e.message}`);
    }
  }

  return { success: true, platform_post_id: videoId };
}

// ── TikTok ────────────────────────────────────────────────────

async function publishToTikTok({ accessToken, title, description, videoUrl }) {
  const filePath = diskPath(videoUrl);
  if (!filePath || !fs.existsSync(filePath)) throw new Error("Video file not found: " + videoUrl);

  const fileSize = fs.statSync(filePath).size;
  const caption  = [title, description].filter(Boolean).join("\n").slice(0, 2200);

  // Step 1: Initialize upload
  const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method:  "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      post_info: {
        title:                     caption,
        privacy_level:             "PUBLIC_TO_EVERYONE",
        disable_duet:              false,
        disable_comment:           false,
        disable_stitch:            false,
        video_cover_timestamp_ms:  1000,
      },
      source_info: {
        source:            "FILE_UPLOAD",
        video_size:        fileSize,
        chunk_size:        fileSize,
        total_chunk_count: 1,
      },
    }),
  });

  const initData = await initRes.json();
  if (initData.error?.code !== "ok") {
    throw new Error(`TikTok init failed: ${JSON.stringify(initData.error)}`);
  }

  const { publish_id, upload_url } = initData.data;

  // Step 2: Upload video bytes
  const fileBuffer = fs.readFileSync(filePath);
  const upRes = await fetch(upload_url, {
    method:  "PUT",
    headers: {
      "Content-Type":  "video/mp4",
      "Content-Range": `bytes 0-${fileSize - 1}/${fileSize}`,
    },
    body: fileBuffer,
  });

  if (!upRes.ok) throw new Error(`TikTok video upload failed: ${upRes.status}`);

  // Step 3: Poll for completion (async processing)
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const statusRes = await fetch("https://open.tiktokapis.com/v2/post/publish/status/fetch/", {
      method:  "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ publish_id }),
    });
    const statusData = await statusRes.json();
    const status     = statusData.data?.status;
    if (status === "PUBLISH_COMPLETE") return { success: true, platform_post_id: publish_id };
    if (status === "FAILED") throw new Error(`TikTok publish failed: ${JSON.stringify(statusData.data?.fail_reason)}`);
  }

  // Return optimistically if polling timed out — video is likely still processing
  logger.warn(`[TikTok] Polling timed out for publish_id ${publish_id} — assuming success`);
  return { success: true, platform_post_id: publish_id };
}

// ── Instagram ─────────────────────────────────────────────────

async function publishToInstagram({ accessToken, title, description, videoUrl }) {
  const filePath = diskPath(videoUrl);
  if (!filePath || !fs.existsSync(filePath)) throw new Error("Video file not found: " + videoUrl);

  const caption        = [title, description].filter(Boolean).join("\n").slice(0, 2200);
  const videoPublicUrl = `${BACKEND_URL}${videoUrl}`;

  // Find Instagram Business Account linked to a Facebook Page
  const pagesRes  = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`);
  const pagesData = await pagesRes.json();
  if (pagesData.error) throw new Error(`Facebook pages error: ${pagesData.error.message}`);

  let igId = null, pageToken = accessToken;

  for (const page of (pagesData.data || [])) {
    const igRes  = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
    const igData = await igRes.json();
    if (igData.instagram_business_account) {
      igId       = igData.instagram_business_account.id;
      pageToken  = page.access_token;
      break;
    }
  }

  if (!igId) throw new Error("No Instagram Business account found on your Facebook Pages");

  // Create media container (Reel)
  const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type:    "REELS",
      video_url:     videoPublicUrl,
      caption,
      share_to_feed: true,
      access_token:  pageToken,
    }),
  });
  const containerData = await containerRes.json();
  if (containerData.error) throw new Error(`Instagram container error: ${containerData.error.message}`);

  const containerId = containerData.id;

  // Poll until video finishes processing (up to 60 seconds)
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const sRes  = await fetch(`https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${pageToken}`);
    const sData = await sRes.json();
    if (sData.status_code === "FINISHED") break;
    if (sData.status_code === "ERROR")    throw new Error("Instagram video processing failed");
  }

  // Publish the container
  const pubRes  = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: pageToken }),
  });
  const pubData = await pubRes.json();
  if (pubData.error) throw new Error(`Instagram publish error: ${pubData.error.message}`);

  return { success: true, platform_post_id: pubData.id };
}

// ── Main loop ─────────────────────────────────────────────────

async function processScheduledPosts() {
  try {
    const duePosts = await query(
      `SELECT sp.*, pc.access_token, pc.refresh_token
       FROM scheduled_posts sp
       LEFT JOIN platform_connections pc
         ON pc.user_id = sp.user_id AND pc.platform = sp.platform AND pc.connected = true
       WHERE sp.status = 'scheduled'
         AND sp.scheduled_for <= NOW() + INTERVAL '1 minute'
         AND sp.scheduled_for > NOW() - INTERVAL '5 minutes'`
    );

    if (duePosts.length === 0) return;
    logger.info(`Processing ${duePosts.length} scheduled post(s)...`);

    for (const post of duePosts) {
      await query("UPDATE scheduled_posts SET status='publishing', updated_at=NOW() WHERE id=$1", [post.id]);

      try {
        if (!post.access_token) throw new Error(`No ${post.platform} account connected`);
        if (!post.video_url)    throw new Error("No video file attached to this post");

        let result;
        const args = {
          accessToken:  post.access_token,
          refreshToken: post.refresh_token,
          title:        post.title,
          description:  post.description,
          hashtags:     post.hashtags,
          videoUrl:     post.video_url,
          thumbnailUrl: post.thumbnail_url,
        };

        if      (post.platform === "youtube")   result = await publishToYouTube(args);
        else if (post.platform === "tiktok")    result = await publishToTikTok(args);
        else if (post.platform === "instagram") result = await publishToInstagram(args);
        else throw new Error(`Unknown platform: ${post.platform}`);

        await query(
          `UPDATE scheduled_posts SET status='published', platform_post_id=$1, published_at=NOW(), updated_at=NOW() WHERE id=$2`,
          [result.platform_post_id, post.id]
        );
        logger.info(`✅ Published to ${post.platform}: "${post.title}" (${result.platform_post_id})`);

      } catch (err) {
        await query(
          "UPDATE scheduled_posts SET status='failed', error_message=$1, updated_at=NOW() WHERE id=$2",
          [err.message, post.id]
        );
        logger.error(`❌ Failed to publish ${post.id} to ${post.platform}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error("Publisher worker error:", err.message);
  }
}

logger.info("🚀 Publisher worker started — checking every minute");
processScheduledPosts();
setInterval(processScheduledPosts, INTERVAL_MS);
