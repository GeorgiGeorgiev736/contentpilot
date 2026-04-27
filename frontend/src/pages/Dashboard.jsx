import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { platforms as platformsApi } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
function hdr() { return { Authorization: `Bearer ${localStorage.getItem("token")}` }; }

const CATEGORY_COLOR = { format:"#40A0C0", topic:"#7C5CFC", algorithm:"#F59E0B", growth:"#22C55E" };
const PLATFORM_COLOR = { youtube:"#FF4444", youtube_shorts:"#FF4444", tiktok:"#69C9D0", instagram:"#F06292", all:"#40A0C0" };
const PLATFORM_LABEL = { youtube:"YT", youtube_shorts:"Shorts", tiktok:"TikTok", instagram:"IG", linkedin:"LinkedIn", twitter:"X" };

function Metric({ label, value, delta, up, accent }) {
  return (
    <div className="card" style={{ padding:"20px 22px", borderLeft:`3px solid ${accent}55` }}>
      <div style={{ fontSize:11, color:"#8888AA", textTransform:"uppercase", letterSpacing:".1em", fontWeight:600, marginBottom:10 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em", lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:12, color:up?"#4ADE80":"#F87171", marginTop:8, fontWeight:600 }}>{up?"▲":"▼"} {delta}</div>
    </div>
  );
}

export default function Dashboard({ setPage }) {
  const { user } = useAuth();
  const [connections,  setConnections]  = useState([]);
  const [topPosts,     setTopPosts]     = useState([]);
  const [tips,         setTips]         = useState([]);
  const [loadingData,  setLoadingData]  = useState(true);
  const [loadingTips,  setLoadingTips]  = useState(true);

  useEffect(() => {
    Promise.all([
      platformsApi.list().catch(() => ({ connections: [] })),
      fetch(`${API}/api/platforms/top-posts`, { headers: hdr() })
        .then(r => r.ok ? r.json() : { posts: [] })
        .catch(() => ({ posts: [] })),
    ]).then(([p, v]) => {
      setConnections(p.connections || []);
      setTopPosts(v.posts || []);
    }).finally(() => setLoadingData(false));

    fetch(`${API}/api/tools/tips`, { headers: hdr() })
      .then(r => r.ok ? r.json() : { tips: [] })
      .then(d => setTips(d.tips || []))
      .catch(() => {})
      .finally(() => setLoadingTips(false));
  }, []);

  const connected = connections.filter(c => c.connected);

  const alerts = [
    connected.length === 0 && { type:"⬡", text:"Connect your platforms to start publishing content automatically", action:"Connect Now", page:"platforms", c:"#69C9D0" },
    user?.plan === "free" && { type:"⚡", text: user?.credits <= 0 ? "You've used all your AI credits — upgrade to keep creating" : `Only ${user.credits} AI credit${user.credits!==1?"s":""} left on your free plan`, action:"Upgrade Now", page:"pricing", c:"#EF4444" },
  ].filter(Boolean);

  const planColor = { free:"#F59E0B", starter:"#3B82F6", creator:"#7C5CFC", pro:"#22C55E", business:"#fff", max:"#fff", agency:"#22C55E" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <style>{`
        .dash-metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        .dash-main    { display:grid; grid-template-columns:1fr 300px; gap:20px; }
        .tips-grid    { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
        @media(max-width:900px) {
          .dash-metrics { grid-template-columns:repeat(2,1fr); gap:10px; }
          .dash-main    { grid-template-columns:1fr; }
          .tips-grid    { grid-template-columns:1fr; }
        }
        @media(max-width:480px) {
          .dash-metrics { grid-template-columns:1fr 1fr; gap:8px; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em", fontFamily:"'DM Mono',monospace" }}>
            <span style={{ color:"#40A0C0", marginRight:8, fontWeight:400 }}>/</span>welcome_back,&nbsp;<span style={{ color:"#40A0C0" }}>{user?.name?.split(" ")[0].toLowerCase()}</span>
          </h1>
          <p style={{ color:"#9090B8", fontSize:14, marginTop:5 }}>
            {connected.length} platform{connected.length!==1?"s":""} connected
            {user?.plan === "free" && ` · ${user?.credits} AI credits remaining`}
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:12, fontWeight:700, padding:"5px 12px", borderRadius:20, background:`${planColor[user?.plan||"free"]}18`, color:planColor[user?.plan||"free"], textTransform:"uppercase", letterSpacing:".05em", border:`1px solid ${planColor[user?.plan||"free"]}33` }}>
            {user?.plan || "free"} plan
          </span>
          {user?.plan === "free" && (
            <button onClick={() => setPage("pricing")} className="btn-primary" style={{ padding:"7px 16px", fontSize:13 }}>⚡ Upgrade</button>
          )}
        </div>
      </div>

      {/* Upload CTA */}
      <div onClick={() => setPage("upload")} className="card"
        style={{ padding:"16px 20px", cursor:"pointer", background:"linear-gradient(135deg,#0A1E24 0%,#081418 100%)", border:"1px solid rgba(64,160,192,0.2)", borderLeft:"3px solid #40A0C0", display:"flex", alignItems:"center", gap:16 }}
        onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(64,160,192,0.4)"; }}
        onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(64,160,192,0.2)"; }}>
        <div style={{ width:44, height:44, borderRadius:12, background:"rgba(64,160,192,0.12)", border:"1px solid rgba(64,160,192,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🎬</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>Upload a Video</div>
          <div style={{ fontSize:13, color:"#40A0C0", marginTop:3 }}>AI writes title, tags, thumbnails &amp; captions automatically</div>
        </div>
        <div style={{ padding:"9px 18px", background:"#fff", borderRadius:9, color:"#000", fontWeight:900, fontSize:13, flexShrink:0 }}>Upload →</div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {alerts.map((a, i) => {
            const isCritical = a.c === "#EF4444";
            return (
              <div key={i} onClick={() => setPage(a.page)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:isCritical?"#EF444414":`${a.c}08`, border:`1px solid ${isCritical?"#EF444444":a.c+"22"}`, borderRadius:12, cursor:"pointer", flexWrap:"wrap" }}>
                <span style={{ fontSize:14 }}>{a.type}</span>
                <span style={{ flex:1, fontSize:13, color:isCritical?"#FCA5A5":"#D8D8F0", fontWeight:isCritical?600:400, minWidth:0 }}>{a.text}</span>
                <span style={{ fontSize:12, fontWeight:700, color:"#fff", padding:"5px 14px", background:isCritical?"#EF4444":"rgba(255,255,255,0.05)", borderRadius:20, whiteSpace:"nowrap", border:isCritical?"none":`1px solid ${a.c}22`, flexShrink:0 }}>{a.action} →</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Metrics */}
      <div className="dash-metrics">
        <Metric label="Platforms"   value={connected.length||0}   delta={connected.length?`${connected.length} connected`:"none yet"} up={connected.length>0} accent="#69C9D0" />
        <Metric label="AI Credits"  value={user?.credits||0}       delta={user?.plan==="free"?"free plan":user?.plan+" plan"} up accent="#F59E0B" />
        <Metric label="Plan"        value={user?.plan||"free"}     delta={["pro","business","max","agency","creator"].includes(user?.plan)?"active":"upgrade for more"} up={["pro","business","max","agency","creator","starter"].includes(user?.plan)} accent="#22C55E" />
        <Metric label="Top Posts"   value={topPosts.length||"—"}   delta={topPosts.length?"across platforms":"connect platforms"} up={topPosts.length>0} accent="#7C5CFC" />
      </div>

      {/* Main content */}
      <div className="dash-main">

        {/* Left: top posts + trending tips */}
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

          {/* Top performing posts */}
          <div className="card" style={{ padding:22 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#EDEDFA" }}>Top Performing Posts</div>
              <button onClick={() => setPage("analytics")} style={{ fontSize:12, color:"#40A0C0", background:"none", border:"none", cursor:"pointer" }}>View all →</button>
            </div>
            {loadingData ? (
              <div style={{ color:"#7878A8", fontSize:13, padding:"12px 0" }}>Loading…</div>
            ) : topPosts.length === 0 ? (
              <div style={{ textAlign:"center", padding:"28px 20px", color:"#7878A8" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>▦</div>
                <div style={{ fontSize:14, marginBottom:5, color:"#A8A8C8" }}>No posts yet</div>
                <div style={{ fontSize:13, marginBottom:14 }}>Connect platforms to see your top performers</div>
                <button onClick={() => setPage("platforms")} className="btn-primary" style={{ padding:"8px 18px", fontSize:13 }}>Connect Platforms →</button>
              </div>
            ) : (
              topPosts.slice(0, 8).map((v, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 0", borderBottom:i<topPosts.length-1?"1px solid #0F0F1E":"none" }}>
                  <div style={{ width:22, height:22, borderRadius:6, background:"#40A0C018", color:"#40A0C0", fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {i+1}
                  </div>
                  {/* Platform badge */}
                  <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:10, background:`${PLATFORM_COLOR[v.platform]||"#888"}18`, color:PLATFORM_COLOR[v.platform]||"#888", textTransform:"uppercase", letterSpacing:".06em", flexShrink:0 }}>
                    {PLATFORM_LABEL[v.platform]||v.platform}
                  </span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:"#CCC", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.title}</div>
                    <div style={{ fontSize:11, color:"#555", marginTop:2 }}>
                      {v.views > 0 ? `${v.views.toLocaleString()} views` : `${v.likes.toLocaleString()} likes`}
                      {v.comments > 0 && ` · ${v.comments.toLocaleString()} comments`}
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:"#22C55E", fontWeight:600, flexShrink:0 }}>
                    {v.views > 0 ? `▲ ${v.views.toLocaleString()}` : `♥ ${v.likes.toLocaleString()}`}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* AI Trending Tips */}
          <div className="card" style={{ padding:22 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#EDEDFA" }}>What's Trending Now</div>
              <span style={{ fontSize:11, color:"#40A0C0", fontFamily:"'DM Mono',monospace", background:"#40A0C010", border:"1px solid #40A0C022", padding:"2px 9px", borderRadius:20 }}>AI</span>
            </div>
            {loadingTips ? (
              <div style={{ color:"#7878A8", fontSize:13 }}>Asking AI for trends…</div>
            ) : tips.length === 0 ? (
              <div style={{ color:"#7878A8", fontSize:13 }}>No tips available right now</div>
            ) : (
              <div className="tips-grid">
                {tips.map((t, i) => (
                  <div key={i} style={{ padding:"12px 14px", background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:12, borderLeft:`3px solid ${CATEGORY_COLOR[t.category]||"#40A0C0"}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:7, flexWrap:"wrap" }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20, background:`${CATEGORY_COLOR[t.category]||"#40A0C0"}18`, color:CATEGORY_COLOR[t.category]||"#40A0C0", textTransform:"uppercase", letterSpacing:".08em" }}>{t.category}</span>
                      <span style={{ fontSize:10, padding:"2px 7px", borderRadius:20, background:`${PLATFORM_COLOR[t.platform]||"#40A0C0"}12`, color:PLATFORM_COLOR[t.platform]||"#40A0C0", textTransform:"uppercase", letterSpacing:".06em" }}>{t.platform}</span>
                    </div>
                    <div style={{ fontSize:13, color:"#C0C0D8", lineHeight:1.6 }}>{t.tip}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: quick actions + platforms */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div className="card" style={{ padding:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#D0D0F0", marginBottom:12 }}>Quick Actions</div>
            {[
              ["⬆", "Upload & process video", "upload",    "#40A0C0"],
              ["◈", "Generate thumbnails",    "upload",    "#EC4899"],
              ["📅", "Schedule posts",         "calendar",  "#7C5CFC"],
              ["▦",  "View analytics",         "analytics", "#F59E0B"],
              ["⬡",  "Connect platforms",      "platforms", "#69C9D0"],
            ].map(([ic, lb, pg, col]) => (
              <button key={lb} onClick={() => setPage(pg)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 8px", background:"transparent", border:"none", borderRadius:10, cursor:"pointer", marginBottom:2, textAlign:"left" }}
                onMouseEnter={e=>e.currentTarget.style.background="#12122E"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ width:32, height:32, borderRadius:9, background:`${col}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, color:col, flexShrink:0 }}>{ic}</div>
                <span style={{ fontSize:13, color:"#C8C8E8", fontWeight:500 }}>{lb}</span>
                <span style={{ marginLeft:"auto", color:"#5050A0", fontSize:13 }}>→</span>
              </button>
            ))}
          </div>

          <div className="card" style={{ padding:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#D0D0F0", marginBottom:12 }}>Platforms</div>
            {[
              { name:"YouTube",   color:"#FF4444", key:"youtube"   },
              { name:"TikTok",    color:"#69C9D0", key:"tiktok"    },
              { name:"Instagram", color:"#F06292", key:"instagram" },
              { name:"LinkedIn",  color:"#0A66C2", key:"linkedin"  },
              { name:"X",         color:"#aaa",    key:"twitter"   },
            ].map(p => {
              const conn = connections.find(c => c.platform === p.key);
              return (
                <div key={p.key} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, cursor:"pointer", padding:"7px 6px", borderRadius:9 }}
                  onClick={() => setPage("platforms")}
                  onMouseEnter={e=>e.currentTarget.style.background="#12122E"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ width:9, height:9, borderRadius:"50%", background:conn?.connected?p.color:"#2A2A50", flexShrink:0, boxShadow:conn?.connected?`0 0 7px ${p.color}88`:"none" }} />
                  <span style={{ fontSize:13, color:conn?.connected?"#E0E0F8":"#8888AA", flex:1, fontWeight:conn?.connected?500:400 }}>{p.name}</span>
                  <span style={{ fontSize:12, color:conn?.connected?"#9090B8":"#7C5CFC", fontWeight:conn?.connected?400:600 }}>
                    {conn?.connected ? conn.handle : "Connect →"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
