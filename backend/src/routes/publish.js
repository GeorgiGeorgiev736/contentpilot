const router     = require("express").Router();
const multer     = require("multer");
const path       = require("path");
const fs         = require("fs");
const { requireAuth }  = require("../middleware/auth");
const { query }        = require("../db/client");
const { uploadToR2 }   = require("../utils/r2");

const uploadsDir = path.join(__dirname, "../../uploads");

const imgUpload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      cb(null, `post_img_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

// ── Upload image → returns public URL ──────────────────────────
router.post("/upload-image", requireAuth, imgUpload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image provided" });
  try {
    const url = await uploadToR2(req.file.path, req.file.mimetype);
    fs.unlink(req.file.path, () => {});
    if (!url) return res.status(500).json({ error: "R2 not configured — image upload unavailable" });
    res.json({ url });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: err.message });
  }
});

// ── Post text (+optional image) to platforms ──────────────────
router.post("/post", requireAuth, async (req, res) => {
  const { text, imageUrl, platforms: rawPlatforms } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Post text is required" });

  const platforms = Array.isArray(rawPlatforms) ? rawPlatforms : [rawPlatforms].filter(Boolean);
  if (!platforms.length) return res.status(400).json({ error: "Select at least one platform" });

  // Load connected tokens
  const conns = await query(
    `SELECT platform, channel_id, access_token, handle FROM platform_connections
     WHERE user_id=$1 AND platform=ANY($2) AND connected=true`,
    [req.user.id, platforms]
  );
  if (!conns.length) return res.status(400).json({ error: "No connected accounts for selected platforms" });

  const results = {};
  await Promise.allSettled(conns.map(async conn => {
    try {
      if (conn.platform === "linkedin")  results.linkedin  = await postLinkedIn(conn, text, imageUrl);
      if (conn.platform === "twitter")   results.twitter   = await postTwitter(conn, text, imageUrl);
      if (conn.platform === "instagram") results.instagram = await postInstagram(conn, text, imageUrl);
    } catch (err) {
      results[conn.platform] = { error: err.message };
    }
  }));

  res.json({ results });
});

// ── LinkedIn ──────────────────────────────────────────────────
async function postLinkedIn(conn, text, imageUrl) {
  const token    = conn.access_token;
  const authorId = conn.channel_id; // stored as profile.sub in OAuth callback
  const author   = `urn:li:person:${authorId}`;

  let mediaAsset = null;
  if (imageUrl) {
    // Step 1: register upload
    const regRes = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
      method: "POST",
      headers: {
        Authorization:             `Bearer ${token}`,
        "Content-Type":            "application/json",
        "LinkedIn-Version":        "202401",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
    });
    const regData = await regRes.json();
    const uploadUrl = regData.value?.uploadUrl;
    mediaAsset      = regData.value?.image;

    if (uploadUrl && mediaAsset) {
      const imgBuf = await fetchBuffer(imageUrl);
      await fetch(uploadUrl, { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: imgBuf });
    }
  }

  const body = {
    author,
    commentary:   text,
    visibility:   "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: "PUBLISHED",
  };
  if (mediaAsset) {
    body.content = { media: { altText: text.slice(0, 100), id: mediaAsset } };
  }

  const postRes = await fetch("https://api.linkedin.com/rest/posts", {
    method:  "POST",
    headers: {
      Authorization:             `Bearer ${token}`,
      "Content-Type":            "application/json",
      "LinkedIn-Version":        "202401",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!postRes.ok) {
    const e = await postRes.text();
    throw new Error(`LinkedIn error ${postRes.status}: ${e.slice(0, 200)}`);
  }
  const postId = postRes.headers.get("x-linkedin-id") || "posted";
  return { success: true, id: postId };
}

// ── X (Twitter) ───────────────────────────────────────────────
async function postTwitter(conn, text, imageUrl) {
  const token  = conn.access_token;
  const body   = { text: text.slice(0, 280) };

  if (imageUrl) {
    // Upload media via v1.1
    const imgBuf = await fetchBuffer(imageUrl);
    const b64    = imgBuf.toString("base64");
    const mRes   = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
      body:    new URLSearchParams({ media_data: b64, media_category: "tweet_image" }),
    });
    const mData = await mRes.json();
    if (mData.media_id_string) body.media = { media_ids: [mData.media_id_string] };
  }

  const tRes = await fetch("https://api.twitter.com/2/tweets", {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  const tData = await tRes.json();
  if (!tRes.ok) throw new Error(`X error ${tRes.status}: ${JSON.stringify(tData).slice(0, 200)}`);
  return { success: true, id: tData.data?.id };
}

// ── Instagram ─────────────────────────────────────────────────
async function postInstagram(conn, text, imageUrl) {
  if (!imageUrl) throw new Error("Instagram requires an image to post");

  const token = conn.access_token;

  // Get IG user ID from token
  const meRes = await fetch(`https://graph.facebook.com/v18.0/me?fields=id&access_token=${token}`);
  const meData = await meRes.json();
  if (!meData.id) throw new Error("Instagram: could not get user ID");

  const igUserId = meData.id;

  // Create container
  const cRes = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ image_url: imageUrl, caption: text, access_token: token }),
  });
  const cData = await cRes.json();
  if (!cData.id) throw new Error(`Instagram container error: ${JSON.stringify(cData).slice(0,200)}`);

  // Publish container
  const pRes = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media_publish`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ creation_id: cData.id, access_token: token }),
  });
  const pData = await pRes.json();
  if (!pData.id) throw new Error(`Instagram publish error: ${JSON.stringify(pData).slice(0,200)}`);
  return { success: true, id: pData.id };
}

// ── Helpers ───────────────────────────────────────────────────
async function fetchBuffer(url) {
  const res  = await fetch(url);
  const ab   = await res.arrayBuffer();
  return Buffer.from(ab);
}

module.exports = router;
