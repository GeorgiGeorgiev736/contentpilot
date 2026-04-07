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

const SERVICES = [
  { name:"Anthropic (Claude AI)", category:"AI",       pricing:"~$3–15 / 1M tokens",   free:"No free tier",         url:"https://console.anthropic.com",      icon:"⬡", envKey:"ANTHROPIC_API_KEY" },
  { name:"Replicate (SadTalker)", category:"AI",       pricing:"$0.001–0.05 / run",     free:"Pay per use",          url:"https://replicate.com/billing",      icon:"◉", envKey:"REPLICATE_API_TOKEN" },
  { name:"ElevenLabs (TTS)",      category:"AI",       pricing:"$1 / 10k chars",        free:"10k chars/month",      url:"https://elevenlabs.io/subscription", icon:"▸", envKey:"ELEVENLABS_API_KEY" },
  { name:"Google / YouTube API",  category:"Platform", pricing:"Free (quota limits)",   free:"Free with limits",     url:"https://console.cloud.google.com",   icon:"▶", envKey:"GOOGLE_CLIENT_ID" },
  { name:"TikTok API",            category:"Platform", pricing:"Free",                  free:"Free",                 url:"https://developers.tiktok.com",      icon:"◈", envKey:"TIKTOK_CLIENT_ID" },
  { name:"Meta / Instagram API",  category:"Platform", pricing:"Free",                  free:"Free",                 url:"https://developers.facebook.com",    icon:"⬡", envKey:"INSTAGRAM_CLIENT_ID" },
  { name:"PayPal",                category:"Payments", pricing:"2.9% + $0.30 / txn",   free:"No monthly fee",       url:"https://developer.paypal.com",       icon:"◎", envKey:"PAYPAL_CLIENT_ID" },
  { name:"Resend (Email)",        category:"Email",    pricing:"$20/mo for 50k emails", free:"3k emails/month free", url:"https://resend.com/pricing",         icon:"✦", envKey:"RESEND_API_KEY" },
  { name:"Railway (Hosting)",     category:"Infra",    pricing:"$5–20/month",           free:"$5 credit/month",      url:"https://railway.app",                icon:"⊞", envKey:null },
  { name:"PostgreSQL (Railway)",  category:"Infra",    pricing:"Included in Railway",   free:"Included",             url:"https://railway.app",                icon:"▦", envKey:null },
];

const HEALTH_LABELS = {
  anthropic:"Anthropic", google:"Google OAuth", youtube:"YouTube API",
  tiktok:"TikTok", meta:"Meta / Instagram", replicate:"Replicate",
  elevenlabs:"ElevenLabs", paypal:"PayPal", resend:"Resend",
};

const FLAG_LABELS = {
  ai_generation:"AI Generation (Claude)", youtube_upload:"YouTube Upload & Schedule",
  tiktok_posting:"TikTok Posting", instagram_posting:"Instagram Posting",
  avatar_studio:"AI Avatar Studio", email_verify:"Email Verification",
  paypal_payments:"PayPal Payments",
};

