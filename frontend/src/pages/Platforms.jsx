import { useState, useEffect } from "react";
import { platforms as platformsApi, getToken } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const CONFIGS = {
  youtube:        { name:"YouTube",                color:"#FF0000", icon:"▶", scopes:["Channel analytics","Video metadata","Comments","Upload & schedule"],                        features:["Video SEO optimization","Thumbnail A/B testing","Comment sentiment","Best time prediction"] },
  youtube_shorts: { name:"YouTube Shorts Channel", color:"#FF0000", icon:"▶", note:"Separate channel dedicated to Shorts", isOptional:true, scopes:["Upload Shorts","Channel analytics","Shorts scheduling"], features:["Auto-tag as Short","Shorts feed optimization","Separate analytics","Cross-post from Video Clipper"] },
  tiktok:         { name:"TikTok",                 color:"#69C9D0", icon:"♪", scopes:["Video analytics","Follower demographics","Trending sounds","Post scheduling"],              features:["FYP trend detection","Sound & hashtag analysis","Viral pattern matching","Duet opportunities"] },
  instagram:      { name:"Instagram",              color:"#E1306C", icon:"◈", scopes:["Media insights","Audience demographics","Story analytics","Hashtag data"],                 features:["Reel performance tracking","Hashtag optimization","Audience overlap","Cross-platform repurposing"] },
};

