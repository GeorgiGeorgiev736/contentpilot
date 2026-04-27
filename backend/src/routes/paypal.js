const router  = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { query, queryOne } = require("../db/client");
const { logger } = require("../utils/logger");

const BASE = process.env.PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

// planKey → { planId (PayPal), credits/month, dbPlan (stored in users.plan) }
const PLANS = {
  starter:        { planId: process.env.PAYPAL_PLAN_STARTER,        credits: 75,   dbPlan: "starter"  },
  starter_yearly: { planId: process.env.PAYPAL_PLAN_STARTER_YEARLY, credits: 75,   dbPlan: "starter"  },
  creator:        { planId: process.env.PAYPAL_PLAN_CREATOR,        credits: 300,  dbPlan: "creator"  },
  creator_yearly: { planId: process.env.PAYPAL_PLAN_CREATOR_YEARLY, credits: 300,  dbPlan: "creator"  },
  pro:            { planId: process.env.PAYPAL_PLAN_PRO,            credits: 700,  dbPlan: "pro"      },
  pro_yearly:     { planId: process.env.PAYPAL_PLAN_PRO_YEARLY,     credits: 700,  dbPlan: "pro"      },
  agency:         { planId: process.env.PAYPAL_PLAN_AGENCY,         credits: 2000, dbPlan: "agency"   },
  agency_yearly:  { planId: process.env.PAYPAL_PLAN_AGENCY_YEARLY,  credits: 2000, dbPlan: "agency"   },
};

async function getAccessToken() {
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get PayPal access token");
  return data.access_token;
}

// POST /api/paypal/checkout — create subscription and return PayPal approval URL
router.post("/checkout", requireAuth, async (req, res, next) => {
  try {
    const { plan } = req.body;
    const planConfig = PLANS[plan];
    if (!planConfig) return res.status(400).json({ error: "Invalid plan" });
    if (!planConfig.planId) return res.status(400).json({ error: "PayPal plan not configured" });

    const token = await getAccessToken();

    const subRes = await fetch(`${BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        plan_id: planConfig.planId,
        custom_id: `${req.user.id}:${plan}`,
        application_context: {
          brand_name: "Autopilot Creator OS",
          return_url: `${process.env.FRONTEND_URL}/pricing?paypal=success`,
          cancel_url:  `${process.env.FRONTEND_URL}/pricing?paypal=cancelled`,
          user_action: "SUBSCRIBE_NOW",
          shipping_preference: "NO_SHIPPING",
        },
      }),
    });

    const sub = await subRes.json();
    if (sub.error || sub.message) throw new Error(sub.message || sub.error);

    const approvalUrl = sub.links?.find(l => l.rel === "approve")?.href;
    if (!approvalUrl) throw new Error("No approval URL from PayPal");

    // Store pending subscription id so we can verify on return
    await query(
      "UPDATE users SET paypal_subscription_id=$1 WHERE id=$2",
      [sub.id, req.user.id]
    );

    res.json({ url: approvalUrl });
  } catch (err) { next(err); }
});

// POST /api/paypal/verify — called after user returns from PayPal approval
router.post("/verify", requireAuth, async (req, res, next) => {
  try {
    const { subscriptionId } = req.body;
    if (!subscriptionId) return res.status(400).json({ error: "Missing subscriptionId" });

    const token = await getAccessToken();

    const subRes = await fetch(`${BASE}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const sub = await subRes.json();

    if (sub.status !== "ACTIVE") return res.status(400).json({ error: "Subscription not active yet" });

    const [userId, plan] = (sub.custom_id || "").split(":");
    const planConfig = PLANS[plan];
    if (!planConfig || String(userId) !== String(req.user.id)) {
      return res.status(400).json({ error: "Subscription mismatch" });
    }

    await query(
      `UPDATE users SET plan=$1, credits=$2, paypal_subscription_id=$3,
       subscription_status='active', updated_at=NOW() WHERE id=$4`,
      [planConfig.dbPlan, planConfig.credits, subscriptionId, userId]
    );

    logger.info(`User ${userId} subscribed via PayPal to ${planConfig.dbPlan}`);
    res.json({ success: true, plan });
  } catch (err) { next(err); }
});

// POST /api/paypal/webhook — PayPal sends subscription lifecycle events here
router.post("/webhook", async (req, res) => {
  try {
    const { event_type, resource } = req.body;

    if (event_type === "BILLING.SUBSCRIPTION.CANCELLED" || event_type === "BILLING.SUBSCRIPTION.EXPIRED") {
      if (resource?.id) {
        await query(
          "UPDATE users SET plan='free', credits=5, subscription_status='cancelled', updated_at=NOW() WHERE paypal_subscription_id=$1",
          [resource.id]
        );
        logger.info(`PayPal subscription cancelled: ${resource.id}`);
      }
    }

    if (event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
      const [userId, plan] = (resource?.custom_id || "").split(":");
      const planConfig = PLANS[plan];
      if (planConfig && userId) {
        await query(
          `UPDATE users SET plan=$1, credits=$2, paypal_subscription_id=$3,
           subscription_status='active', updated_at=NOW() WHERE id=$4`,
          [planConfig.dbPlan, planConfig.credits, resource.id, userId]
        );
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error("PayPal webhook error:", err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
});

module.exports = router;
