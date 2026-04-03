const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const crypto = require("crypto");
const { z } = require("zod");
const { query, queryOne } = require("../db/client");
const { requireAuth } = require("../middleware/auth");
const { sendVerificationEmail } = require("../services/email");

const RegisterSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { name, email, password } = parsed.data;

    const existing = await queryOne("SELECT id FROM users WHERE email = $1", [email]);
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const hash         = await bcrypt.hash(password, 12);
    const verifyToken  = crypto.randomBytes(32).toString("hex");
    const verifyExpiry = new Date(Date.now() + 24 * 3600 * 1000); // 24h

    const [user] = await query(
      `INSERT INTO users (name, email, password, plan, credits, email_verified, verify_token, verify_token_expires)
       VALUES ($1, $2, $3, 'free', 10, false, $4, $5)
       RETURNING id, name, email, plan, credits, email_verified`,
      [name, email, hash, verifyToken, verifyExpiry]
    );

    // Send verification email (non-blocking — don't fail register if email fails)
    sendVerificationEmail(email, name, verifyToken).catch(e => console.warn("Verify email failed:", e.message));

    res.status(201).json({ pendingVerification: true, email });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { email, password } = parsed.data;

    const user = await queryOne("SELECT * FROM users WHERE email = $1", [email]);
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    if (!user.email_verified) {
      return res.status(403).json({ error: "Please verify your email before signing in.", pendingVerification: true, email: user.email });
    }

    const token = signToken(user.id);
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/verify?token=
router.get("/verify", async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.redirect(`${process.env.FRONTEND_URL}?error=invalid_token`);

    const user = await queryOne(
      "SELECT id FROM users WHERE verify_token = $1 AND verify_token_expires > NOW()",
      [token]
    );
    if (!user) return res.redirect(`${process.env.FRONTEND_URL}?error=token_expired`);

    await query(
      "UPDATE users SET email_verified = true, verify_token = null, verify_token_expires = null WHERE id = $1",
      [user.id]
    );
    res.redirect(`${process.env.FRONTEND_URL}?verified=1`);
  } catch (err) { next(err); }
});

// POST /api/auth/resend-verification
router.post("/resend-verification", async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const user = await queryOne("SELECT * FROM users WHERE email = $1", [email]);
    if (!user || user.email_verified) return res.json({ success: true }); // silent

    const verifyToken  = crypto.randomBytes(32).toString("hex");
    const verifyExpiry = new Date(Date.now() + 24 * 3600 * 1000);

    await query(
      "UPDATE users SET verify_token = $1, verify_token_expires = $2 WHERE id = $3",
      [verifyToken, verifyExpiry, user.id]
    );
    await sendVerificationEmail(email, user.name, verifyToken);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
