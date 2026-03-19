require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { pool } = require("./client");

async function migrate() {
  console.log("Running social media migrations...");
  try {
    await pool.query(`
      -- Add OAuth columns to users
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS oauth_provider    TEXT,
        ADD COLUMN IF NOT EXISTS oauth_provider_id TEXT,
        ADD COLUMN IF NOT EXISTS avatar            TEXT;

      CREATE INDEX IF NOT EXISTS idx_users_oauth
        ON users(oauth_provider, oauth_provider_id);

      -- Scheduled posts table
      CREATE TABLE IF NOT EXISTS scheduled_posts (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        campaign_id      UUID REFERENCES campaigns(id) ON DELETE SET NULL,
        platform         TEXT NOT NULL,
        title            TEXT NOT NULL,
        description      TEXT DEFAULT '',
        hashtags         TEXT[] DEFAULT '{}',
        scheduled_for    TIMESTAMPTZ NOT NULL,
        video_url        TEXT,
        thumbnail_url    TEXT,
        status           TEXT NOT NULL DEFAULT 'scheduled',
        platform_post_id TEXT,
        published_at     TIMESTAMPTZ,
        error_message    TEXT,
        created_at       TIMESTAMPTZ DEFAULT NOW(),
        updated_at       TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user     ON scheduled_posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status   ON scheduled_posts(status);
      CREATE INDEX IF NOT EXISTS idx_scheduled_posts_schedule ON scheduled_posts(scheduled_for);
    `);
    console.log("✅ Social media migrations complete");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

migrate();