export default function Platforms() {
  const [connections, setConnections] = useState({});
  const [loading,     setLoading]     = useState(true);
  const [stats,       setStats]       = useState({});
  const [notice,      setNotice]      = useState(null); // { type: "success"|"error", msg }

  const refreshConnections = () =>
    platformsApi.list()
      .then(({ connections: list }) => {
        const map = {};
        list.forEach(c => { map[c.platform] = c; });
        setConnections(map);
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    // Handle redirect back from OAuth
    const params   = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error     = params.get("error");
    const detail    = params.get("detail");
    if (connected || error) {
      window.history.replaceState({}, "", window.location.pathname);
      if (connected) {
        const label = connected === "youtube_shorts" ? "YouTube Shorts" : connected.charAt(0).toUpperCase()+connected.slice(1);
        setNotice({ type:"success", msg:`${label} connected successfully!` });
      }
      if (error)     setNotice({ type:"error",   msg: detail ? decodeURIComponent(detail) : `Connection failed: ${error.replace(/_/g," ")}` });
    }
    refreshConnections();
  }, []);

  // Redirect to real OAuth — backend handles the full flow
  const connect = (platformId) => {
    window.location.href = `${API}/api/oauth/${platformId}?token=${getToken()}`;
  };

  const disconnect = async (platformId) => {
    await platformsApi.disconnect(platformId);
    setConnections(prev => ({ ...prev, [platformId]: { ...prev[platformId], connected: false } }));
  };

  const loadStats = async (platformId) => {
    const { stats: s } = await platformsApi.stats(platformId).catch(() => ({ stats: {} }));
    setStats(prev => ({ ...prev, [platformId]: s }));
  };

  if (loading) return <div style={{ color:"#8888B8", padding:40, textAlign:"center" }}>Loading platforms…</div>;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
      <div>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em" }}>Platform Connections</h1>
        <p style={{ color:"#9090B8", fontSize:15, marginTop:5 }}>Connect your accounts so AI can analyze your real content performance</p>
      </div>

      {notice && (
        <div style={{ padding:"13px 18px", background:notice.type==="success"?"#22C55E10":"#EF444410", border:`1px solid ${notice.type==="success"?"#22C55E33":"#EF444433"}`, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:14, color:notice.type==="success"?"#22C55E":"#EF4444" }}>{notice.type==="success"?"✓ ":""}{notice.msg}</span>
          <button onClick={()=>setNotice(null)} style={{ background:"none", border:"none", color:"#888", cursor:"pointer", fontSize:18, lineHeight:1 }}>×</button>
        </div>
      )}

      {/* How it works */}
      <div style={{ padding:"18px 22px", background:"#7C5CFC08", border:"1px solid #7C5CFC22", borderRadius:14 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"#B09FFF", marginBottom:10 }}>🔒 How authentication works</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
          {["Click Connect to open the platform's official OAuth dialog","Approve read + write permissions in the official popup","Token stored encrypted in the database on your server","AI analyzes your content and syncs every 30 minutes"].map((t,i) => (
            <div key={i} style={{ display:"flex", gap:8 }}>
              <div style={{ width:20, height:20, borderRadius:"50%", background:"#7C5CFC22", color:"#B09FFF", fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{i+1}</div>
              <span style={{ fontSize:12, color:"#9898C0", lineHeight:1.5 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Platform cards */}
      {Object.entries(CONFIGS).map(([id, cfg]) => {
        const conn = connections[id];
        const isConnected = conn?.connected;
        const platformStats = stats[id];

        return (
          <div key={id} className="card" style={{ padding:24, borderLeft:`3px solid ${isConnected?cfg.color:"#1A1A2E"}`, opacity: cfg.isOptional && !isConnected ? 0.85 : 1 }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:16, marginBottom:18 }}>
              <div style={{ width:52, height:52, borderRadius:14, background:`${cfg.color}18`, border:`2px solid ${cfg.color}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, color:cfg.color, flexShrink:0 }}>{cfg.icon}</div>

              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                  <span style={{ fontSize:18, fontWeight:700, color:"#F5F5FF" }}>{cfg.name}</span>
                  {isConnected && <span style={{ background:"#22C55E18", color:"#22C55E", fontSize:11, fontWeight:600, padding:"2px 9px", borderRadius:20 }}>● Live</span>}
                  {cfg.isOptional && <span style={{ background:"#F59E0B12", color:"#D4943A", border:"1px solid #F59E0B22", fontSize:11, fontWeight:600, padding:"2px 9px", borderRadius:20 }}>Optional</span>}
                </div>
                <div style={{ fontSize:13, color:"#8888B8", marginTop:3 }}>
                  {cfg.isOptional && !isConnected ? "Optional — only needed if you have a separate channel for Shorts" : isConnected ? `${conn.handle} · ${conn.followers?.toLocaleString()} followers · ${conn.video_count} videos` : "Not connected"}
                </div>
              </div>

              <div style={{ display:"flex", gap:10 }}>
                {isConnected ? (
                  <>
                    <button onClick={() => loadStats(id)} className="btn-ghost" style={{ padding:"8px 14px", fontSize:12 }}>
                      {platformStats ? "Refresh Stats" : "Load Stats"}
                    </button>
                    <button onClick={() => disconnect(id)} style={{ padding:"8px 16px", background:"#EF444408", border:"1px solid #EF444422", borderRadius:10, color:"#EF4444", cursor:"pointer", fontSize:12 }}>
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => connect(id)}
                    className="btn-primary"
                    style={{ padding:"10px 22px", fontSize:13 }}
                    data-tutorial={id === "youtube" ? "platforms-connect-btn" : undefined}
                  >
                    {`Connect ${cfg.name} →`}
                  </button>
                )}
              </div>
            </div>

            {/* Stats panel */}
            {platformStats && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16, padding:"14px", background:"#080810", borderRadius:10, border:"1px solid #10102A" }}>
                {Object.entries(platformStats).map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize:12, color:"#8080A8", marginBottom:4, textTransform:"capitalize" }}>{k.replace(/([A-Z])/g," $1").toLowerCase()}</div>
                    <div style={{ fontSize:17, fontWeight:700, color:"#E8E8F8" }}>{typeof v === "number" ? v.toLocaleString() : v}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Features & scopes */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div>
                <div style={{ fontSize:11, color:"#7878A8", textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>AI Features</div>
                {cfg.features.map(f => (
                  <div key={f} style={{ fontSize:13, color:isConnected?"#C0C0D8":"#7878A8", display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                    <span style={{ color:isConnected?cfg.color:"#7878A8", fontSize:10 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize:11, color:"#7878A8", textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>Permissions</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {cfg.scopes.map(s => (
                    <span key={s} style={{ background:isConnected?`${cfg.color}12`:"#10102A", color:isConnected?cfg.color:"#7878A8", border:`1px solid ${isConnected?cfg.color+"22":"#1A1A2E"}`, fontSize:11, fontWeight:600, padding:"3px 9px", borderRadius:20 }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Coming soon */}
      <div className="card" style={{ padding:"18px 22px" }}>
        <div style={{ fontSize:12, color:"#7878A8", marginBottom:10, fontWeight:600, textTransform:"uppercase", letterSpacing:".06em" }}>Coming Soon</div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {["X / Twitter","LinkedIn","Pinterest","Snapchat","Twitch","YouTube Shorts"].map(p => (
            <span key={p} style={{ background:"#10102A", color:"#7878A8", border:"1px solid #1A1A2E", fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:20 }}>{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
