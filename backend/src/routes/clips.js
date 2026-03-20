const router     = require("express").Router();
const multer     = require("multer");
const path       = require("path");
const fs         = require("fs");
const ffmpeg     = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const Anthropic  = require("@anthropic-ai/sdk");
const { requireAuth } = require("../middleware/auth");
const { query }       = require("../db/client");
const { getCost }     = require("../ai/creditCosts");

ffmpeg.setFfmpegPath(ffmpegPath);

const anthropic      = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const UNLIMITED_PLANS = ["pro", "business", "max"];

const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const safe = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, "_").slice(0, 40);
    cb(null, `${req.user.id}_src_${Date.now()}_${safe}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only video files are allowed"));
  },
});

// ── POST /api/clips/upload ────────────────────────────────────
router.post("/upload", requireAuth, upload.single("video"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  ffmpeg.ffprobe(req.file.path, (err, meta) => {
    const duration = err ? 0 : (meta?.format?.duration || 0);
    const stream   = meta?.streams?.find(s => s.codec_type === "video") || {};
    res.json({
      video_url: `/uploads/${req.file.filename}`,
      duration:  Math.floor(duration),
      width:     stream.width  || 0,
      height:    stream.height || 0,
      filename:  req.file.filename,
    });
  });
});

// ── POST /api/clips/suggest ────────────────────────────────────
// AI analyzes title/duration/niche to suggest viral Short segments
router.post("/suggest", requireAuth, async (req, res, next) => {
  try {
    const { title, duration, niche, video_url } = req.body;
    if (!duration) return res.status(400).json({ error: "duration is required" });

    // Credit check
    const cost        = getCost("suggest_clips");
    const isUnlimited = UNLIMITED_PLANS.includes(req.user.plan);
    if (!isUnlimited && req.user.credits < cost) {
      return res.status(402).json({ error: `Detecting clips costs ${cost} credits. You have ${req.user.credits}.`, required: cost, credits: req.user.credits });
    }

    const mins = Math.floor(duration / 60);
    const secs = duration % 60;

    const message = await anthropic.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [{
        role: "user",
        content: `You are a viral short-form video expert analyzing a YouTube video to find the best moments to clip as Shorts/Reels/TikToks.

Video details:
- Title: ${title || "Untitled video"}
- Total duration: ${duration}s (${mins}m ${secs}s)
- Niche/topic: ${niche || "general content"}

Based on typical long-form video structure and viral short-form patterns, suggest 4-5 clip segments that would perform well as Shorts.

Rules:
- Each clip must be 15–59 seconds (Short-eligible)
- Clips should NOT overlap
- Focus on: strong hooks, surprising facts/reveals, actionable tips, emotional moments, quotable lines
- Space clips across the video (don't cluster them all at the start)
- The first clip should be from the first 2 minutes (strong hook)

For each clip, give a punchy, clickable title (not the same as the original video title).

Return ONLY a valid JSON array, nothing else:
[
  { "start": 0, "end": 45, "title": "...", "reason": "...", "score": 94, "type": "hook" },
  ...
]

Types: hook | tip | reveal | story | cta | reaction`,
      }],
    });

    let clips = [];
    try {
      const text  = message.content[0]?.text || "[]";
      const match = text.match(/\[[\s\S]*\]/);
      clips = JSON.parse(match?.[0] || "[]");
      // Validate / sanitize
      clips = clips
        .filter(c => typeof c.start === "number" && typeof c.end === "number" && c.end > c.start)
        .map(c => ({ ...c, start: Math.max(0, Math.round(c.start)), end: Math.min(duration, Math.round(c.end)) }))
        .filter(c => c.end - c.start >= 10 && c.end - c.start <= 60);
    } catch { clips = []; }

    // Deduct credits
    if (!isUnlimited) {
      await query("UPDATE users SET credits = GREATEST(credits - $1, 0) WHERE id = $2", [cost, req.user.id]);
    }
    const tokensUsed = (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0);
    await query(
      "INSERT INTO ai_usage (user_id, feature, tokens_used, credits_used) VALUES ($1, $2, $3, $4)",
      [req.user.id, "suggest_clips", tokensUsed, cost]
    );

    res.json({ clips, credits_used: cost });
  } catch (err) { next(err); }
});

// ── GET /api/clips/thumbnail?video_url=&time= ─────────────────
// Extract a single frame from a video at a given timestamp
router.get("/thumbnail", requireAuth, (req, res) => {
  const { video_url, time = 0 } = req.query;
  if (!video_url) return res.status(400).json({ error: "video_url required" });

  const srcPath = path.join(uploadsDir, path.basename(video_url));
  if (!fs.existsSync(srcPath)) return res.status(404).json({ error: "Video not found" });

  const t        = parseFloat(time) || 0;
  const thumbName = `${path.basename(video_url, path.extname(video_url))}_t${Math.round(t)}.jpg`;
  const thumbPath = path.join(uploadsDir, thumbName);

  // Return cached if it already exists
  if (fs.existsSync(thumbPath)) {
    return res.json({ thumbnail_url: `/uploads/${thumbName}` });
  }

  ffmpeg(srcPath)
    .screenshots({ timestamps: [t], filename: thumbName, folder: uploadsDir, size: "?x360" })
    .on("end",   () => res.json({ thumbnail_url: `/uploads/${thumbName}` }))
    .on("error", err => res.status(500).json({ error: err.message }));
});

// ── POST /api/clips/trim ──────────────────────────────────────
// Body: { video_url, start, end, mute? }
router.post("/trim", requireAuth, async (req, res, next) => {
  try {
    const { video_url, start, end, mute = false } = req.body;
    if (!video_url)                   return res.status(400).json({ error: "video_url is required" });
    if (start == null || end == null) return res.status(400).json({ error: "start and end required" });
    if (end <= start)                 return res.status(400).json({ error: "end must be after start" });
    if (end - start > 180)            return res.status(400).json({ error: "Clip must be 3 minutes or less" });

    const srcPath = path.join(uploadsDir, path.basename(video_url));
    if (!fs.existsSync(srcPath)) return res.status(404).json({ error: "Source video not found" });

    const outName = `${req.user.id}_clip_${Date.now()}.mp4`;
    const outPath = path.join(uploadsDir, outName);
    const clipDur = end - start;

    const outputOpts = ["-crf 23", "-preset fast", "-movflags +faststart", "-vf crop=ih*9/16:ih"];
    if (mute) outputOpts.push("-an");

    await new Promise((resolve, reject) => {
      ffmpeg(srcPath)
        .setStartTime(start)
        .setDuration(clipDur)
        .videoCodec("libx264")
        .audioCodec(mute ? undefined : "aac")
        .outputOptions(outputOpts)
        .output(outPath)
        .on("end",   resolve)
        .on("error", reject)
        .run();
    });

    res.json({ clip_url: `/uploads/${outName}`, duration: clipDur, filename: outName });
  } catch (err) { next(err); }
});

// ── POST /api/clips/batch-schedule ────────────────────────────
// Multipart: video file + title, platforms[], start_time
// AI detects 4-6 viral moments, trims each to 9:16 with caption,
// creates scheduled_posts entries spread 6 h apart.
router.post("/batch-schedule", requireAuth, upload.single("video"), async (req, res, next) => {
  const videoPath = req.file?.path;
  try {
    if (!req.file) return res.status(400).json({ error: "No video file uploaded" });

    const { title, niche, start_time } = req.body;
    const platforms = Array.isArray(req.body.platforms)
      ? req.body.platforms
      : req.body.platforms ? [req.body.platforms] : [];
    if (!platforms.length) return res.status(400).json({ error: "Select at least one platform" });

    // Credit check
    const cost        = getCost("batch_clips");
    const isUnlimited = UNLIMITED_PLANS.includes(req.user.plan);
    if (!isUnlimited && req.user.credits < cost) {
      return res.status(402).json({ error: `Auto-clip costs ${cost} credits. You have ${req.user.credits}.`, required: cost, credits: req.user.credits });
    }

    // 1. Probe duration
    const meta = await new Promise((resolve, reject) =>
      ffmpeg.ffprobe(videoPath, (err, m) => err ? reject(err) : resolve(m))
    );
    const duration = Math.floor(meta.format?.duration || 0);
    if (duration < 30) return res.status(400).json({ error: "Video must be at least 30 seconds for auto-clipping" });

    // 2. AI clip suggestions
    const mins = Math.floor(duration / 60), secs = duration % 60;
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [{
        role: "user",
        content: `You are a viral short-form video expert. Find the best moments to clip as TikToks/Reels/Shorts.

Video details:
- Title: ${title || "Untitled"}
- Duration: ${duration}s (${mins}m ${secs}s)
- Niche: ${niche || "general"}

Suggest 4-6 clip segments, each 20-59 seconds, no overlaps, spaced across the video.

Return ONLY valid JSON:
[{"start":0,"end":45,"title":"Punchy clip title","reason":"why this works","score":90,"type":"hook"}]

Types: hook | tip | reveal | story | cta`,
      }],
    });

    let clips = [];
    try {
      const text  = message.content[0]?.text || "[]";
      const match = text.match(/\[[\s\S]*\]/);
      clips = JSON.parse(match?.[0] || "[]");
      clips = clips
        .filter(c => typeof c.start === "number" && typeof c.end === "number" && c.end > c.start)
        .map(c => ({ ...c, start: Math.max(0, Math.round(c.start)), end: Math.min(duration, Math.round(c.end)) }))
        .filter(c => (c.end - c.start) >= 15 && (c.end - c.start) <= 60);
    } catch { clips = []; }

    if (!clips.length) return res.status(500).json({ error: "AI could not suggest clips. Try a longer or more diverse video." });

    // 3. Trim each clip with 9:16 crop + title caption
    const trimResults = await Promise.allSettled(clips.map(async (clip, i) => {
      const outName = `${req.user.id}_autoclip_${Date.now() + i}_${i}.mp4`;
      const outPath = path.join(uploadsDir, outName);
      const clipDur = clip.end - clip.start;

      // Sanitize text for ffmpeg drawtext
      const safeText = (clip.title || "")
        .replace(/['"\\:]/g, " ")
        .replace(/[^a-zA-Z0-9 .,!?-]/g, " ")
        .replace(/\s+/g, " ").trim().slice(0, 50);

      const doTrim = (vf) => new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .setStartTime(clip.start)
          .setDuration(clipDur)
          .videoCodec("libx264")
          .audioCodec("aac")
          .outputOptions(["-crf 23", "-preset fast", "-movflags +faststart", `-vf ${vf}`])
          .output(outPath)
          .on("end", resolve)
          .on("error", reject)
          .run();
      });

      const captionVf = safeText
        ? `crop=ih*9/16:ih,drawtext=text='${safeText}':fontsize=26:fontcolor=white:bordercolor=black:borderw=3:x=(w-text_w)/2:y=h-80`
        : null;

      try {
        await doTrim(captionVf || "crop=ih*9/16:ih");
      } catch {
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        await doTrim("crop=ih*9/16:ih"); // fallback without caption
      }

      return { ...clip, clip_url: `/uploads/${outName}`, filename: outName, duration: clipDur };
    }));

    const successClips = trimResults
      .filter(r => r.status === "fulfilled" && r.value)
      .map(r => r.value);

    if (!successClips.length) return res.status(500).json({ error: "Failed to process any clips. Check the video format." });

    // 4. Create scheduled_posts spread 6 h apart
    const firstTime  = start_time ? new Date(start_time) : new Date(Date.now() + 3_600_000);
    const SIX_HOURS  = 6 * 3_600_000;

    for (let i = 0; i < successClips.length; i++) {
      const clip        = successClips[i];
      const scheduledFor = new Date(firstTime.getTime() + i * SIX_HOURS).toISOString();
      for (const platform of platforms) {
        await query(
          `INSERT INTO scheduled_posts
             (user_id, platform, title, description, hashtags, scheduled_for, video_url, status, is_short)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'scheduled',true) RETURNING *`,
          [req.user.id, platform, clip.title, `Auto-clipped from: ${title || "video"}`, [], scheduledFor, clip.clip_url]
        );
      }
      clip.scheduled_for = scheduledFor;
      clip.platforms     = platforms;
    }

    // 5. Deduct credits + log usage
    if (!isUnlimited) {
      await query("UPDATE users SET credits = GREATEST(credits - $1, 0) WHERE id = $2", [cost, req.user.id]);
    }
    await query(
      "INSERT INTO ai_usage (user_id, feature, tokens_used, credits_used) VALUES ($1,$2,$3,$4)",
      [req.user.id, "batch_clips", (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0), cost]
    );

    fs.unlink(videoPath, () => {}); // clean up source

    res.json({ clips: successClips, credits_used: cost });
  } catch (err) {
    if (videoPath && fs.existsSync(videoPath)) fs.unlink(videoPath, () => {});
    next(err);
  }
});

// ── GET /api/clips/probe?url= ──────────────────────────────────
router.get("/probe", requireAuth, (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url is required" });
  const filePath = path.join(uploadsDir, path.basename(url));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
  ffmpeg.ffprobe(filePath, (err, meta) => {
    if (err) return res.status(400).json({ error: err.message });
    const stream = meta.streams?.find(s => s.codec_type === "video") || {};
    res.json({ duration: Math.floor(meta.format?.duration || 0), width: stream.width || 0, height: stream.height || 0, size: meta.format?.size || 0 });
  });
});

module.exports = router;
