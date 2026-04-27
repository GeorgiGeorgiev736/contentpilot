import { useState, useEffect } from "react";
import { platforms as platformsApi, getToken } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const CONFIGS = {
  youtube:        { name:"YouTube",                color:"#FF0000", icon:"▶", scopes:["Channel analytics","Video metadata","Comments","Upload & schedule"],       features:["Video SEO optimization","Thumbnail A/B testing","Comment sentiment","Best time prediction"] },
  youtube_shorts: { name:"YouTube Shorts Channel", color:"#FF0000", icon:"▶", isOptional:true, scopes:["Upload Shorts","Channel analytics","Shorts scheduling"], features:["Auto-tag as Short","Shorts feed optimization","Separate analytics","Cross-post from Video Clipper"] },
  tiktok:         { name:"TikTok",                 color:"#69C9D0", icon:"♪", scopes:["Video analytics","Follower demographics","Trending sounds","Post scheduling"], features:["FYP trend detection","Sound & hashtag analysis","Viral pattern matching","Duet opportunities"] },
  instagram:      { name:"Instagram (via Meta)",   color:"#E1306C", icon:"◈", scopes:["Media insights","Audience demographics","Story analytics","Hashtag data"],  features:["Reel performance tracking","Hashtag optimization","Audience overlap","Cross-platform repurposing"] },
  linkedin:       { name:"LinkedIn",               color:"#0A66C2", icon:"in", scopes:["Post updates","Share content","Profile access"],                           features:["Professional audience reach","B2B content publishing","Thought leadership posts","Career growth content"] },
  twitter:        { name:"X (Twitter)",            color:"#e0e0e0", icon:"𝕏",  scopes:["Post tweets","Upload media","Read profile"],                              features:["Thread publishing","Trending topic content","Viral short-form posts","Real-time audience reach"] },
};

