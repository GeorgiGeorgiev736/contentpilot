const router = require("express").Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { requireAuth } = require("../middleware/auth");
const { query, queryOne } = require("../db/client");
const { logger } = require("../utils/logger");

const PLANS = {
  // Legacy plan IDs (keep for existing subscribers)
  starter: { price: process.env.STRIPE_PRICE_STARTER,  credits: 50,   name: "Starter"  },
  agency:  { price: process.env.STRIPE_PRICE_AGENCY,   credits: 2000, name: "Agency"   },
  // Current plan IDs
  creator: { price: process.env.STRIPE_PRICE_CREATOR,  credits: 200,  name: "Creator"  },
  pro:     { price: process.env.STRIPE_PRICE_PRO,      credits: 500,  name: "Pro"      },
  business:{ price: process.env.STRIPE_PRICE_BUSINESS, credits: 1500, name: "Business" },
  max:     { price: process.env.STRIPE_PRICE_MAX,      credits: 5000, name: "Max"      },
};

// POST /api/stripe/checkout — create Stripe checkout session
router.post("/checkout", requireAuth, async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: "Invalid plan" });

    const planConfig = PLANS[plan];

    // Get or create Stripe customer
    let customerId = req.user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name:  req.user.name,
        metadata: { userId: req.user.id },
      });
      customerId = customer.id;
      await query("UPDATE users SET stripe_customer_id = $1 WHERE id = $2", [customerId, req.user.id]);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: planConfig.price, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/dashboard?upgraded=true`,
      cancel_url:  `${process.env.FRONTEND_URL}/pricing`,
      metadata: { userId: req.user.id, plan },
    });

    res.json({ url: session.url });
  } catch (err) { next(err); }
});

// POST /api/stripe/portal — billing management portal
router.post("/portal", requireAuth, async (req, res, next) => {
  try {
    const user = await queryOne("SELECT stripe_customer_id FROM users WHERE id = $1", [req.user.id]);
    if (!user?.stripe_customer_id) return res.status(400).json({ error: "No billing account found" });

    const session = await stripe.billingPortal.sessions.create({
      customer:   user.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (err) { next(err); }
});

// POST /api/stripe/webhook — Stripe events (must use raw body)
router.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error("Webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object;
        const { userId, plan } = session.metadata;
        const planConfig = PLANS[plan];
        if (!planConfig) break;

        await query(
          `UPDATE users SET
            plan = $1,
            credits = $2,
            stripe_subscription_id = $3,
            subscription_status = 'active',
            updated_at = NOW()
          WHERE id = $4`,
          [plan, planConfig.credits, session.subscription, userId]
        );

        await query(
          "INSERT INTO payment_events (user_id, stripe_event_id, event_type, amount, currency) VALUES ($1, $2, $3, $4, $5)",
          [userId, event.id, event.type, session.amount_total, session.currency]
        );

        logger.info(`User ${userId} upgraded to ${plan}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await query(
          "UPDATE users SET plan = 'free', credits = 5, subscription_status = 'cancelled', updated_at = NOW() WHERE stripe_subscription_id = $1",
          [sub.id]
        );
        logger.info(`Subscription cancelled: ${sub.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        await query(
          "UPDATE users SET subscription_status = 'past_due', updated_at = NOW() WHERE stripe_customer_id = $1",
          [invoice.customer]
        );
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error("Webhook handler error:", err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
});

// GET /api/stripe/plans — return plan info (no auth needed)
router.get("/plans", (_req, res) => {
  res.json({
    plans: [
      { id: "free",     name: "Free",     price: 0,   credits: 10,   features: ["10 AI generations (one-time)", "1 platform connection", "Trend radar", "Basic video optimizer"] },
      { id: "creator",  name: "Creator",  price: 19,  credits: 200,  features: ["200 AI credits/month", "All 3 platforms", "Content scheduler", "Video Clipper", "Script writer"] },
      { id: "pro",      name: "Pro",      price: 49,  credits: 500,  features: ["500 AI credits/month", "All platforms", "Full AI pipeline", "Thumbnail designer", "Analytics", "Priority support"] },
      { id: "business", name: "Business", price: 149, credits: 1500, features: ["1,500 AI credits/month", "Everything in Pro", "5 team members", "10 channels", "White-label reports", "API access"] },
      { id: "max",      name: "Max",      price: 349, credits: 5000, features: ["5,000 AI credits/month", "Everything in Business", "AI Avatar videos", "Custom voice cloning", "Unlimited team members", "SLA + Slack"] },
    ],
  });
});

module.exports = router;
