require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { pool } = require("./client");

async function migrate() {
  console.log("Running avatar migration…");
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_photo_url  TEXT,
    ADD COLUMN IF NOT EXISTS avatar_voice_id   TEXT DEFAULT 'Rachel';
  `);
  console.log("✅ avatar_photo_url + avatar_voice_id added to users");
  await pool.end();
}

migrate().catch(err => { console.error(err.message); process.exit(1); });
