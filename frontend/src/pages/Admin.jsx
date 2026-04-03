import { useState, useEffect, useCallback } from "react";
import { getToken } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function req(method, path, body) {
  return fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

// ── Service catalogue ──────────────────────────────────────────
const SERVICES = [
  { name: "Anthropic (Claude AI)",  category: "AI",       pricing: "~$3–15 / 1M tokens",  free: "No free tier",            url: "https://console.anthropic.com",    icon: "🤖", envKey: "ANTHROPIC_API_KEY" },
  { name: "Replicate (SadTalker)",  category: "AI",       pricing: "$0.001–0.05 / run",    free: "Pay per use",             url: "https://replicate.com/billing",    icon: "🎭", envKey: "REPLICATE_API_TOKEN" },
  { name: "ElevenLabs (TTS)",       category: "AI",       pricing: "$1 / 10k chars",       free: "10k chars/month",         url: "https://elevenlabs.io/subscription", icon: "🎙️", envKey: "ELEVENLABS_API_KEY" },
  { name: "Google / YouTube API",   category: "Platform", pricing: "Free (quota limits)",  free: "Free with limits",        url: "https://console.cloud.google.com", icon: "▶", envKey: "GOOGLE_CLIENT_ID" },
  { name: "TikTok API",             category: "Platform", pricing: "Free",                 free: "Free",                    url: "https://developers.tiktok.com",    icon: "♪", envKey: "TIKTOK_CLIENT_ID" },
  { name: "Meta / Instagram API",   category: "Platform", pricing: "Free",                 free: "Free",                    url: "https://developers.facebook.com",  icon: "◈", envKey: "INSTAGRAM_CLIENT_ID" },
  { name: "PayPal",                 category: "Payments", pricing: "2.9% + $0.30 / txn",  free: "No monthly fee",          url: "https://developer.paypal.com",     icon: "💳", envKey: "PAYPAL_CLIENT_ID" },
  { name: "Resend (Email)",         category: "Email",    pricing: "$20/mo for 50k emails",free: "3k emails/month free",    url: "https://resend.com/pricing",       icon: "📧", envKey: "RESEND_API_KEY" },
  { name: "Railway (Hosting)",      category: "Infra",    pricing: "$5–20/month",          free: "$5 credit/month",         url: "https://railway.app",              icon: "🚂", envKey: null },
  { name: "PostgreSQL (Railway)",   category: "Infra",    pricing: "Included in Railway",  free: "Included",                url: "https://railway.app",              icon: "🗄️", envKey: null },
];

const HEALTH_LABELS = {
  anthropic:  "Anthropic",
  google:     "Google OAuth",
  youtube:    "YouTube API",
  tiktok:     "TikTok",
  meta:       "Meta / Instagram",
  replicate:  "Replicate",
  elevenlabs: "ElevenLabs",
  paypal:     "PayPal",
  resend:     "Resend",
};

const FLAG_LABELS = {
  ai_generation:     "AI Generation (Claude)",
  youtube_upload:    "YouTube Upload & Schedule",
  tiktok_posting:    "TikTok Posting",
  instagram_posting: "Instagram Posting",
  avatar_studio:     "AI Avatar Studio",
  email_verify:      "Email Verification",
  paypal_payments:   "PayPal Payments",
};

export default function Admin({ user }) {
  const [tab,      setTab]      = useState("overview");
  const [stats,    setStats]    = useState(null);
  const [health,   setHealth]   = useState(null);
  const [flags,    setFlags]    = useState([]);
  const [checking, setChecking] = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [editUser, setEditUser] = useState(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    const [s, f] = await Promise.all([
      req("GET", "/api/admin/stats").catch(() => null),
      req("GET", "/api/admin/flags").catch(() => ({ flags: [] })),
    ]);
    setStats(s);
    setFlags(f.flags || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const checkHealth = async () => {
    setChecking(true);
    const h = await req("GET", "/api/admin/health").catch(() => null);
    setHealth(h);
    setChecking(false);
  };

  const toggleFlag = async (key, enabled) => {
    setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled } : f));
    await req("PATCH", `/api/admin/flags/${key}`, { enabled });
  };

  const updateUser = async (id, patch) => {
    await req("PATCH", `/api/admin/users/${id}`, patch);
    await loadStats();
    setEditUser(null);
  };

  if (!user?.is_admin) return (
    <div style={{ textAlign:"center", padding:80, color:"#7070A0" }}>
      <div style={{ fontSize:48 }}>🔒</div>
      <div style={{ fontSize:18, marginTop:16 }}>Admin access required</div>
    </div>
  );

  const S = { card: { background:"#0F0F2A", border:"1px solid #2A2A50", borderRadius:16, padding:24 } };

  const Stat = ({ label, value, sub, color="#F5F5FF" }) => (
    <div style={{ ...S.card, flex:1 }}>
      <div style={{ fontSize:11, color:"#7878A8", textTransform:"uppercase", letterSpacing:".09em", marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:800, color, lineHeight:1 }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize:12, color:"#5A5A88", marginTop:6 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      <div>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em" }}>Admin Dashboard</h1>
        <p style={{ color:"#9090B8", fontSize:14, marginTop:4 }}>Platform health, users, services, and feature controls</p>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, background:"#0A0A20", padding:4, borderRadius:13, border:"1px solid #1E1E40", width:"fit-content" }}>
        {["overview","users","health","services","flags"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:"9px 20px", borderRadius:10, border:"none", cursor:"pointer",
            background: tab===t ? "#7C5CFC" : "transparent",
            color: tab===t ? "#fff" : "#6060A0",
            fontWeight: tab===t ? 700 : 400, fontSize:13,
            transition:"all .15s", textTransform:"capitalize",
          }}>{t}</button>
        ))}
      </div>

      {loading && tab !== "health" && tab !== "services" && (
        <div style={{ color:"#7070A0", padding:40, textAlign:"center" }}>Loading…</div>
      )}

      {/* ── OVERVIEW ── */}
      {tab === "overview" && stats && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {/* User stats */}
          <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
            <Stat label="Total Users"    value={stats.userStats?.total}    sub="all time" />
            <Stat label="Today"          value={stats.userStats?.today}    sub="new signups" color="#22C55E" />
            <Stat label="This Week"      value={stats.userStats?.week}     sub="new signups" color="#A78BFA" />
            <Stat label="This Month"     value={stats.userStats?.month}    sub="new signups" color="#60A5FA" />
            <Stat label="Verified"       value={stats.userStats?.verified} sub="email verified" />
            <Stat label="OAuth Users"    value={stats.userStats?.oauth_users} sub="Google/Meta login" />
          </div>

          {/* Plan breakdown + AI + Scheduled */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
            <div style={S.card}>
              <div style={{ fontSize:13, fontWeight:700, color:"#E0E0F8", marginBottom:14 }}>Plan Breakdown</div>
              {(stats.planBreakdown || []).map(p => (
                <div key={p.plan} style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ fontSize:13, color:"#9090C0", textTransform:"capitalize" }}>{p.plan}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#E0E0F8" }}>{p.count}</span>
                </div>
              ))}
            </div>
            <div style={S.card}>
              <div style={{ fontSize:13, fontWeight:700, color:"#E0E0F8", marginBottom:14 }}>AI Usage (30d)</div>
              {[
                { label:"Total Requests", value: stats.aiUsage?.total_requests },
                { label:"Tokens Used",    value: parseInt(stats.aiUsage?.total_tokens||0).toLocaleString() },
                { label:"Credits Used",   value: stats.aiUsage?.total_credits },
              ].map(r => (
                <div key={r.label} style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ fontSize:13, color:"#9090C0" }}>{r.label}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#E0E0F8" }}>{r.value ?? "—"}</span>
                </div>
              ))}
            </div>
            <div style={S.card}>
              <div style={{ fontSize:13, fontWeight:700, color:"#E0E0F8", marginBottom:14 }}>Scheduled Posts</div>
              {[
                { label:"Pending",   value: stats.scheduledStats?.pending,   color:"#F59E0B" },
                { label:"Published", value: stats.scheduledStats?.published, color:"#22C55E" },
                { label:"Failed",    value: stats.scheduledStats?.failed,    color:"#EF4444" },
              ].map(r => (
                <div key={r.label} style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ fontSize:13, color:"#9090C0" }}>{r.label}</span>
                  <span style={{ fontSize:13, fontWeight:700, color: r.color }}>{r.value ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Platform connections */}
          <div style={S.card}>
            <div style={{ fontSize:13, fontWeight:700, color:"#E0E0F8", marginBottom:14 }}>Connected Platforms</div>
            <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
              {(stats.platformStats || []).map(p => (
                <div key={p.platform} style={{ background:"#0A0A20", border:"1px solid #1E1E40", borderRadius:10, padding:"10px 18px", display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:13, color:"#C0C0E0", textTransform:"capitalize" }}>{p.platform}</span>
                  <span style={{ fontSize:16, fontWeight:800, color:"#A78BFA" }}>{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── USERS ── */}
      {tab === "users" && stats && (
        <div style={S.card}>
          <div style={{ fontSize:13, fontWeight:700, color:"#E0E0F8", marginBottom:16 }}>Recent Signups</div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid #1E1E40" }}>
                  {["Name","Email","Plan","Verified","Login","Joined","Actions"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"8px 12px", color:"#7878A8", fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:".07em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(stats.recentUsers || []).map(u => (
                  <tr key={u.id} style={{ borderBottom:"1px solid #10102A" }}>
                    <td style={{ padding:"10px 12px", color:"#E0E0F0" }}>{u.name}</td>
                    <td style={{ padding:"10px 12px", color:"#9090C0" }}>{u.email}</td>
                    <td style={{ padding:"10px 12px" }}>
                      <span style={{ background: u.plan==="free"?"#1E1E40":"#7C5CFC22", color: u.plan==="free"?"#6060A0":"#B09FFF", padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:600 }}>
                        {u.plan}
                      </span>
                    </td>
                    <td style={{ padding:"10px 12px" }}>
                      <span style={{ color: u.email_verified ? "#22C55E" : "#F59E0B", fontSize:12 }}>
                        {u.email_verified ? "✓ Yes" : "⚠ No"}
                      </span>
                    </td>
                    <td style={{ padding:"10px 12px", color:"#7070A0", fontSize:12 }}>{u.oauth_provider || "email"}</td>
                    <td style={{ padding:"10px 12px", color:"#7070A0", fontSize:12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ padding:"10px 12px" }}>
                      <button onClick={() => setEditUser(u)} style={{ padding:"4px 10px", background:"#7C5CFC22", border:"1px solid #7C5CFC44", borderRadius:7, color:"#B09FFF", cursor:"pointer", fontSize:11 }}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Edit user modal */}
          {editUser && (
            <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ background:"#0F0F2A", border:"1px solid #3A2A8A", borderRadius:18, padding:32, width:380 }}>
                <div style={{ fontSize:16, fontWeight:700, color:"#F5F5FF", marginBottom:20 }}>Edit {editUser.name}</div>
                {[
                  { label:"Plan", key:"plan", type:"select", options:["free","creator","pro","business","max"] },
                  { label:"Credits", key:"credits", type:"number" },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom:14 }}>
                    <div style={{ fontSize:12, color:"#7878A8", marginBottom:5 }}>{f.label}</div>
                    {f.type === "select"
                      ? <select defaultValue={editUser[f.key]} id={`eu-${f.key}`} style={{ width:"100%", background:"#0C0C24", border:"1px solid #2A2A50", borderRadius:8, color:"#E8E8FC", padding:"9px 12px", fontSize:14 }}>
                          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      : <input type={f.type} defaultValue={editUser[f.key]} id={`eu-${f.key}`} style={{ width:"100%", background:"#0C0C24", border:"1px solid #2A2A50", borderRadius:8, color:"#E8E8FC", padding:"9px 12px", fontSize:14, outline:"none" }} />
                    }
                  </div>
                ))}
                <div style={{ display:"flex", gap:10, marginTop:20 }}>
                  <button onClick={() => {
                    const plan    = document.getElementById("eu-plan").value;
                    const credits = parseInt(document.getElementById("eu-credits").value);
                    updateUser(editUser.id, { plan, credits });
                  }} style={{ flex:1, padding:"11px", background:"linear-gradient(135deg,#7C5CFC,#B45AFD)", border:"none", borderRadius:10, color:"#fff", fontWeight:700, cursor:"pointer" }}>
                    Save
                  </button>
                  <button onClick={() => setEditUser(null)} style={{ padding:"11px 16px", background:"transparent", border:"1px solid #2A2A50", borderRadius:10, color:"#8888B8", cursor:"pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HEALTH ── */}
      {tab === "health" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <button onClick={checkHealth} disabled={checking} style={{ padding:"11px 24px", background:"linear-gradient(135deg,#7C5CFC,#B45AFD)", border:"none", borderRadius:11, color:"#fff", fontWeight:700, cursor:"pointer", fontSize:13, opacity:checking?.7:1 }}>
              {checking ? "Checking…" : "Run Health Check"}
            </button>
            {health?.checkedAt && <span style={{ fontSize:12, color:"#5A5A88" }}>Last checked: {new Date(health.checkedAt).toLocaleTimeString()}</span>}
          </div>

          {health && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {health.results.map(r => (
                <div key={r.service} style={{ ...S.card, display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:12, height:12, borderRadius:"50%", background: r.ok ? "#22C55E" : "#EF4444", flexShrink:0, boxShadow: r.ok ? "0 0 8px #22C55E88" : "0 0 8px #EF444488" }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#E0E0F0" }}>{HEALTH_LABELS[r.service] || r.service}</div>
                    <div style={{ fontSize:11, color: r.ok ? "#22C55E" : "#EF4444", marginTop:2 }}>
                      {r.ok ? "Online" : "Unreachable"} {r.status ? `(${r.status})` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!health && !checking && (
            <div style={{ ...S.card, textAlign:"center", color:"#5A5A88", padding:48 }}>
              Click "Run Health Check" to ping all external APIs
            </div>
          )}
        </div>
      )}

      {/* ── SERVICES ── */}
      {tab === "services" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {["AI","Platform","Payments","Email","Infra"].map(cat => (
            <div key={cat}>
              <div style={{ fontSize:11, color:"#7878A8", textTransform:"uppercase", letterSpacing:".09em", marginBottom:8, marginTop:8 }}>{cat}</div>
              {SERVICES.filter(s => s.category === cat).map(s => (
                <div key={s.name} style={{ ...S.card, display:"flex", alignItems:"center", gap:16, marginBottom:8, padding:"16px 20px" }}>
                  <span style={{ fontSize:22, flexShrink:0 }}>{s.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#E0E0F0" }}>{s.name}</div>
                    <div style={{ fontSize:12, color:"#7070A0", marginTop:3 }}>
                      <span style={{ color:"#B09FFF" }}>{s.pricing}</span>
                      <span style={{ margin:"0 8px", color:"#2A2A50" }}>·</span>
                      <span style={{ color:"#22C55E88" }}>{s.free}</span>
                    </div>
                  </div>
                  <a href={s.url} target="_blank" rel="noreferrer" style={{ padding:"7px 16px", background:"#7C5CFC18", border:"1px solid #7C5CFC33", borderRadius:8, color:"#B09FFF", textDecoration:"none", fontSize:12, fontWeight:600, flexShrink:0 }}>
                    Dashboard →
                  </a>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── FLAGS ── */}
      {tab === "flags" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ fontSize:13, color:"#7070A0", marginBottom:6 }}>
            Toggle features on/off instantly without redeploying. Takes effect immediately for all users.
          </div>
          {flags.map(f => (
            <div key={f.key} style={{ ...S.card, display:"flex", alignItems:"center", gap:16, padding:"16px 22px" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600, color:"#E0E0F0" }}>{FLAG_LABELS[f.key] || f.key}</div>
                <div style={{ fontSize:11, color:"#5A5A88", marginTop:3 }}>key: {f.key} · updated: {new Date(f.updated_at).toLocaleString()}</div>
              </div>
              <div
                onClick={() => toggleFlag(f.key, !f.enabled)}
                style={{
                  width:48, height:26, borderRadius:13, cursor:"pointer", flexShrink:0,
                  background: f.enabled ? "linear-gradient(135deg,#7C5CFC,#B45AFD)" : "#1E1E40",
                  position:"relative", transition:"background .2s",
                  boxShadow: f.enabled ? "0 0 12px rgba(124,92,252,0.4)" : "none",
                }}
              >
                <div style={{
                  position:"absolute", top:3,
                  left: f.enabled ? 26 : 4,
                  width:20, height:20, borderRadius:"50%", background:"#fff",
                  transition:"left .2s", boxShadow:"0 1px 4px rgba(0,0,0,0.4)",
                }} />
              </div>
              <span style={{ fontSize:12, fontWeight:600, color: f.enabled ? "#22C55E" : "#EF4444", minWidth:44 }}>
                {f.enabled ? "ON" : "OFF"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
