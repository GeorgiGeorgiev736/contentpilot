// Creates a test user so you can log in right away
// Run: npm run seed
// Login: test@autopilot.io / password123

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const bcrypt = require("bcryptjs");
const { pool, query } = require("./client");

async function seed() {
  console.log("Seeding database...");
  try {
    // Create test user
    const hash = await bcrypt.hash("password123", 12);
    await query(`
      INSERT INTO users (name, email, password, plan, credits)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET
        password = $3, plan = $4, credits = $5
    `, ["Test User", "test@autopilot.io", hash, "pro", 9999]);

    // Create a sample campaign
    const [user] = await query("SELECT id FROM users WHERE email = $1", ["test@autopilot.io"]);
    await query(`
      INSERT INTO campaigns (user_id, name, niche, platform, status, stage)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, [user.id, "AI Tools Review Series", "AI / tech productivity", "youtube", "active", "script"]);

    // Mock platform connection
    await query(`
      INSERT INTO platform_connections (user_id, platform, handle, followers, video_count, connected)
      VALUES ($1, 'youtube', '@testchannel', 284000, 147, true)
      ON CONFLICT (user_id, platform) DO UPDATE SET
        handle = '@testchannel', followers = 284000, video_count = 147, connected = true
    `, [user.id]);

    await query(`
      INSERT INTO platform_connections (user_id, platform, handle, followers, video_count, connected)
      VALUES ($1, 'tiktok', '@testhandle', 1200000, 312, true)
      ON CONFLICT (user_id, platform) DO UPDATE SET
        handle = '@testhandle', followers = 1200000, video_count = 312, connected = true
    `, [user.id]);

    console.log("\n✅ Seed complete!");
    console.log("─────────────────────────────");
    console.log("  Login email:    test@autopilot.io");
    console.log("  Login password: password123");
    console.log("  Plan:           Pro (unlimited credits)");
    console.log("─────────────────────────────\n");

  } catch (err) {
    console.error("❌ Seed failed:", err.message);
  } finally {
    await pool.end();
  }
}

seed();
