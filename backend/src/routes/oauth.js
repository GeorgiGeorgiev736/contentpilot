const router = require("express").Router();
const jwt    = require("jsonwebtoken");
const crypto = require("crypto");
const { query, queryOne } = require("../db/client");
const { requireAuth } = require("../middleware/auth");

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

async function findOrCreateOAuthUser({ provider, providerId, email, name, avatar }) {
  let user = await queryOne(
    "SELECT * FROM users WHERE oauth_provider=$1 AND oauth_provider_id=$2",
    [provider, providerId]
  );
  if (user) return user;

  user = await queryOne("SELECT * FROM users WHERE email=$1", [email]);
  if (user) {
    await query(
      "UPDATE users SET oauth_provider=$1, oauth_provider_id=$2, avatar=$3 WHERE id=$4",
      [provider, providerId, avatar, user.id]
    );
    return user;
  }

  const [newUser] = await query(
    `INSERT INTO users (name,email,password,plan,credits,oauth_provider,oauth_provider_id,avatar)
     VALUES ($1,$2,'oauth_no_password','free',10,$3,$4,$5) RETURNING *`,
    [name, email, provider, providerId, avatar]
  );
  return newUser;
}

// ─────────────────────────────────────────────────────────────
// GOOGLE — login + auto-connect YouTube channel in one flow
// ─────────────────────────────────────────────────────────────
router.get("/google", (req, res) => {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: [
      "openid email profile",
      "https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube.force-ssl",
    ].join(" "),
    access_type: "offline",
    prompt:      "consent",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get("/google/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${process.env.FRONTEND_URL}?error=no_code`);
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  process.env.GOOGLE_REDIRECT_URI,
        grant_type:    "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error_description);

    // Get Google profile for login
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();
    const user    = await findOrCreateOAuthUser({ provider:"google", providerId:profile.id, email:profile.email, name:profile.name, avatar:profile.picture });

    // Auto-connect YouTube channel if tokens granted
    if (tokens.access_token) {
      try {
        const channelRes = await fetch(
          "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
          { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        );
        const channelData = await channelRes.json();
        const channel = channelData.items?.[0];
        if (channel) {
          const handle    = channel.snippet?.customUrl || channel.snippet?.title || "YouTube Channel";
          const followers = parseInt(channel.statistics?.subscriberCount || 0);
          const videoCount = parseInt(channel.statistics?.videoCount || 0);
          await query(
            `INSERT INTO platform_connections (user_id,platform,handle,access_token,refresh_token,followers,video_count,connected)
             VALUES ($1,'youtube',$2,$3,$4,$5,$6,true)
             ON CONFLICT (user_id,platform) DO UPDATE SET
               handle=$2,access_token=$3,refresh_token=$4,followers=$5,video_count=$6,connected=true,updated_at=NOW()`,
            [user.id, handle, tokens.access_token, tokens.refresh_token || "", followers, videoCount]
          );
        }
      } catch (e) {
        console.warn("YouTube auto-connect failed:", e.message);
      }
    }

    const token = signToken(user.id);
    res.redirect(`${process.env.FRONTEND_URL}/oauth-callback?token=${token}`);
  } catch (err) {
    console.error("Google login error:", err.message);
    res.redirect(`${process.env.FRONTEND_URL}?error=google_failed`);
  }
});

// ─────────────────────────────────────────────────────────────
// FACEBOOK — login + auto-connect Instagram Business account
// ─────────────────────────────────────────────────────────────
router.get("/facebook", (_req, res) => {
  const params = new URLSearchParams({
    client_id:     process.env.INSTAGRAM_CLIENT_ID,  // Facebook App ID
    redirect_uri:  process.env.FACEBOOK_REDIRECT_URI,
    scope:         "email,public_profile",
    response_type: "code",
  });
  res.redirect(`https://www.facebook.com/dialog/oauth?${params}`);
});

router.get("/facebook/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${process.env.FRONTEND_URL}?error=no_code`);
  try {
    // Exchange code for access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        client_id:     process.env.INSTAGRAM_CLIENT_ID,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        redirect_uri:  process.env.FACEBOOK_REDIRECT_URI,
        code,
      })
    );
    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error.message);

    // Get Facebook profile for login
    const profileRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture&access_token=${tokens.access_token}`
    );
    const profile = await profileRes.json();
    const user = await findOrCreateOAuthUser({
      provider:   "facebook",
      providerId: profile.id,
      email:      profile.email || `fb_${profile.id}@noemail.com`,
      name:       profile.name,
      avatar:     profile.picture?.data?.url || null,
    });

    const token = signToken(user.id);
    res.redirect(`${process.env.FRONTEND_URL}/oauth-callback?token=${token}`);
  } catch (err) {
    console.error("Facebook login error:", err.message);
    res.redirect(`${process.env.FRONTEND_URL}?error=facebook_failed`);
  }
});

// ─────────────────────────────────────────────────────────────
// YOUTUBE — connect their channel for posting & analytics
// ─────────────────────────────────────────────────────────────
router.get("/youtube", requireAuth, (req, res) => {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  process.env.YOUTUBE_REDIRECT_URI,
    response_type: "code",
    scope:         [
      "https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube.force-ssl",
    ].join(" "),
    access_type: "offline",
    prompt:      "consent",
    state:       Buffer.from(JSON.stringify({ userId: req.user.id })).toString("base64url"),
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get("/youtube/callback", async (req, res) => {
  const { code, state: rawState } = req.query;
  if (!code) return res.redirect(`${process.env.FRONTEND_URL}/platforms?error=cancelled`);

  // State is either a plain userId (old YouTube flow) or base64url JSON {userId, isShorts}
  let userId, isShorts = false;
  try {
    const parsed = JSON.parse(Buffer.from(rawState, "base64url").toString());
    userId   = parsed.userId;
    isShorts = !!parsed.isShorts;
  } catch {
    userId   = rawState; // plain string from the original YouTube route
    isShorts = false;
  }

  const platform = isShorts ? "youtube_shorts" : "youtube";

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  process.env.YOUTUBE_REDIRECT_URI,
        grant_type:    "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error_description);

    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const channelData = await channelRes.json();
    const channel     = channelData.items?.[0];
    const handle      = channel?.snippet?.customUrl || channel?.snippet?.title || (isShorts ? "YouTube Shorts Channel" : "YouTube Channel");
    const followers   = parseInt(channel?.statistics?.subscriberCount || 0);
    const videoCount  = parseInt(channel?.statistics?.videoCount || 0);

    await query(
      `INSERT INTO platform_connections (user_id,platform,handle,access_token,refresh_token,followers,video_count,connected)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)
       ON CONFLICT (user_id,platform) DO UPDATE SET
         handle=$3,access_token=$4,refresh_token=$5,followers=$6,video_count=$7,connected=true,updated_at=NOW()`,
      [userId, platform, handle, tokens.access_token, tokens.refresh_token || "", followers, videoCount]
    );
    res.redirect(`${process.env.FRONTEND_URL}/platforms?connected=${platform}`);
  } catch (err) {
    console.error("YouTube connect error:", err.message);
    res.redirect(`${process.env.FRONTEND_URL}/platforms?error=${platform}_failed`);
  }
});

// ─────────────────────────────────────────────────────────────
// YOUTUBE SHORTS — reuses the same registered redirect URI as YouTube
// but passes isShorts=true in state so the callback stores it separately.
// No extra redirect URI needs to be registered in Google Cloud Console.
// ─────────────────────────────────────────────────────────────
router.get("/youtube_shorts", requireAuth, (req, res) => {
  const state = Buffer.from(JSON.stringify({ userId: req.user.id, isShorts: true })).toString("base64url");
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  process.env.YOUTUBE_REDIRECT_URI,   // same registered URI
    response_type: "code",
    scope:         [
      "https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube.force-ssl",
    ].join(" "),
    access_type: "offline",
    prompt:      "consent",
    state,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// ─────────────────────────────────────────────────────────────
// TIKTOK — connect for posting & analytics (PKCE required by v2 API)
// ─────────────────────────────────────────────────────────────
router.get("/tiktok", requireAuth, (req, res) => {
  const codeVerifier  = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

  // Pack userId + verifier into state so the callback can retrieve them
  const state = Buffer.from(JSON.stringify({ userId: req.user.id, cv: codeVerifier })).toString("base64url");

  const params = new URLSearchParams({
    client_key:            process.env.TIKTOK_CLIENT_ID,
    redirect_uri:          process.env.TIKTOK_REDIRECT_URI,
    response_type:         "code",
    scope:                 "user.info.basic,video.list,video.upload,video.publish",
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: "S256",
  });
  res.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params}`);
});

