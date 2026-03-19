const router = require("express").Router();
const Anthropic = require("@anthropic-ai/sdk");
const { requireAuth, requireCredits } = require("../middleware/auth");
const { query } = require("../db/client");
const { STAGE_PROMPTS, FEATURE_PROMPTS } = require("../ai/prompts");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const { getCost } = require("../ai/creditCosts");

const UNLIMITED_PLANS = ["pro", "business", "max"];

// Deduct credits (tiered by feature) and log usage
async function logUsage(userId, feature, tokensUsed = 0, userPlan = "free") {
  const cost = getCost(feature);
  // Only deduct for limited plans
  if (!UNLIMITED_PLANS.includes(userPlan)) {
    await query(
      "UPDATE users SET credits = GREATEST(credits - $1, 0) WHERE id = $2",
      [cost, userId]
    );
  }
  await query(
    "INSERT INTO ai_usage (user_id, feature, tokens_used, credits_used) VALUES ($1, $2, $3, $4)",
    [userId, feature, tokensUsed, cost]
  );
}

// POST /api/ai/stream — main streaming endpoint
// All AI features in the frontend hit this one endpoint
router.post("/stream", requireAuth, requireCredits, async (req, res, next) => {
  const { feature, context } = req.body;

  if (!feature) return res.status(400).json({ error: "feature is required" });

  // Build prompt based on feature
  const promptFn = FEATURE_PROMPTS[feature] || STAGE_PROMPTS[feature];
  if (!promptFn) return res.status(400).json({ error: `Unknown feature: ${feature}` });

  const prompt = promptFn(context || {});

  // Server-Sent Events for real-time streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "http://localhost:5173");
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  let totalTokens = 0;

  try {
    send("start", { feature });

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: "You are an expert AI assistant for an influencer content autopilot platform. Be specific, actionable, and data-driven. Format responses clearly.",
      messages: [{ role: "user", content: prompt }],
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta?.text) {
        send("token", { text: chunk.delta.text });
      }
      if (chunk.type === "message_delta" && chunk.usage) {
        totalTokens = chunk.usage.output_tokens || 0;
      }
    }

    const cost = getCost(feature);
    await logUsage(req.user.id, feature, totalTokens, req.user.plan);
    send("done", { feature, tokensUsed: totalTokens, creditsUsed: cost });
    res.end();

  } catch (err) {
    send("error", { message: err.message });
    res.end();
    next(err);
  }
});

// GET /api/ai/credits — check remaining credits
router.get("/credits", requireAuth, async (req, res) => {
  res.json({ credits: req.user.credits, plan: req.user.plan });
});

// GET /api/ai/costs — credit cost per feature (used by frontend buttons)
router.get("/costs", (_req, res) => {
  const { CREDIT_COSTS } = require("../ai/creditCosts");
  res.json({ costs: CREDIT_COSTS });
});

module.exports = router;
