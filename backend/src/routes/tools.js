const router     = require("express").Router();
const multer     = require("multer");
const path       = require("path");
const fs         = require("fs");
const https      = require("https");
const http       = require("http");
const Replicate  = require("replicate");
const Anthropic  = require("@anthropic-ai/sdk");
const ffmpeg     = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const ytdl       = require("@distube/ytdl-core");
const { requireAuth }    = require("../middleware/auth");
const { query }          = require("../db/client");
const { uploadToR2 }     = require("../utils/r2");

ffmpeg.setFfmpegPath(ffmpegPath);

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const uploadsDir = path.join(__dirname, "../../uploads");

const videoUpload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${req.user.id}_tool_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 4 * 1024 * 1024 * 1024 }, // 4 GB — stored on R2, not local disk
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/") || file.mimetype.startsWith("audio/")) cb(null, true);
    else cb(new Error("Only video/audio files allowed"));
  },
});

const CREDIT_COSTS  = { hooks: 1, thumbnails: 5, captions: 3, repurpose: 10 };
const UNLIMITED     = ["pro", "business", "max"];

async function gate(req, res, featureOrCost) {
  const isUnlimited = UNLIMITED.includes(req.user.plan);
  const cost        = typeof featureOrCost === "number" ? featureOrCost : CREDIT_COSTS[featureOrCost];
  if (!isUnlimited && req.user.credits < cost) {
    res.status(402).json({ error: `This costs ${cost} credits. You have ${req.user.credits}.` });
    return null;
  }
  return { isUnlimited, cost };
}

async function deduct(userId, feature, cost) {
  await query("UPDATE users SET credits = GREATEST(credits - $1, 0) WHERE id = $2", [cost, userId]);
  await query("INSERT INTO ai_usage (user_id, feature, tokens_used, credits_used) VALUES ($1,$2,0,$3)", [userId, feature, cost]);
}

function isYouTubeUrl(url) {
  return /youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts/i.test(url);
}