router.get("/tiktok/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.redirect(`${process.env.FRONTEND_URL}/platforms?error=cancelled`);

  let userId, codeVerifier;
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString());
    userId       = parsed.userId;
    codeVerifier = parsed.cv;
  } catch {
    return res.redirect(`${process.env.FRONTEND_URL}/platforms?error=invalid_state`);
  }

  try {
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key:    process.env.TIKTOK_CLIENT_ID,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type:    "authorization_code",
        redirect_uri:  process.env.TIKTOK_REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    const userRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=display_name,follower_count,video_count",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const userData = await userRes.json();
    const profile  = userData.data?.user || {};

    await query(
      `INSERT INTO platform_connections (user_id,platform,handle,access_token,refresh_token,followers,video_count,connected)
       VALUES ($1,'tiktok',$2,$3,$4,$5,$6,true)
       ON CONFLICT (user_id,platform) DO UPDATE SET
         handle=$2,access_token=$3,refresh_token=$4,followers=$5,video_count=$6,connected=true,updated_at=NOW()`,
      [userId, profile.display_name || "TikTok Account", tokens.access_token, tokens.refresh_token || "", profile.follower_count || 0, profile.video_count || 0]
    );
    res.redirect(`${process.env.FRONTEND_URL}/platforms?connected=tiktok`);
  } catch (err) {
    console.error("TikTok connect error:", err.message);
    res.redirect(`${process.env.FRONTEND_URL}/platforms?error=tiktok_failed`);
  }
});

