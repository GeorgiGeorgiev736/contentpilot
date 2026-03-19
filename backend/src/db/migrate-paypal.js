require("dotenv").config();
const { query } = require("./client");

async function migrate() {
  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT;
  `);
  console.log("✅ PayPal column added to users table");
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