async function downloadVideoFromUrl(videoUrl, destPath) {
  if (isYouTubeUrl(videoUrl)) {
    await new Promise((resolve, reject) => {
      const stream = ytdl(videoUrl, {
        quality: "highestvideo",
        filter:  format => format.container === "mp4" && format.hasVideo && format.hasAudio,
      });
      const out = fs.createWriteStream(destPath);
      stream.pipe(out);
      stream.on("error", reject);
      out.on("finish", resolve);
      out.on("error", reject);
    });
  } else {
    // Direct video URL (mp4, mov, etc.)
    await new Promise((resolve, reject) => {
      const proto = videoUrl.startsWith("https") ? https : http;
      const out   = fs.createWriteStream(destPath);
      proto.get(videoUrl, res => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} downloading video`));
        res.pipe(out);
        out.on("finish", resolve);
        out.on("error", reject);
      }).on("error", reject);
    });
  }
}

async function fileToReplicate(filePath, mimeType) {
  const buffer = fs.readFileSync(filePath);
  const blob   = new Blob([new Uint8Array(buffer)], { type: mimeType });
  const file   = await replicate.files.create(blob, { filename: path.basename(filePath) });
  if (!file?.urls?.get) throw new Error("Replicate file upload failed: " + JSON.stringify(file));
  return file.urls.get;
}

// ── POST /api/tools/hooks ─────────────────────────────────────
router.post("/hooks", requireAuth, async (req, res, next) => {
  try {
    const { topic, platform = "tiktok", tone = "engaging" } = req.body;
    if (!topic) return res.status(400).json({ error: "topic is required" });

    const g = await gate(req, res, "hooks");
    if (!g) return;

    const msg = await anthropic.messages.create({
      model:      "claude-opus-4-5",
      max_tokens: 1200,
      messages: [{
        role:    "user",
        content: `Generate 10 viral video opening hooks for ${platform} about: "${topic}"
Tone: ${tone}
Rules:
- Each hook is 1-2 sentences, max 15 seconds when spoken aloud
- Create immediate curiosity, use pattern interrupts, or make a bold/controversial claim
- Vary the style: question, statistic, story opener, bold statement, counterintuitive claim
Return ONLY a valid JSON array of 10 strings. No markdown, no explanation.`,
      }],
    });

    const raw = msg.content[0].text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
    let hooks;
    try   { hooks = JSON.parse(raw); }
    catch { hooks = raw.split("\n").filter(l => l.trim()).slice(0, 10); }

    if (!g.isUnlimited) await deduct(req.user.id, "hooks", g.cost);
    res.json({ hooks });
  } catch (err) { next(err); }
});

// ── POST /api/tools/thumbnails ────────────────────────────────
router.post("/thumbnails", requireAuth, async (req, res, next) => {
  try {
    const { title, niche = "" } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });

    const g = await gate(req, res, "thumbnails");
    if (!g) return;

    const base = `YouTube thumbnail, video titled "${title}"${niche ? `, ${niche} niche` : ""}, 16:9, no text overlays, professional, high quality`;

    const variants = [
      {
        label:  "Bold & Dramatic",
        prompt: `${base}, person with shocked or excited expression, bold colors yellow orange red, dramatic lighting, close up face, high contrast, viral YouTube style`,
      },
      {
        label:  "Clean & Minimal",
        prompt: `${base}, clean minimal modern design, single focused subject, neutral or white background, professional photography, calm color palette, sharp focus`,
      },
      {
        label:  "Cinematic",
        prompt: `${base}, cinematic wide shot, moody atmospheric lighting, dark background with vibrant accent colors, film quality, epic visual storytelling, dramatic shadows`,
      },
    ];

    const results = await Promise.all(variants.map(async (v) => {
      const output = await replicate.run(
        "bytedance/sdxl-lightning-4step:5f24084160c9089501c1b3545d9be3c27883ae2239b6f412990e82d4a6210f8f",
        {
          input: {
            prompt:          v.prompt,
            negative_prompt: "blurry, low quality, text, watermark, ugly, deformed, cartoon, anime, words, letters",
            width:           1024,
            height:          576,
            num_inference_steps: 4,
          },
        }
      );
      const raw = Array.isArray(output) ? output[0] : output;
      const url = raw?.url ? raw.url().toString() : raw?.toString();
      return { label: v.label, url };
    }));

    if (!g.isUnlimited) await deduct(req.user.id, "thumbnails", g.cost);
    res.json({ thumbnails: results });
  } catch (err) { next(err); }
});

// ── POST /api/tools/captions ──────────────────────────────────
router.post("/captions", requireAuth, videoUpload.single("video"), async (req, res, next) => {
  const cleanup = () => { if (req.file?.path) fs.unlink(req.file.path, () => {}); };
  try {
    if (!req.file) return res.status(400).json({ error: "No video uploaded" });

    const g = await gate(req, res, "captions");
    if (!g) { cleanup(); return; }

    const fileUrl = await fileToReplicate(req.file.path, req.file.mimetype);
    cleanup();

    const output = await replicate.run("openai/whisper", {
      input: {
        audio:         fileUrl,
        model:         "large-v2",
        language:      "auto",
        transcription: "srt",
        translate:     false,
      },
    });

    if (!g.isUnlimited) await deduct(req.user.id, "captions", g.cost);

    const srt        = output?.transcription || output?.srt || "";
    const transcript = output?.text || srt.replace(/\d+\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n/g, "").replace(/\n\n/g, " ").trim();
    res.json({ srt, transcript });
  } catch (err) { cleanup(); next(err); }
});

// ── POST /api/tools/repurpose ─────────────────────────────────
router.post("/repurpose", requireAuth, videoUpload.single("video"), async (req, res, next) => {
  let downloadedPath = null;
  const cleanup = (extra = []) => {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    if (downloadedPath)  fs.unlink(downloadedPath, () => {});
    extra.forEach(p => fs.unlink(p, () => {}));
  };
  try {
    const videoUrl = req.body?.videoUrl?.trim();
    let videoPath  = req.file?.path;
    let mimeType   = req.file?.mimetype || "video/mp4";

    if (!videoPath && videoUrl) {
      const outName    = `${req.user.id}_url_${Date.now()}.mp4`;
      downloadedPath   = path.join(uploadsDir, outName);
      videoPath        = downloadedPath;
      await downloadVideoFromUrl(videoUrl, downloadedPath);
    }

    if (!videoPath) return res.status(400).json({ error: "No video uploaded or URL provided" });

    const g = await gate(req, res, "repurpose");
    if (!g) { cleanup(); return; }

    // Step 1: Whisper transcription with timestamps
    const fileUrl = await fileToReplicate(videoPath, mimeType);

    const whisper = await replicate.run("openai/whisper", {
      input: {
        audio:         fileUrl,
        model:         "large-v2",
        language:      "auto",
        transcription: "plain text",
        translate:     false,
      },
    });

    const segments = whisper?.segments || [];
    if (!segments.length) { cleanup(); return res.status(422).json({ error: "Could not extract audio or transcript from video." }); }

    // Step 2: Claude picks best clip windows
    const tScript = segments.map(s => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text.trim()}`).join("\n");

    const claude = await anthropic.messages.create({
      model:      "claude-opus-4-5",
      max_tokens: 800,
      messages: [{
        role:    "user",
        content: `You are a viral short-form video editor. Analyze this transcript and pick the 5 best clips for TikTok/Reels/Shorts (30–90 seconds each).
Choose segments with strong hooks, surprising insights, or standalone entertainment value.
Prefer complete thoughts — don't cut mid-sentence.

Transcript (format: [start_sec-end_sec] text):
${tScript}

Return ONLY a JSON array of 5 objects — no markdown, no explanation:
[{"start":12.0,"end":58.5,"title":"Clip title","hook":"Opening caption for this clip"}]`,
      }],
    });

    let clips;
    try {
      const raw = claude.content[0].text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
      clips = JSON.parse(raw);
    } catch {
      cleanup();
      return res.status(500).json({ error: "Failed to identify clip segments — try a different video." });
    }

    // Step 3: FFmpeg cut each segment
    const clipPaths = [];
    const cutClips  = await Promise.all(clips.map(async (clip, i) => {
      const outName = `${req.user.id}_clip${i}_${Date.now()}.mp4`;
      const outPath = path.join(uploadsDir, outName);
      clipPaths.push(outPath);
      const duration = Math.max(1, clip.end - clip.start);

      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .seekInput(clip.start)
          .duration(duration)
          .videoCodec("copy")
          .audioCodec("copy")
          .output(outPath)
          .on("end", resolve)
          .on("error", reject)
          .run();
      });

      const r2Url  = await uploadToR2(outPath, "video/mp4").catch(() => null);
      const clipUrl = r2Url || `/uploads/${outName}`;
      if (r2Url) fs.unlink(outPath, () => {});

      return { url: clipUrl, title: clip.title, hook: clip.hook, duration: Math.round(duration) };
    }));

    cleanup();
    if (!g.isUnlimited) await deduct(req.user.id, "repurpose", g.cost);
    res.json({ clips: cutClips });
  } catch (err) { cleanup(); next(err); }
});

