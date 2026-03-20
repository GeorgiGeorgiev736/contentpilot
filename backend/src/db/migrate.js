require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { pool } = require("./client");

const SQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  name        TEXT NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'free',
  credits     INTEGER NOT NULL DEFAULT 10,
  stripe_customer_id   TEXT,
  stripe_subscription_id TEXT,
  subscription_status  TEXT DEFAULT 'inactive',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Platform connections
CREATE TABLE IF NOT EXISTS platform_connections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL,
  handle      TEXT,
  access_token  TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  followers   INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  connected   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  niche       TEXT,
  platform    TEXT,
  status      TEXT DEFAULT 'draft',
  stage       TEXT DEFAULT 'trend',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- AI Pipeline stage outputs
CREATE TABLE IF NOT EXISTS pipeline_outputs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  stage       TEXT NOT NULL,
  output      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, stage)
);

-- AI usage log (for billing)
CREATE TABLE IF NOT EXISTS ai_usage (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature     TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe payment events
CREATE TABLE IF NOT EXISTS payment_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  stripe_event_id TEXT UNIQUE,
  event_type      TEXT,
  amount          INTEGER,
  currency        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Multiple channels support
ALTER TABLE platform_connections ADD COLUMN IF NOT EXISTS channel_id TEXT NOT NULL DEFAULT 'default';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_connections_user_id_platform_key') THEN
    ALTER TABLE platform_connections DROP CONSTRAINT platform_connections_user_id_platform_key;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_connections_user_platform_channel_key') THEN
    ALTER TABLE platform_connections ADD CONSTRAINT platform_connections_user_platform_channel_key UNIQUE (user_id, platform, channel_id);
  END IF;
END $$;

-- OAuth columns (added after initial launch)
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT;

-- AI Avatar columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_voice_id TEXT;

-- Scheduled posts
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id    UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  platform       TEXT NOT NULL,
  title          TEXT,
  description    TEXT,
  hashtags       TEXT[],
  video_url      TEXT,
  thumbnail_url  TEXT,
  scheduled_for  TIMESTAMPTZ NOT NULL,
  status         TEXT DEFAULT 'scheduled',
  is_short       BOOLEAN DEFAULT FALSE,
  published_at   TIMESTAMPTZ,
  error_message  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_platform_connections_user ON platform_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_outputs_campaign ON pipeline_outputs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id);

SELECT 'Migration complete ✅' AS result;
`;

async function migrate() {
  console.log("Running migrations...");
  try {
    await pool.query(SQL);
    console.log("✅ All tables created successfully");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

migrate();