function PlatformCard({ id, cfg, conns, onConnect, onDisconnect, onLoadStats, stats }) {
  const [expanded, setExpanded] = useState(false);
  const isConnected = conns.length > 0;

  return (
    <div className="card" style={{ padding:0, overflow:"hidden", borderLeft:`3px solid ${isConnected ? cfg.color : "#1a1a1a"}`, opacity: cfg.isOptional && !isConnected ? 0.85 : 1 }}>

      {/* Header row — always visible */}
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 18px", cursor:"pointer" }} onClick={() => setExpanded(e => !e)}>
        <div style={{ width:44, height:44, borderRadius:12, background:`${cfg.color}18`, border:`2px solid ${cfg.color}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, color:cfg.color, flexShrink:0 }}>
          {cfg.icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:16, fontWeight:700, color:"#F5F5FF" }}>{cfg.name}</span>
            {isConnected && <span style={{ background:"#22C55E18", color:"#22C55E", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>● {conns.length} connected</span>}
            {cfg.isOptional && <span style={{ background:"#F59E0B12", color:"#D4943A", border:"1px solid #F59E0B22", fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20 }}>Optional</span>}
          </div>
          {!isConnected && (
            <div style={{ fontSize:12, color:"#8888B8", marginTop:2 }}>
              {cfg.isOptional ? "Only needed if you have a separate Shorts channel" : "Not connected"}
            </div>
          )}
          {isConnected && (
            <div style={{ fontSize:12, color:"#8888B8", marginTop:2 }}>
              {conns.map(c => c.handle).join(", ")}
            </div>
          )}
        </div>

        {/* Right side: connect btn + chevron */}
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <button
            onClick={e => { e.stopPropagation(); onConnect(id); }}
            className="btn-primary"
            style={{ padding:"8px 16px", fontSize:12 }}
            data-tutorial={id === "youtube" ? "platforms-connect-btn" : undefined}
          >
            {isConnected ? "+ Add" : "Connect →"}
          </button>
          <span style={{ color:"#555", fontSize:14, transition:"transform .15s", display:"inline-block", transform: expanded ? "rotate(180deg)" : "none" }}>▾</span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding:"0 18px 18px", borderTop:"1px solid #1e1e1e" }}>

          {/* Connected accounts */}
          {conns.length > 0 && (
            <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:8 }}>
              {conns.map(conn => {
                const statsKey     = `${id}_${conn.channel_id || "default"}`;
                const platformStats = stats[statsKey];
                return (
                  <div key={conn.id || conn.channel_id} style={{ padding:"10px 12px", background:"#080810", borderRadius:10, border:"1px solid #10102A" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontSize:13, fontWeight:600, color:"#E0E0F0", flex:1 }}>{conn.handle}</span>
                      <span style={{ fontSize:11, color:"#7878A8" }}>{conn.followers?.toLocaleString()} followers</span>
                      <button onClick={() => onLoadStats(id, conn.channel_id)} className="btn-ghost" style={{ padding:"4px 10px", fontSize:11 }}>
                        {platformStats ? "Refresh" : "Stats"}
                      </button>
                      <button onClick={() => onDisconnect(id, conn.channel_id)} style={{ padding:"4px 10px", background:"#EF444408", border:"1px solid #EF444422", borderRadius:8, color:"#EF4444", cursor:"pointer", fontSize:11 }}>
                        Disconnect
                      </button>
                    </div>
                    {platformStats && Object.keys(platformStats).length > 0 && (
                      <div className="grid-4" style={{ gap:8, marginTop:10 }}>
                        {Object.entries(platformStats).map(([k, v]) => (
                          <div key={k}>
                            <div style={{ fontSize:10, color:"#8080A8", marginBottom:2, textTransform:"capitalize" }}>{k.replace(/([A-Z])/g," $1").toLowerCase()}</div>
                            <div style={{ fontSize:14, fontWeight:700, color:"#E8E8F8" }}>{typeof v === "number" ? v.toLocaleString() : v}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Features & scopes */}
          <div className="grid-2" style={{ marginTop:16, gap:14 }}>
            <div>
              <div style={{ fontSize:11, color:"#7878A8", textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>AI Features</div>
              {cfg.features.map(f => (
                <div key={f} style={{ fontSize:12, color:isConnected?"#C0C0D8":"#7878A8", display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                  <span style={{ color:isConnected?cfg.color:"#7878A8", fontSize:10 }}>✓</span>{f}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:11, color:"#7878A8", textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>Permissions</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                {cfg.scopes.map(s => (
                  <span key={s} style={{ background:isConnected?`${cfg.color}12`:"#10102A", color:isConnected?cfg.color:"#7878A8", border:`1px solid ${isConnected?cfg.color+"22":"#1a1a1a"}`, fontSize:10, fontWeight:600, padding:"3px 8px", borderRadius:20 }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Platforms() {
  const [connections, setConnections] = useState({});
  const [loading,     setLoading]     = useState(true);
  const [stats,       setStats]       = useState({});
  const [notice,      setNotice]      = useState(null);

  const refreshConnections = () =>
    platformsApi.list()
      .then(({ connections: list }) => {
        const map = {};
        list.filter(c => c.connected).forEach(c => {
          if (!map[c.platform]) map[c.platform] = [];
          map[c.platform].push(c);
        });
        setConnections(map);
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error     = params.get("error");
    const detail    = params.get("detail");
    if (connected || error) {
      window.history.replaceState({}, "", window.location.pathname);
      if (connected) {
        const label = connected === "youtube_shorts" ? "YouTube Shorts" : connected.charAt(0).toUpperCase()+connected.slice(1);
        setNotice({ type:"success", msg:`${label} connected successfully!` });
      }
      if (error) setNotice({ type:"error", msg: detail ? decodeURIComponent(detail) : `Connection failed: ${error.replace(/_/g," ")}` });
    }
    refreshConnections();
  }, []);

  const connect = (platformId) => {
    window.location.href = `${API}/api/oauth/${platformId}?token=${getToken()}`;
  };

  const disconnect = async (platformId, channelId) => {
    await platformsApi.disconnect(`${platformId}${channelId ? `?channel_id=${channelId}` : ""}`);
    setConnections(prev => {
      const updated = (prev[platformId] || []).filter(c => c.channel_id !== channelId);
      return updated.length ? { ...prev, [platformId]: updated } : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== platformId));
    });
  };

  const loadStats = async (platformId, channelId) => {
    const key = `${platformId}_${channelId || "default"}`;
    const { stats: s } = await platformsApi.stats(platformId, channelId).catch(() => ({ stats: {} }));
    setStats(prev => ({ ...prev, [key]: s }));
  };

  if (loading) return <div style={{ color:"#8888B8", padding:40, textAlign:"center" }}>Loading platforms…</div>;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <div>
        <h1 style={{ fontSize:26, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em", fontFamily:"'DM Mono',monospace" }}>
          <span style={{ color:"#40A0C0", fontWeight:400 }}>/</span> Platform_Connections
        </h1>
        <p style={{ color:"#9090B8", fontSize:14, marginTop:5 }}>Connect your accounts so AI can analyze your real content performance</p>
      </div>

      {notice && (
        <div style={{ padding:"12px 16px", background:notice.type==="success"?"#22C55E10":"#EF444410", border:`1px solid ${notice.type==="success"?"#22C55E33":"#EF444433"}`, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
          <span style={{ fontSize:13, color:notice.type==="success"?"#22C55E":"#EF4444" }}>{notice.type==="success"?"✓ ":""}{notice.msg}</span>
          <button onClick={()=>setNotice(null)} style={{ background:"none", border:"none", color:"#888", cursor:"pointer", fontSize:18, lineHeight:1 }}>×</button>
        </div>
      )}

      {/* How it works */}
      <div style={{ padding:"14px 18px", background:"rgba(64,160,192,0.05)", border:"1px solid rgba(64,160,192,0.13)", borderRadius:14 }}>
        <div style={{ fontSize:12, fontWeight:600, color:"#40A0C0", marginBottom:10 }}>🔒 How authentication works</div>
        <div className="grid-4" style={{ gap:12 }}>
          {["Click Connect to open the platform's official OAuth dialog","Approve read + write permissions in the official popup","Token stored encrypted in the database on your server","AI analyzes your content and syncs every 30 minutes"].map((t,i) => (
            <div key={i} style={{ display:"flex", gap:8 }}>
              <div style={{ width:18, height:18, borderRadius:"50%", background:"rgba(64,160,192,0.13)", color:"#40A0C0", fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>{i+1}</div>
              <span style={{ fontSize:12, color:"#888", lineHeight:1.5 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Platform cards — collapsible */}
      {Object.entries(CONFIGS).map(([id, cfg]) => (
        <PlatformCard
          key={id}
          id={id}
          cfg={cfg}
          conns={connections[id] || []}
          onConnect={connect}
          onDisconnect={disconnect}
          onLoadStats={loadStats}
          stats={stats}
        />
      ))}

      {/* Coming soon */}
      <div className="card" style={{ padding:"14px 18px" }}>
        <div style={{ fontSize:11, color:"#7878A8", marginBottom:8, fontWeight:600, textTransform:"uppercase", letterSpacing:".06em" }}>Coming Soon</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {["Pinterest","Snapchat","Twitch","Facebook"].map(p => (
            <span key={p} style={{ background:"#10102A", color:"#7878A8", border:"1px solid #1a1a1a", fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:20 }}>{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