// ── POST /api/tools/process — combined upload + AI pipeline ──
router.post("/process", requireAuth, videoUpload.single("video"), async (req, res, next) => {
  let downloadedPath = null;
  const cleanup = (extra = []) => {
    if (req.file?.path)  fs.unlink(req.file.path,  () => {});
    if (downloadedPath)  fs.unlink(downloadedPath,  () => {});
    extra.forEach(p => fs.unlink(p, () => {}));
  };
  try {
    const opts = {
      meta:       req.body.meta       !== "false",
      thumbnails: req.body.thumbnails !== "false",
      captions:   req.body.captions   !== "false",
      repurpose:  req.body.repurpose  === "true",
    };

    // Resolve video path
    const videoUrl = req.body?.videoUrl?.trim();
    let videoPath  = req.file?.path;
    let mimeType   = req.file?.mimetype || "video/mp4";

    if (!videoPath && videoUrl) {
      const outName  = `${req.user.id}_proc_${Date.now()}.mp4`;
      downloadedPath = path.join(uploadsDir, outName);
      videoPath      = downloadedPath;
      await downloadVideoFromUrl(videoUrl, downloadedPath);
    }
    if (!videoPath) return res.status(400).json({ error: "No video provided" });

    const COSTS = { meta: 1, thumbnails: 5, captions: 3, repurpose: 10 };
    const totalCost = Object.entries(opts).filter(([, v]) => v).reduce((s, [k]) => s + (COSTS[k] || 0), 0);

    const g = await gate(req, res, totalCost);
    if (!g) { cleanup(); return; }

    // Phase 1: transcription (shared between captions + repurpose)
    let whisperOutput = null;
    if (opts.captions || opts.repurpose) {
      const fileUrl = await fileToReplicate(videoPath, mimeType);
      whisperOutput = await replicate.run("openai/whisper", {
        input: { audio: fileUrl, model: "large-v2", language: "auto", transcription: "srt", translate: false },
      });
    }
    const transcript = whisperOutput?.text || "";
    const srt        = whisperOutput?.transcription || "";
    const segments   = whisperOutput?.segments || [];

    // Phase 2: meta (uses transcript for context)
    let metaResult = null;
    if (opts.meta) {
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 900,
        messages: [{ role: "user", content:
          `Generate compelling video metadata for a social media video.\n${transcript ? `Transcript:\n${transcript.slice(0, 3000)}\n\n` : ""}Return ONLY valid JSON (no markdown):\n{"title":"...","description":"...","tags":["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"]}`,
        }],
      });
      const raw = msg.content[0].text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
      try { metaResult = JSON.parse(raw); } catch { metaResult = null; }
    }

    // Phase 3: thumbnails + repurpose in parallel
    const [thumbnailResult, clipsResult] = await Promise.all([
      opts.thumbnails ? (async () => {
        const titleCtx = metaResult?.title || "";
        const base = `YouTube thumbnail${titleCtx ? ` for "${titleCtx}"` : ""}, professional content creator, 16:9, no text overlays, high quality`;
        const variants = [
          { label: "Bold & Dramatic", prompt: `${base}, shocked excited expression, bold colors yellow orange red, dramatic lighting, close-up face` },
          { label: "Clean & Minimal", prompt: `${base}, clean minimal modern, single focused subject, white background, professional photography` },
          { label: "Cinematic",       prompt: `${base}, cinematic wide shot, moody atmospheric lighting, dark background vibrant accent colors, film quality` },
        ];
        return Promise.all(variants.map(async v => {
          const output = await replicate.run(
            "bytedance/sdxl-lightning-4step:5f24084160c9089501c1b3545d9be3c27883ae2239b6f412990e82d4a6210f8f",
            { input: { prompt: v.prompt, negative_prompt: "blurry, low quality, text, watermark, ugly, deformed", width: 1024, height: 576, num_inference_steps: 4 } }
          );
          const raw = Array.isArray(output) ? output[0] : output;
          return { label: v.label, url: raw?.url ? raw.url().toString() : raw?.toString() };
        }));
      })() : Promise.resolve(null),

      opts.repurpose && segments.length > 0 ? (async () => {
        const tScript = segments.map(s => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text.trim()}`).join("\n");
        const claude = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          messages: [{ role: "user", content:
            `Pick the 5 best viral clips (30-90s each) for TikTok/Reels/Shorts from this transcript.\nTranscript:\n${tScript}\nReturn ONLY JSON: [{"start":0.0,"end":60.0,"title":"...","hook":"..."}]`,
          }],
        });
        const raw   = claude.content[0].text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
        const clips = JSON.parse(raw);
        const clipPaths = [];
        const cutClips  = await Promise.all(clips.map(async (clip, i) => {
          const outName = `${req.user.id}_clip${i}_${Date.now()}.mp4`;
          const outPath = path.join(uploadsDir, outName);
          clipPaths.push(outPath);
          const duration = Math.max(1, clip.end - clip.start);
          await new Promise((resolve, reject) => {
            ffmpeg(videoPath).seekInput(clip.start).duration(duration)
              .videoCodec("copy").audioCodec("copy").output(outPath)
              .on("end", resolve).on("error", reject).run();
          });
          const r2Url  = await uploadToR2(outPath, "video/mp4").catch(() => null);
          if (r2Url) fs.unlink(outPath, () => {});
          return { url: r2Url || `/uploads/${outName}`, title: clip.title, hook: clip.hook, duration: Math.round(duration) };
        }));
        return cutClips;
      })() : Promise.resolve(null),
    ]);

    cleanup();
    if (!g.isUnlimited) await deduct(req.user.id, "upload_process", totalCost);

    res.json({
      meta:       metaResult,
      thumbnails: thumbnailResult,
      captions:   opts.captions ? { srt, transcript } : null,
      clips:      clipsResult,
      creditsUsed: g.isUnlimited ? 0 : totalCost,
    });
  } catch (err) { cleanup(); next(err); }
});

// ── GET /api/tools/tips — AI trending tips for dashboard (no credit cost) ──
router.get("/tips", requireAuth, async (_req, res, next) => {
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content:
        `You are a social media strategist. Generate 4 concise, actionable content tips that are trending right now (${new Date().toLocaleDateString("en-US",{month:"long",year:"numeric"})}) for YouTube, TikTok, and Instagram creators.
Focus on: current viral formats, algorithm changes, emerging topics, or audience behaviour shifts.
Return ONLY a JSON array (no markdown): [{"tip":"...","category":"format|topic|algorithm|growth","platform":"youtube|tiktok|instagram|all"}]`,
      }],
    });
    const raw = msg.content[0].text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
    let tips;
    try { tips = JSON.parse(raw); } catch { tips = []; }
    res.json({ tips });
  } catch (err) { next(err); }
});

module.exports = router;