// ─────────────────────────────────────────────────────────────
// INSTAGRAM — via Facebook Graph API (Basic Display API deprecated Dec 2024)
// Requires: Facebook app with instagram_basic + instagram_content_publish
// The user must have an Instagram Business/Creator account linked to a FB Page
// ─────────────────────────────────────────────────────────────
router.get("/instagram", requireAuth, (req, res) => {
  const params = new URLSearchParams({
    client_id:     process.env.INSTAGRAM_CLIENT_ID,   // Facebook App ID
    redirect_uri:  process.env.INSTAGRAM_REDIRECT_URI,
    scope:         "pages_show_list,instagram_basic,instagram_content_publish",
    response_type: "code",
    state:         req.user.id,
  });
  res.redirect(`https://www.facebook.com/dialog/oauth?${params}`);
});

router.get("/instagram/callback", async (req, res) => {
  const { code, state: userId } = req.query;
  if (!code) return res.redirect(`${process.env.FRONTEND_URL}/platforms?error=cancelled`);
  try {
    // Exchange code for user access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        client_id:     process.env.INSTAGRAM_CLIENT_ID,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        redirect_uri:  process.env.INSTAGRAM_REDIRECT_URI,
        code,
      })
    );
    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error.message);

    // Get user's Facebook Pages (Instagram accounts are linked through Pages)
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${tokens.access_token}`
    );
    const pagesData = await pagesRes.json();
    if (!pagesData.data?.length) throw new Error("No Facebook Pages found. Connect a Page linked to your Instagram Business account.");

    // Find the first Page with a linked Instagram Business account
    let igHandle = null, igMediaCount = 0, igFollowers = 0, igToken = tokens.access_token;

    for (const page of pagesData.data) {
      const igRes = await fetch(
        `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
      );
      const igData = await igRes.json();
      if (!igData.instagram_business_account) continue;

      const igId = igData.instagram_business_account.id;
      const profileRes = await fetch(
        `https://graph.facebook.com/v19.0/${igId}?fields=username,media_count,followers_count&access_token=${page.access_token}`
      );
      const profile = await profileRes.json();
      igHandle     = `@${profile.username}`;
      igMediaCount = profile.media_count    || 0;
      igFollowers  = profile.followers_count || 0;
      igToken      = page.access_token;
      break;
    }

    if (!igHandle) throw new Error("No Instagram Business account linked to your Facebook Pages.");

    await query(
      `INSERT INTO platform_connections (user_id,platform,handle,access_token,followers,video_count,connected)
       VALUES ($1,'instagram',$2,$3,$4,$5,true)
       ON CONFLICT (user_id,platform) DO UPDATE SET
         handle=$2,access_token=$3,followers=$4,video_count=$5,connected=true,updated_at=NOW()`,
      [userId, igHandle, igToken, igFollowers, igMediaCount]
    );
    res.redirect(`${process.env.FRONTEND_URL}/platforms?connected=instagram`);
  } catch (err) {
    console.error("Instagram connect error:", err.message);
    const msg = encodeURIComponent(err.message);
    res.redirect(`${process.env.FRONTEND_URL}/platforms?error=instagram_failed&detail=${msg}`);
  }
});

module.exports = router;
