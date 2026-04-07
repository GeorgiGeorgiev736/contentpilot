import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { campaigns as campaignsApi, platforms as platformsApi } from "../services/api";


function Metric({ label, value, delta, up, accent }) {
  return (
    <div className="card" style={{ padding:"24px 26px", borderLeft:`3px solid ${accent}55` }}>
      <div style={{ fontSize:12, color:"#8888AA", textTransform:"uppercase", letterSpacing:".1em", fontWeight:600, marginBottom:12 }}>{label}</div>
      <div style={{ fontSize:32, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em", lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:13, color:up?"#4ADE80":"#F87171", marginTop:10, fontWeight:600 }}>{up?"▲":"▼"} {delta}</div>
    </div>
  );
}

export default function Dashboard({ setPage }) {
  const { user } = useAuth();
  const [campaigns,    setCampaigns]    = useState([]);
  const [connections,  setConnections]  = useState([]);
  const [loadingData,  setLoadingData]  = useState(true);

  useEffect(() => {
    Promise.all([
      campaignsApi.list().catch(() => ({ campaigns: [] })),
      platformsApi.list().catch(() => ({ connections: [] })),
    ]).then(([c, p]) => {
      setCampaigns(c.campaigns || []);
      setConnections(p.connections || []);
    }).finally(() => setLoadingData(false));
  }, []);

  const connected = connections.filter(c => c.connected);

  const alerts = [
    connected.length === 0 && { type:"⬡", text:"Connect your platforms to start publishing content automatically", action:"Connect Now", page:"platforms", c:"#69C9D0" },
    campaigns.length === 0 && !loadingData && { type:"⊙", text:"No content projects yet — run the AI Pipeline to generate your first content plan", action:"Start Pipeline", page:"pipeline", c:"#7C5CFC" },
    user?.plan === "free" && { type:"⚡", text: user?.credits <= 0 ? "You've used all your AI credits — upgrade to keep creating" : `Only ${user.credits} AI credit${user.credits!==1?"s":""} left on your free plan`, action:"Upgrade Now", page:"pricing", c:"#EF4444" },
    connected.length > 0 && campaigns.length > 0 && { type:"✦", text:`${campaigns.length} content project${campaigns.length>1?"s":""} in progress across ${connected.length} connected platform${connected.length>1?"s":""}`, action:"View Projects", page:"projects", c:"#22C55E" },
  ].filter(Boolean);

  const planColor = { free:"#F59E0B", starter:"#3B82F6", pro:"#7C5CFC", agency:"#22C55E" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      <style>{`
        .dash-metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        .dash-main    { display:grid; grid-template-columns:1fr 320px; gap:20px; }
        @media (max-width:767px) {
          .dash-metrics { grid-template-columns:1fr 1fr; }
          .dash-main    { grid-template-columns:1fr; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:30, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em" }}>
            Welcome back, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p style={{ color:"#9090B8", fontSize:15, marginTop:6 }}>
            {connected.length} platforms connected
            {user?.plan === "free" && ` · ${user?.credits} AI credits remaining`}
          </p>
        </div>

        {/* Plan badge */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:12, fontWeight:700, padding:"6px 14px", borderRadius:20, background:`${planColor[user?.plan||"free"]}18`, color:planColor[user?.plan||"free"], textTransform:"uppercase", letterSpacing:".05em", border:`1px solid ${planColor[user?.plan||"free"]}33` }}>
            {user?.plan || "free"} plan
          </span>
          {user?.plan === "free" && (
            <button onClick={() => setPage("pricing")} className="btn-primary" style={{ padding:"8px 18px", fontSize:13 }}>
              ⚡ Upgrade
            </button>
          )}
        </div>
      </div>


      {/* Upload CTA */}
      <div
        onClick={() => setPage("postcontent")}
        className="card"
        style={{ padding:"20px 24px", cursor:"pointer", background:"linear-gradient(135deg,#0A1E24 0%,#081418 100%)", border:"1px solid rgba(64,160,192,0.2)", borderLeft:"3px solid #40A0C0", display:"flex", alignItems:"center", gap:18, transition:"none" }}
        onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(64,160,192,0.4)"; e.currentTarget.style.background="linear-gradient(135deg,#0C2228 0%,#091A1E 100%)"; }}
        onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(64,160,192,0.2)"; e.currentTarget.style.background="linear-gradient(135deg,#0A1E24 0%,#081418 100%)"; }}
      >
        <div style={{ width:52, height:52, borderRadius:14, background:"rgba(64,160,192,0.12)", border:"1px solid rgba(64,160,192,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>🎬</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:18, fontWeight:800, color:"#fff", letterSpacing:"-.01em" }}>Upload &amp; Post a Video</div>
          <div style={{ fontSize:14, color:"#40A0C0", marginTop:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>Drop a video · AI writes your metadata · Schedule to all platforms</div>
        </div>
        <div style={{ padding:"10px 22px", background:"#fff", borderRadius:9, color:"#000", fontWeight:900, fontSize:14, flexShrink:0 }}>Upload →</div>
      </div>

      {/* Smart alerts */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {alerts.map((a, i) => {
          const isCritical = a.c === "#EF4444";
          return (
            <div key={i} onClick={() => setPage(a.page)}
              style={{ display:"flex", alignItems:"center", gap:14, padding: isCritical ? "16px 20px" : "12px 18px", background:isCritical ? "#EF444414" : `${a.c}08`, border:`1px solid ${isCritical ? "#EF444444" : a.c+"22"}`, borderRadius:12, cursor:"pointer", transition:"background .15s", boxShadow: isCritical ? "0 0 20px #EF444418" : "none" }}
              onMouseEnter={e => e.currentTarget.style.background=isCritical?"#EF44441C":`${a.c}12`}
              onMouseLeave={e => e.currentTarget.style.background=isCritical?"#EF444414":`${a.c}08`}>
              <span style={{ fontSize: isCritical ? 18 : 15 }}>{a.type}</span>
              <span style={{ flex:1, fontSize: isCritical ? 14 : 14, color: isCritical ? "#FCA5A5" : "#D8D8F0", fontWeight: isCritical ? 600 : 400 }}>{a.text}</span>
              <span style={{ fontSize:13, fontWeight:700, color:"#fff", padding: isCritical ? "8px 18px" : "5px 14px", background: isCritical ? "#EF4444" : "rgba(255,255,255,0.05)", borderRadius:20, whiteSpace:"nowrap", border: isCritical ? "none" : `1px solid ${a.c}22` }}>
                {a.action} →
              </span>
            </div>
          );
        })}
      </div>

      {/* Metrics */}
      <div className="dash-metrics">
        <Metric label="Platforms"      value={connected.length || 0} delta={connected.length ? `${connected.length} connected` : "none connected yet"} up={connected.length>0} accent="#69C9D0" />
        <Metric label="Content Projects" value={campaigns.length || 0} delta={campaigns.length ? `${campaigns.length} active` : "run pipeline to create one"} up={campaigns.length>0} accent="#7C5CFC" />
        <Metric label="AI Credits"     value={user?.credits || 0} delta={user?.plan === "free" ? "free plan" : user?.plan + " plan"} up accent="#F59E0B" />
        <Metric label="Plan"           value={user?.plan || "free"} delta={["pro","business","max","agency"].includes(user?.plan) ? "unlimited AI" : "upgrade for more"} up={["pro","business","max","agency"].includes(user?.plan)} accent="#22C55E" />
      </div>

      {/* Main content */}
      <div className="dash-main">

        {/* Recent campaigns */}
        <div className="card" style={{ padding:24 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
            <div style={{ fontSize:16, fontWeight:700, color:"#EDEDFA" }}>Content Projects</div>
            <button onClick={() => setPage("pipeline")} className="btn-primary" style={{ padding:"7px 16px", fontSize:12 }}>
              + New Project
            </button>
          </div>

          {loadingData ? (
            <div style={{ color:"#7878A8", fontSize:13, padding:"20px 0" }}>Loading…</div>
          ) : campaigns.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 20px", color:"#7878A8" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>⊙</div>
              <div style={{ fontSize:14, marginBottom:8, color:"#A8A8C8" }}>No campaigns yet</div>
              <div style={{ fontSize:13, marginBottom:20 }}>Run the AI Pipeline to create your first one</div>
              <button onClick={() => setPage("pipeline")} className="btn-primary" style={{ padding:"10px 24px", fontSize:13 }}>
                Start AI Pipeline →
              </button>
            </div>
          ) : (
            campaigns.map((c, i) => {
              const stageColors = { trend:"#7C5CFC", virality:"#F59E0B", idea:"#22C55E", script:"#3B82F6", thumbnail:"#EC4899", tags:"#69C9D0", schedule:"#8B5CF6" };
              return (
                <div key={c.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 8px", borderBottom: i < campaigns.length-1 ? "1px solid #0A0A18":"none", cursor:"pointer", borderRadius:8, transition:"background .15s" }}
                  onMouseEnter={e => e.currentTarget.style.background="#0F0F1E"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background: c.status==="active"?"#22C55E":c.status==="done"?"#7C5CFC":"#F59E0B", flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:"#CCC" }}>{c.name}</div>
                    <div style={{ fontSize:13, color:"#8888B8", marginTop:2 }}>{c.niche} · {c.platform}</div>
                  </div>
                  <span style={{ fontSize:11, color:stageColors[c.stage]||"#555", background:`${stageColors[c.stage]||"#555"}18`, padding:"3px 9px", borderRadius:20, fontWeight:600 }}>
                    {c.stage}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Quick actions */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div className="card" style={{ padding:18 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#D0D0F0", marginBottom:14 }}>Quick Actions</div>
            {[
              ["◎", "Scan trends",         "trends",     "#7C5CFC"],
              ["⚡", "Optimize videos",    "optimizer",  "#F59E0B"],
              ["◈", "Design thumbnails",   "thumbnails", "#EC4899"],
              ["✦", "Write viral script",  "scripts",    "#22C55E"],
              ["⊙", "Run full pipeline",   "pipeline",   "#8B5CF6"],
              ["⬡", "Connect platforms",   "platforms",  "#69C9D0"],
            ].map(([ic, lb, pg, col]) => (
              <button key={pg} onClick={() => setPage(pg)} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"11px 10px", background:"transparent", border:"none", borderRadius:10, cursor:"pointer", marginBottom:2, transition:"background .15s", textAlign:"left" }}
                onMouseEnter={e => e.currentTarget.style.background="#12122E"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                <div style={{ width:36, height:36, borderRadius:10, background:`${col}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, color:col, flexShrink:0 }}>{ic}</div>
                <span style={{ fontSize:14, color:"#C8C8E8", fontWeight:500 }}>{lb}</span>
                <span style={{ marginLeft:"auto", color:"#5050A0", fontSize:14 }}>→</span>
              </button>
            ))}
          </div>

          {/* Platform status */}
          <div className="card" style={{ padding:18 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#D0D0F0", marginBottom:14 }}>Platforms</div>
            {[
              { name:"YouTube",   color:"#FF4444", key:"youtube"   },
              { name:"TikTok",    color:"#69C9D0", key:"tiktok"    },
              { name:"Instagram", color:"#F06292", key:"instagram" },
            ].map(p => {
              const conn = connections.find(c => c.platform === p.key);
              return (
                <div key={p.key} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, cursor:"pointer", padding:"8px 6px", borderRadius:9, transition:"background .15s" }}
                  onClick={() => setPage("platforms")}
                  onMouseEnter={e=>e.currentTarget.style.background="#12122E"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:conn?.connected ? p.color:"#2A2A50", flexShrink:0, boxShadow: conn?.connected ? `0 0 8px ${p.color}88` : "none" }} />
                  <span style={{ fontSize:14, color:conn?.connected?"#E0E0F8":"#8888AA", flex:1, fontWeight:conn?.connected?500:400 }}>{p.name}</span>
                  <span style={{ fontSize:13, color: conn?.connected ? "#9090B8" : "#7C5CFC", fontWeight: conn?.connected ? 400 : 600 }}>
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
