const jwt = require("jsonwebtoken");
const { queryOne } = require("../db/client");

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    // Also accept ?token= query param so browser OAuth redirects work
    const token = (header && header.startsWith("Bearer ") ? header.slice(7) : null)
               || req.query.token;

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user from DB (catches deleted/suspended accounts)
    const user = await queryOne(
      "SELECT id, email, name, plan, credits, credits_reset_at, subscription_status, is_admin FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError") return res.status(401).json({ error: "Invalid token" });
    if (err.name === "TokenExpiredError") return res.status(401).json({ error: "Token expired" });
    next(err);
  }
}

// Check user has an active paid plan
function requirePlan(...plans) {
  return (req, res, next) => {
    if (!plans.includes(req.user.plan)) {
      return res.status(403).json({
        error: "This feature requires a paid plan",
        requiredPlans: plans,
        currentPlan: req.user.plan,
      });
    }
    next();
  };
}

// Check user has enough credits for the requested feature.
// Unlimited plans (pro, business, max) are never blocked.
async function requireCredits(req, res, next) {
  const { getCost } = require("../ai/creditCosts");
  const unlimitedPlans = ["pro", "business", "max"];

  if (unlimitedPlans.includes(req.user.plan)) return next();

  const feature = req.body?.feature;
  const cost    = getCost(feature);

  if (req.user.credits < cost) {
    return res.status(402).json({
      error: `This feature costs ${cost} credits and you only have ${req.user.credits} remaining. Upgrade to continue.`,
      credits:  req.user.credits,
      required: cost,
    });
  }
  next();
}

module.exports = { requireAuth, requirePlan, requireCredits };
