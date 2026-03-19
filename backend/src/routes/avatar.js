const router   = require("express").Router();
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
const Replicate = require("replicate");
const { requireAuth } = require("../middleware/auth");
const { query, queryOne } = require("../db/client");

const replicate  = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const AVATAR_CREDIT_COST = 15;
const UNLIMITED_PLANS    = ["pro", "business", "max"];

const uploadsDir = path.join(__dirname, "../../uploads");
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user.id}_avatar_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB for photos
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

// ── Upload files to Replicate CDN so models can access them ──
async function uploadToReplicate(filePath, mimeType) {
  const buffer = fs.readFileSync(filePath);
  const res = await fetch("https://api.replicate.com/v1/files", {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": mimeType,
    },
    body: buffer,
  });
  const data = await res.json();
  if (!data.urls?.get) throw new Error("Replicate file upload failed: " + JSON.stringify(data));
  return data.urls.get;
}

// ── POST /api/avatar/upload-photo ────────────────────────────
router.post("/upload-photo", requireAuth, upload.single("photo"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No photo uploaded" });
    const photoUrl = `/uploads/${req.file.filename}`;
    await query("UPDATE users SET avatar_photo_url = $1 WHERE id = $2", [photoUrl, req.user.id]);
    res.json({ photo_url: photoUrl });
  } catch (err) { next(err); }
});

// ── GET /api/avatar/settings ─────────────────────────────────
router.get("/settings", requireAuth, async (req, res, next) => {
  try {
    const user = await queryOne(
      "SELECT avatar_photo_url, avatar_voice_id FROM users WHERE id = $1",
      [req.user.id]
    );
    res.json({ photo_url: user.avatar_photo_url, voice_id: user.avatar_voice_id || "Rachel" });
  } catch (err) { next(err); }
});

// ── PUT /api/avatar/settings ─────────────────────────────────
router.put("/settings", requireAuth, async (req, res, next) => {
  try {
    const { voice_id } = req.body;
    await query("UPDATE users SET avatar_voice_id = $1 WHERE id = $2", [voice_id, req.user.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── GET /api/avatar/voices ────────────────────────────────────
router.get("/voices", requireAuth, async (req, res, next) => {
  try {
    const elevenRes = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": ELEVEN_KEY },
    });
    const data = await elevenRes.json();
    // Return only name + voice_id so frontend doesn't need the full payload
    const voices = (data.voices || []).map(v => ({
      voice_id: v.voice_id,
      name:     v.name,
      category: v.category,
      preview:  v.preview_url,
    }));
    res.json({ voices });
  } catch (err) { next(err); }
});

// ── POST /api/avatar/generate ────────────────────────────────
// Body: { script } — uses photo + voice saved in user settings
router.post("/generate", requireAuth, async (req, res, next) => {
  try {
    const { script } = req.body;
    if (!script) return res.status(400).json({ error: "script is required" });

    // Credit check
    const isUnlimited = UNLIMITED_PLANS.includes(req.user.plan);
    if (!isUnlimited && req.user.credits < AVATAR_CREDIT_COST) {
      return res.status(402).json({
        error: `Avatar generation costs ${AVATAR_CREDIT_COST} credits. You have ${req.user.credits}.`,
        credits:  req.user.credits,
        required: AVATAR_CREDIT_COST,
      });
    }

    // Load user's saved avatar settings
    const user = await queryOne(
      "SELECT avatar_photo_url, avatar_voice_id FROM users WHERE id = $1",
      [req.user.id]
    );
    if (!user.avatar_photo_url) {
      return res.status(400).json({ error: "Upload a photo first in the Avatar Setup tab." });
    }

    const voiceId   = user.avatar_voice_id || "21m00Tcm4TlvDq8ikWAM"; // Rachel default
    const photoPath = path.join(uploadsDir, path.basename(user.avatar_photo_url));
    if (!fs.existsSync(photoPath)) {
      return res.status(400).json({ error: "Avatar photo not found. Please re-upload." });
    }

    // ── Step 1: ElevenLabs TTS → save audio file ─────────────
    const cleanScript = script.replace(/\*\*.*?\*\*/g, "").replace(/#{1,3}\s/g, "").trim().slice(0, 2500);

    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key":   ELEVEN_KEY,
        "Content-Type": "application/json",
        "Accept":       "audio/mpeg",
      },
      body: JSON.stringify({
        text:           cleanScript,
        model_id:       "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!ttsRes.ok) {
      const err = await ttsRes.json().catch(() => ({}));
      throw new Error("ElevenLabs TTS failed: " + (err.detail?.message || ttsRes.status));
    }

    const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());
    const audioFile   = `${req.user.id}_tts_${Date.now()}.mp3`;
    const audioPath   = path.join(uploadsDir, audioFile);
    fs.writeFileSync(audioPath, audioBuffer);

    // ── Step 2: Upload photo + audio to Replicate CDN ─────────
    const [photoReplicateUrl, audioReplicateUrl] = await Promise.all([
      uploadToReplicate(photoPath,  "image/jpeg"),
      uploadToReplicate(audioPath,  "audio/mpeg"),
    ]);

    // ── Step 3: Submit SadTalker job to Replicate ─────────────
    const prediction = await replicate.predictions.create({
      model:   "cjwbw/sadtalker",
      input: {
        source_image:  photoReplicateUrl,
        driven_audio:  audioReplicateUrl,
        preprocess:    "crop",
        still_mode:    false,
        use_enhancer:  true,
        size_of_image: 256,
        pose_style:    0,
      },
    });

    // ── Step 4: Deduct credits ─────────────────────────────────
    if (!isUnlimited) {
      await query(
        "UPDATE users SET credits = GREATEST(credits - $1, 0) WHERE id = $2",
        [AVATAR_CREDIT_COST, req.user.id]
      );
    }
    await query(
      "INSERT INTO ai_usage (user_id, feature, tokens_used, credits_used) VALUES ($1, $2, $3, $4)",
      [req.user.id, "avatar_generate", 0, AVATAR_CREDIT_COST]
    );

    // Clean up local audio file (photo is kept for reuse)
    fs.unlink(audioPath, () => {});

    res.json({
      prediction_id: prediction.id,
      status:        prediction.status,
      credits_used:  AVATAR_CREDIT_COST,
    });
  } catch (err) { next(err); }
});

// ── GET /api/avatar/status/:id ────────────────────────────────
router.get("/status/:id", requireAuth, async (req, res, next) => {
  try {
    const prediction = await replicate.predictions.get(req.params.id);
    res.json({
      status:    prediction.status,               // starting | processing | succeeded | failed
      video_url: prediction.output ?? null,
      error:     prediction.error ?? null,
      progress:  prediction.logs ? parseProgress(prediction.logs) : 0,
    });
  } catch (err) { next(err); }
});

function parseProgress(logs) {
  // SadTalker logs progress as percentages — extract the last one
  const matches = logs.match(/(\d+)%/g);
  if (!matches) return 0;
  return parseInt(matches[matches.length - 1]);
}

module.exports = router;
