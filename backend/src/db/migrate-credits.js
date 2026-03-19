// Adds credits_used column to ai_usage for per-feature credit tracking
// Run: node src/db/migrate-credits.js

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { pool } = require("./client");

async function migrate() {
  console.log("Running credits migration…");
  await pool.query(`
    ALTER TABLE ai_usage
    ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 1;
  `);
  console.log("✅ credits_used column added to ai_usage");
  await pool.end();
}

migrate().catch(err => { console.error(err.message); process.exit(1); });
