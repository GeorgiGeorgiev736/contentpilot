// Run this once to add OAuth columns to your existing users table
// Command: node src/db/migrate-oauth.js

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { pool } = require("./client");

async function migrateOAuth() {
  console.log("Adding OAuth columns...");
  try {
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS oauth_provider    TEXT,
        ADD COLUMN IF NOT EXISTS oauth_provider_id TEXT,
        ADD COLUMN IF NOT EXISTS avatar            TEXT;

      CREATE INDEX IF NOT EXISTS idx_users_oauth
        ON users(oauth_provider, oauth_provider_id);
    `);
    console.log("✅ OAuth columns added successfully");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

migrateOAuth();
