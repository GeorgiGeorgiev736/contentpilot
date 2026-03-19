/**
 * Run once to create PayPal product + billing plans.
 * Usage: node scripts/create-paypal-plans.js
 * It will print the Plan IDs — paste them into backend/.env
 */
require("dotenv").config();

const BASE = process.env.PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

const PLANS_CFG = [
  { name: "Creator Monthly",  price: "19.00", key: "PAYPAL_PLAN_CREATOR"  },
  { name: "Pro Monthly",      price: "49.00", key: "PAYPAL_PLAN_PRO"      },
  { name: "Business Monthly", price: "149.00", key: "PAYPAL_PLAN_BUSINESS" },
  { name: "Max Monthly",      price: "349.00", key: "PAYPAL_PLAN_MAX"     },
];

async function getToken() {
  const creds = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Token failed: " + JSON.stringify(data));
  return data.access_token;
}

async function createProduct(token) {
  const res = await fetch(`${BASE}/v1/catalogs/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name:        "Autopilot AI Platform",
      description: "AI-powered content automation for creators",
      type:        "SERVICE",
      category:    "SOFTWARE",
    }),
  });
  const data = await res.json();
  if (!data.id) throw new Error("Product creation failed: " + JSON.stringify(data));
  console.log(`✅ Product created: ${data.id}`);
  return data.id;
}

async function createPlan(token, productId, cfg) {
  const res = await fetch(`${BASE}/v1/billing/plans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_id:  productId,
      name:        cfg.name,
      status:      "ACTIVE",
      billing_cycles: [
        {
          frequency:     { interval_unit: "MONTH", interval_count: 1 },
          tenure_type:   "REGULAR",
          sequence:      1,
          total_cycles:  0, // 0 = infinite
          pricing_scheme: {
            fixed_price: { value: cfg.price, currency_code: "USD" },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding:     true,
        setup_fee_failure_action:  "CONTINUE",
        payment_failure_threshold: 3,
      },
    }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Plan '${cfg.name}' failed: ` + JSON.stringify(data));
  return data.id;
}

async function main() {
  console.log(`\nUsing PayPal ${process.env.PAYPAL_MODE} environment\n`);
  const token     = await getToken();
  const productId = await createProduct(token);

  console.log("\nCreating billing plans...\n");
  const lines = [];
  for (const cfg of PLANS_CFG) {
    const planId = await createPlan(token, productId, cfg);
    console.log(`✅ ${cfg.name}: ${planId}`);
    lines.push(`${cfg.key}=${planId}`);
  }

  console.log("\n=== Paste these into backend/.env ===\n");
  console.log(lines.join("\n"));
  console.log("\n=====================================\n");
}

main().catch(err => { console.error("❌", err.message); process.exit(1); });