const CAT_COLORS = { AI:"#40A0C0", Platform:"#50B8A0", Payments:"#C060A0", Email:"#60C8D8", Infra:"#888" };

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
    <div style={{ textAlign:"center", padding:80, color:"#555" }}>
      <div style={{ fontSize:32, color:"#333", marginBottom:16 }}>⬡</div>
      <div style={{ fontSize:18, fontFamily:"'DM Mono',monospace", color:"#555" }}>// access_denied</div>
    </div>
  );

  const card = { background:"#141414", border:"1px solid #222", borderRadius:14, padding:22 };

  const Stat = ({ label, value, sub, color="#fff" }) => (
    <div style={{ ...card, flex:1, minWidth:120 }}>
      <div style={{ fontSize:10, color:"#444", textTransform:"uppercase", letterSpacing:".15em", fontWeight:700, marginBottom:10, fontFamily:"'DM Mono',monospace" }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:900, color, lineHeight:1, letterSpacing:"-.04em" }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize:11, color:"#555", marginTop:6 }}>{sub}</div>}
    </div>
  );

  const TABS = ["overview","users","health","services","flags"];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      <div>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#fff", letterSpacing:"-.04em", fontFamily:"'DM Mono',monospace" }}>
          <span style={{ color:"#40A0C0", fontWeight:400 }}>/</span> Admin_Dashboard
        </h1>
        <p style={{ color:"#666", fontSize:14, marginTop:4 }}>Platform health, users, services, and feature controls</p>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:2, background:"#0a0a0a", padding:3, borderRadius:11, border:"1px solid #1a1a1a", width:"fit-content" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:"8px 18px", borderRadius:9, border:"none", cursor:"pointer",
            background: tab===t ? "#fff" : "transparent",
            color: tab===t ? "#000" : "#555",
            fontWeight: tab===t ? 800 : 400, fontSize:13,
            transition:"none", textTransform:"capitalize",
            fontFamily:"'DM Mono',monospace", letterSpacing:".02em",
          }}>{t}</button>
        ))}
      </div>

      {loading && tab !== "health" && tab !== "services" && (
        <div style={{ color:"#444", padding:40, textAlign:"center", fontFamily:"'DM Mono',monospace", fontSize:13 }}>// loading…</div>
      )}

      {/* ── OVERVIEW ── */}
      {tab === "overview" && stats && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <Stat label="Total Users"  value={stats.userStats?.total}       sub="all time" />
            <Stat label="Today"        value={stats.userStats?.today}       sub="new signups"    color="#22C55E" />
            <Stat label="This Week"    value={stats.userStats?.week}        sub="new signups"    color="#40A0C0" />
            <Stat label="This Month"   value={stats.userStats?.month}       sub="new signups"    color="#60C8D8" />
            <Stat label="Verified"     value={stats.userStats?.verified}    sub="email verified" />
            <Stat label="OAuth Users"  value={stats.userStats?.oauth_users} sub="Google/Meta"    color="#C060A0" />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            <div style={card}>
              <div style={{ fontSize:11, color:"#555", textTransform:"uppercase", letterSpacing:".12em", fontWeight:700, marginBottom:14, fontFamily:"'DM Mono',monospace" }}>Plan Breakdown</div>
              {(stats.planBreakdown || []).map(p => (
                <div key={p.plan} style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ fontSize:13, color:"#777", textTransform:"capitalize" }}>{p.plan}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#e0e0e0" }}>{p.count}</span>
                </div>
              ))}
            </div>
            <div style={card}>
              <div style={{ fontSize:11, color:"#555", textTransform:"uppercase", letterSpacing:".12em", fontWeight:700, marginBottom:14, fontFamily:"'DM Mono',monospace" }}>AI Usage (30d)</div>
              {[
                { label:"Total Requests", value:stats.aiUsage?.total_requests },
                { label:"Tokens Used",    value:parseInt(stats.aiUsage?.total_tokens||0).toLocaleString() },
                { label:"Credits Used",   value:stats.aiUsage?.total_credits },
              ].map(r => (
                <div key={r.label} style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ fontSize:13, color:"#777" }}>{r.label}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#e0e0e0" }}>{r.value ?? "—"}</span>
                </div>
              ))}
            </div>
            <div style={card}>
              <div style={{ fontSize:11, color:"#555", textTransform:"uppercase", letterSpacing:".12em", fontWeight:700, marginBottom:14, fontFamily:"'DM Mono',monospace" }}>Scheduled Posts</div>
              {[
                { label:"Pending",   value:stats.scheduledStats?.pending,   color:"#F59E0B" },
                { label:"Published", value:stats.scheduledStats?.published, color:"#22C55E" },
                { label:"Failed",    value:stats.scheduledStats?.failed,    color:"#EF4444" },
              ].map(r => (
                <div key={r.label} style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ fontSize:13, color:"#777" }}>{r.label}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:r.color }}>{r.value ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize:11, color:"#555", textTransform:"uppercase", letterSpacing:".12em", fontWeight:700, marginBottom:14, fontFamily:"'DM Mono',monospace" }}>Connected Platforms</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {(stats.platformStats || []).map(p => (
                <div key={p.platform} style={{ background:"#0e0e0e", border:"1px solid #1e1e1e", borderRadius:9, padding:"8px 16px", display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:13, color:"#aaa", textTransform:"capitalize" }}>{p.platform}</span>
                  <span style={{ fontSize:16, fontWeight:900, color:"#40A0C0" }}>{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── USERS ── */}
      {tab === "users" && stats && (
        <div style={card}>
          <div style={{ fontSize:11, color:"#555", textTransform:"uppercase", letterSpacing:".12em", fontWeight:700, marginBottom:16, fontFamily:"'DM Mono',monospace" }}>Recent Signups</div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid #1e1e1e" }}>
                  {["Name","Email","Plan","Verified","Login","Joined","Actions"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"8px 12px", color:"#444", fontWeight:700, fontSize:10, textTransform:"uppercase", letterSpacing:".1em", fontFamily:"'DM Mono',monospace" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(stats.recentUsers || []).map(u => (
                  <tr key={u.id} style={{ borderBottom:"1px solid #111" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#111"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"10px 12px", color:"#e0e0e0" }}>{u.name}</td>
                    <td style={{ padding:"10px 12px", color:"#666" }}>{u.email}</td>
                    <td style={{ padding:"10px 12px" }}>
                      <span style={{ background:u.plan==="free"?"#1a1a1a":"rgba(64,160,192,0.1)", color:u.plan==="free"?"#555":"#40A0C0", padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700, border:`1px solid ${u.plan==="free"?"#222":"rgba(64,160,192,0.2)"}` }}>
                        {u.plan}
                      </span>
                    </td>
                    <td style={{ padding:"10px 12px" }}>
                      <span style={{ color:u.email_verified?"#22C55E":"#F59E0B", fontSize:12, fontFamily:"'DM Mono',monospace" }}>
                        {u.email_verified ? "✓ yes" : "⚠ no"}
                      </span>
                    </td>
                    <td style={{ padding:"10px 12px", color:"#555", fontSize:12, fontFamily:"'DM Mono',monospace" }}>{u.oauth_provider || "email"}</td>
                    <td style={{ padding:"10px 12px", color:"#555", fontSize:12, fontFamily:"'DM Mono',monospace" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ padding:"10px 12px" }}>
                      <button onClick={()=>setEditUser(u)} className="btn-ghost" style={{ padding:"4px 12px", fontSize:11 }}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editUser && (
            <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ background:"#141414", border:"1px solid #2a2a2a", borderRadius:18, padding:32, width:380 }}>
                <div style={{ fontSize:16, fontWeight:700, color:"#fff", marginBottom:6, fontFamily:"'DM Mono',monospace" }}>
                  <span style={{ color:"#40A0C0" }}>/</span> edit_user
                </div>
                <div style={{ fontSize:13, color:"#555", marginBottom:20 }}>{editUser.email}</div>
                {[
                  { label:"Plan", key:"plan", type:"select", options:["free","creator","pro","business","max"] },
                  { label:"Credits", key:"credits", type:"number" },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, color:"#555", marginBottom:6, textTransform:"uppercase", letterSpacing:".1em", fontFamily:"'DM Mono',monospace" }}>{f.label}</div>
                    {f.type === "select"
                      ? <select defaultValue={editUser[f.key]} id={`eu-${f.key}`} className="inp">
                          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      : <input type={f.type} defaultValue={editUser[f.key]} id={`eu-${f.key}`} className="inp"/>
                    }
                  </div>
                ))}
                <div style={{ display:"flex", gap:10, marginTop:20 }}>
                  <button onClick={() => {
                    const plan    = document.getElementById("eu-plan").value;
                    const credits = parseInt(document.getElementById("eu-credits").value);
                    updateUser(editUser.id, { plan, credits });
                  }} className="btn-primary" style={{ flex:1, padding:"11px" }}>Save Changes</button>
                  <button onClick={()=>setEditUser(null)} className="btn-ghost" style={{ padding:"11px 16px" }}>Cancel</button>
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
            <button onClick={checkHealth} disabled={checking} className="btn-primary" style={{ padding:"11px 24px", fontSize:13, opacity:checking?0.5:1 }}>
              {checking ? "// checking…" : "Run Health Check"}
            </button>
            {health?.checkedAt && <span style={{ fontSize:12, color:"#444", fontFamily:"'DM Mono',monospace" }}>// last checked: {new Date(health.checkedAt).toLocaleTimeString()}</span>}
          </div>

          {health && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {health.results.map(r => (
                <div key={r.service} style={{ ...card, display:"flex", alignItems:"center", gap:14, borderLeft:`2px solid ${r.ok?"#22C55E":"#EF4444"}` }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:r.ok?"#22C55E":"#EF4444", flexShrink:0, boxShadow:r.ok?"0 0 8px #22C55E88":"0 0 8px #EF444488" }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#e0e0e0" }}>{HEALTH_LABELS[r.service] || r.service}</div>
                    <div style={{ fontSize:11, color:r.ok?"#22C55E":"#EF4444", marginTop:2, fontFamily:"'DM Mono',monospace" }}>
                      {r.ok ? "online" : "unreachable"} {r.status ? `(${r.status})` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!health && !checking && (
            <div style={{ ...card, textAlign:"center", color:"#333", padding:48, fontFamily:"'DM Mono',monospace", fontSize:13 }}>
              // click "Run Health Check" to ping all external APIs
            </div>
          )}
        </div>
      )}

      {/* ── SERVICES ── */}
      {tab === "services" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {["AI","Platform","Payments","Email","Infra"].map(cat => (
            <div key={cat}>
              <div style={{ fontSize:10, color:CAT_COLORS[cat]||"#555", textTransform:"uppercase", letterSpacing:".15em", marginBottom:8, marginTop:14, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>// {cat.toLowerCase()}</div>
              {SERVICES.filter(s => s.category === cat).map(s => (
                <div key={s.name} style={{ ...card, display:"flex", alignItems:"center", gap:16, marginBottom:6, padding:"14px 18px", borderLeft:`2px solid ${CAT_COLORS[cat]||"#333"}44` }}>
                  <span style={{ fontSize:18, flexShrink:0, color:CAT_COLORS[cat]||"#555" }}>{s.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#e0e0e0" }}>{s.name}</div>
                    <div style={{ fontSize:11, color:"#555", marginTop:3, fontFamily:"'DM Mono',monospace" }}>
                      <span style={{ color:"#40A0C0" }}>{s.pricing}</span>
                      <span style={{ margin:"0 8px" }}>·</span>
                      <span style={{ color:"#22C55E88" }}>{s.free}</span>
                    </div>
                  </div>
                  <a href={s.url} target="_blank" rel="noreferrer" className="btn-ghost" style={{ padding:"6px 14px", fontSize:11, textDecoration:"none", flexShrink:0 }}>
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
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ fontSize:12, color:"#444", marginBottom:6, fontFamily:"'DM Mono',monospace" }}>
            // toggle features on/off instantly without redeploying
          </div>
          {flags.map(f => (
            <div key={f.key} style={{ ...card, display:"flex", alignItems:"center", gap:16, padding:"16px 20px", borderLeft:`2px solid ${f.enabled?"#40A0C0":"#222"}` }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600, color:"#e0e0e0" }}>{FLAG_LABELS[f.key] || f.key}</div>
                <div style={{ fontSize:11, color:"#444", marginTop:3, fontFamily:"'DM Mono',monospace" }}>key: {f.key} · {new Date(f.updated_at).toLocaleString()}</div>
              </div>
              <div onClick={()=>toggleFlag(f.key, !f.enabled)} style={{
                width:44, height:24, borderRadius:12, cursor:"pointer", flexShrink:0,
                background:f.enabled?"#40A0C0":"#1a1a1a",
                border:`1px solid ${f.enabled?"#40A0C0":"#2a2a2a"}`,
                position:"relative", transition:"background .2s",
                boxShadow:f.enabled?"0 0 10px rgba(64,160,192,0.3)":"none",
              }}>
                <div style={{
                  position:"absolute", top:2,
                  left:f.enabled?22:2,
                  width:18, height:18, borderRadius:"50%", background:"#fff",
                  transition:"left .2s", boxShadow:"0 1px 4px rgba(0,0,0,0.4)",
                }}/>
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:f.enabled?"#40A0C0":"#444", minWidth:28, fontFamily:"'DM Mono',monospace" }}>
                {f.enabled ? "ON" : "OFF"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
