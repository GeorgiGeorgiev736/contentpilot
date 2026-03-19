require("dotenv").config();
const { validateEnv } = require("./utils/validateEnv");
validateEnv(); // exits early with clear error if keys are missing
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { logger } = require("./utils/logger");
const { testDbConnection } = require("./db/client");

const path = require("path");
const fs   = require("fs");

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

// Static file serving for uploaded videos/thumbnails
app.use("/uploads", express.static(uploadsDir));

// Stripe webhooks need raw body — must come BEFORE express.json()
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10mb" }));

// Rate limiting
app.use("/api/", rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true }));
app.use("/api/ai/", rateLimit({ windowMs: 60 * 1000, max: 20, message: { error: "Too many AI requests, slow down" } }));

// ── Routes ────────────────────────────────────────────────────
app.use("/api/auth",     require("./routes/auth"));
app.use("/api/user",     require("./routes/user"));
app.use("/api/ai",       require("./routes/ai"));
app.use("/api/campaigns",require("./routes/campaigns"));
app.use("/api/platforms", require("./routes/platforms"));
app.use("/api/stripe",   require("./routes/stripe"));
app.use("/api/paypal",   require("./routes/paypal"));
app.use("/api/oauth",    require("./routes/oauth"));
app.use("/api/schedule", require("./routes/schedule"));
app.use("/api/clips",    require("./routes/clips"));
app.use("/api/avatar",   require("./routes/avatar"));

// ── Health checks ────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", env: process.env.NODE_ENV }));

// ── Error handler ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────
async function start() {
  try {
    await testDbConnection();
    app.listen(PORT, () => {
      logger.info(`✅ Server running on http://localhost:${PORT}`);
      logger.info(`✅ Environment: ${process.env.NODE_ENV}`);
    });
  } catch (err) {
    console.error("STARTUP ERROR:", err.message);
    console.error("FULL ERROR:", err.stack);
    process.exit(1);
  }
}

start();
