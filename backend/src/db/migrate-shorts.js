// Adds is_short column to scheduled_posts for YouTube Shorts distinction
// Run: node src/db/migrate-shorts.js

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { pool } = require("./client");

async function migrate() {
  console.log("Running shorts migration…");
  await pool.query(`
    ALTER TABLE scheduled_posts
    ADD COLUMN IF NOT EXISTS is_short BOOLEAN DEFAULT false;
  `);
  console.log("✅ is_short column added to scheduled_posts");
  await pool.end();
}

migrate().catch(err => { console.error(err.message); process.exit(1); });
