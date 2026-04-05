const router  = require("express").Router();
const { query } = require("../db/client");
const { requireAuth } = require("../middleware/auth");
const crypto  = require("crypto");

const ACHIEVEMENTS = [
  { key:"first_step",       name:"First Step",        icon:"⚡", desc:"Create your account",                  cond:"users",           threshold:1,   discount:5,  category:"milestone" },
  { key:"first_post",       name:"Content Creator",   icon:"🎬", desc:"Schedule your first post",             cond:"scheduled_posts", threshold:1,   discount:10, category:"content"   },
  { key:"ai_native",        name:"AI Native",         icon:"🤖", desc:"Use AI generation 3 times",            cond:"ai_usage",        threshold:3,   discount:5,  category:"ai"        },
  { key:"platform_pioneer", name:"Platform Pioneer",  icon:"🔌", desc:"Connect your first platform",          cond:"platforms",       threshold:1,   discount:0,  category:"platforms" },
  { key:"triple_threat",    name:"Triple Threat",     icon:"🎯", desc:"Connect 3 different platforms",        cond:"platforms",       threshold:3,   discount:15, category:"platforms" },
  { key:"pipeline_runner",  name:"Pipeline Runner",   icon:"⚙",  desc:"Run the AI pipeline once",             cond:"campaigns",       threshold:1,   discount:10, category:"ai"        },
  { key:"consistent",       name:"Consistency King",  icon:"👑", desc:"Schedule 10 posts",                    cond:"scheduled_posts", threshold:10,  discount:20, category:"content"   },
  { key:"ai_addict",        name:"AI Addict",         icon:"🧠", desc:"Use AI generation 25 times",           cond:"ai_usage",        threshold:25,  discount:15, category:"ai"        },
  { key:"century",          name:"Century Club",      icon:"💯", desc:"Schedule 100 posts",                   cond:"scheduled_posts", threshold:100, discount:30, category:"content"   },
  { key:"autopilot_master", name:"Autopilot Master",  icon:"🚀", desc:"Run the AI pipeline 10 times",         cond:"campaigns",       threshold:10,  discount:25, category:"ai"        },
];

function genCode(key) {
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `AUTO-${key.slice(0,6).toUpperCase()}-${suffix}`;
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const uid = req.user.id;

    const [[postsRow], [aiRow], [platRow], [campRow]] = await Promise.all([
      query("SELECT COUNT(*) FROM scheduled_posts WHERE user_id=$1 AND status!='cancelled'", [uid]),
      query("SELECT COUNT(*) FROM ai_usage WHERE user_id=$1", [uid]),
      query("SELECT COUNT(DISTINCT platform) FROM platform_connections WHERE user_id=$1 AND connected=true", [uid]),
      query("SELECT COUNT(*) FROM campaigns WHERE user_id=$1", [uid]),
    ]);

    const counts = {
      users: 1,
      scheduled_posts: parseInt(postsRow.count),
      ai_usage:        parseInt(aiRow.count),
      platforms:       parseInt(platRow.count),
      campaigns:       parseInt(campRow.count),
    };

    const rows = await query("SELECT * FROM user_achievements WHERE user_id=$1", [uid]);
    const map  = {};
    rows.forEach(r => { map[r.achievement_key] = r; });

    const newly_unlocked = [];
    for (const a of ACHIEVEMENTS) {
      if (map[a.key]) continue;
      if ((counts[a.cond] || 0) >= a.threshold) {
        const code = a.discount > 0 ? genCode(a.key) : null;
        await query(
          "INSERT INTO user_achievements (user_id,achievement_key,discount_code,unlocked_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT DO NOTHING",
          [uid, a.key, code]
        );
        map[a.key] = { discount_code: code };
        newly_unlocked.push({ ...a, code });
      }
    }

    const achievements = ACHIEVEMENTS.map(a => ({
      ...a,
      progress:       Math.min(counts[a.cond] || 0, a.threshold),
      unlocked:       !!map[a.key],
      discount_code:  map[a.key]?.discount_code || null,
      newly_unlocked: newly_unlocked.some(n => n.key === a.key),
    }));

    res.json({ achievements, counts, newly_unlocked });
  } catch (err) { next(err); }
});

module.exports = router;
