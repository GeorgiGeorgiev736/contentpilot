import { useAuth } from "../hooks/useAuth";

const NAV_TOP = [
  ["dashboard", "⊞", "Dashboard"],
  ["scripts",   "✦", "AI Scripts"],
  ["pipeline",  "⊙", "AI Pipeline"],
  ["avatar",    "◉", "AI Avatar"],
  ["analytics", "▦", "Analytics"],
  ["platforms", "⬡", "Platforms"],
];

const PLAN_COLOR = {
  free:     "#F59E0B",
  starter:  "#60A5FA",
  creator:  "#60A5FA",
  pro:      "#A78BFA",
  business: "#F472B6",
  max:      "#34D399",
  agency:   "#34D399",
};

export default function Sidebar({ page, setPage, user, collapsed, setCollapsed }) {
  const { logout } = useAuth();
  const plan = user?.plan || "free";
  const pc   = PLAN_COLOR[plan] || "#F59E0B";
  const isUnlimited = ["pro","business","max","agency"].includes(plan);
  const isPostContent = page === "postcontent";

  return (
    <div style={{
      position:"fixed", left:0, top:0, bottom:0,
      width: collapsed ? 68 : 256,
      background:"#080820",
      borderRight:"1px solid #1E1E42",
      display:"flex", flexDirection:"column",
      padding: collapsed ? "18px 10px" : "22px 16px",
      zIndex:50,
      transition:"width .25s cubic-bezier(.4,0,.2,1)",
      overflow:"hidden",
    }}>

      {/* ── Logo ── */}
      <div onClick={() => setPage("dashboard")} style={{
        display:"flex", alignItems:"center", gap:12,
        marginBottom:28, paddingLeft: collapsed ? 0 : 2,
        justifyContent: collapsed ? "center" : "flex-start",
        cursor:"pointer",
      }}>
        <div style={{
          width:40, height:40, flexShrink:0,
          borderRadius:12,
          border:"1px solid #3A2A8A",
          boxShadow:"0 0 18px rgba(124,92,252,0.4), 0 2px 8px rgba(0,0,0,0.6)",
          overflow:"hidden",
        }}>
          <img src="/logo.svg" alt="Autopilot" style={{ width:"100%", height:"100%", display:"block" }}/>
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontWeight:800, fontSize:17, color:"#F5F5FF", whiteSpace:"nowrap", letterSpacing:"-.02em", lineHeight:1.2 }}>Autopilot</div>
            <div style={{ fontSize:11, color:"#5858A0", letterSpacing:".1em", textTransform:"uppercase", marginTop:1 }}>Creator OS</div>
          </div>
        )}
      </div>

      {/* ── Post Content CTA ── */}
      <button
        data-tutorial="nav-postcontent"
        onClick={() => setPage("postcontent")}
        title={collapsed ? "Post Content" : undefined}
        style={{
          display:"flex", flexDirection: collapsed ? "column" : "row",
          alignItems:"center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: collapsed ? 4 : 10,
          padding: collapsed ? "14px 0" : "14px 16px",
          marginBottom:20,
          background: isPostContent
            ? "linear-gradient(135deg,#7C5CFC,#B45AFD)"
            : "linear-gradient(135deg,#7C5CFC,#B45AFD)",
          border:"none",
          borderRadius:14, cursor:"pointer",
          color:"#fff",
          boxShadow: isPostContent
            ? "0 4px 24px #7C5CFC88, 0 0 0 1px #B45AFD44"
            : "0 4px 20px #7C5CFC55",
          transition:"all .2s",
          width:"100%",
          animation: !isPostContent ? "pcGlow 2.5s ease-in-out infinite" : "none",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 6px 28px #7C5CFC88"; }}
        onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow=isPostContent?"0 4px 24px #7C5CFC88":"0 4px 20px #7C5CFC55"; }}
      >
        <span style={{ fontSize: collapsed ? 22 : 20, flexShrink:0, lineHeight:1 }}>📤</span>
        {!collapsed && (
          <div style={{ textAlign:"left", lineHeight:1.25 }}>
            <div style={{ fontSize:15, fontWeight:800, letterSpacing:"-.01em" }}>Post Content</div>
            <div style={{ fontSize:11, opacity:.8, marginTop:2, fontWeight:500 }}>Upload · Edit · Schedule</div>
          </div>
        )}
      </button>

      {/* ── Nav ── */}
      <nav style={{ flex:1, display:"flex", flexDirection:"column", gap:2 }}>
        {NAV_TOP.map(([id, ic, lb]) => {
          const active = page === id;
          return (
            <button
              key={id}
              data-tutorial={`nav-${id}`}
              onClick={() => setPage(id)}
              title={collapsed ? lb : undefined}
              style={{
                display:"flex", alignItems:"center", gap:10,
                padding: collapsed ? "10px 0" : "10px 14px",
                justifyContent: collapsed ? "center" : "flex-start",
                background: active ? "rgba(124,92,252,0.18)" : "transparent",
                border: `1px solid ${active ? "rgba(124,92,252,0.4)" : "transparent"}`,
                borderRadius:11, cursor:"pointer",
                color: active ? "#C4B5FD" : "#9090B8",
                fontSize:14, fontWeight: active ? 700 : 400,
                transition:"all .15s", whiteSpace:"nowrap",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.color="#D0D0F0"; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#9090B8"; }}}
            >
              <span style={{ fontSize:17, flexShrink:0, color: active ? "#B09FFF" : "#6868A8", transition:"color .15s" }}>{ic}</span>
              {!collapsed && <span>{lb}</span>}
              {active && !collapsed && (
                <span style={{ marginLeft:"auto", width:5, height:5, borderRadius:"50%", background:"#9B79FC", flexShrink:0 }}/>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Bottom user section ── */}
      {!collapsed && (
        <div style={{ borderTop:"1px solid #1E1E42", paddingTop:16, marginTop:8 }}>
          <div
            onClick={() => setPage("pricing")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:11, cursor:"pointer", marginBottom:8, transition:"background .15s" }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.04)"}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}
          >
            <div style={{
              width:32, height:32, borderRadius:10, flexShrink:0,
              background:`${pc}22`, border:`1px solid ${pc}44`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:14, color:pc, fontWeight:800,
            }}>
              {(user?.name || "U")[0].toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, color:"#D8D8F0", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.name}</div>
              <div style={{ fontSize:12, color:"#6060A0", marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.email}</div>
            </div>
            <span style={{ fontSize:10, fontWeight:800, padding:"3px 9px", borderRadius:20, background:`${pc}20`, color:pc, textTransform:"uppercase", letterSpacing:".06em", border:`1px solid ${pc}30`, flexShrink:0 }}>
              {plan}
            </span>
          </div>

          <div style={{ padding:"10px 12px", marginBottom:6, background:"#0A0A22", borderRadius:11, border:"1px solid #1A1A3A" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7, alignItems:"center" }}>
              <span style={{ fontSize:13, color:"#9090B8", fontWeight:500 }}>AI Credits</span>
              <span style={{ fontSize:15, fontWeight:800, color: (user?.credits||0) > 20 ? "#C4B5FD" : (user?.credits||0) > 5 ? "#F59E0B" : "#F87171" }}>
                {user?.credits || 0}
              </span>
            </div>
            {!isUnlimited && (
              <div style={{ height:5, background:"#1A1A3A", borderRadius:3, overflow:"hidden" }}>
                <div style={{
                  width:`${Math.min(100,(user?.credits||0)*10)}%`,
                  height:"100%",
                  background: (user?.credits||0) > 5 ? "linear-gradient(90deg,#7C5CFC,#B45AFD)" : "linear-gradient(90deg,#EF4444,#F87171)",
                  borderRadius:3, transition:"width .3s",
                }}/>
              </div>
            )}
          </div>

          {plan === "free" && (
            <button onClick={() => setPage("pricing")} className="btn-primary"
              style={{ width:"100%", padding:"10px", fontSize:13, marginBottom:8 }}>
              ⚡ Upgrade Plan
            </button>
          )}

          <button
            onClick={() => setPage("account")}
            style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"9px 12px", background:"transparent", border:"none", borderRadius:10, cursor:"pointer", color:"#7878A8", fontSize:13, transition:"all .15s", textAlign:"left" }}
            onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.color="#C0C0E0"; }}
            onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#7878A8"; }}
          >
            ⚙ Account Settings
          </button>

          <button
            onClick={logout}
            style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"9px 12px", background:"transparent", border:"none", borderRadius:10, cursor:"pointer", color:"#7878A8", fontSize:13, transition:"all .15s", textAlign:"left" }}
            onMouseEnter={e => { e.currentTarget.style.background="rgba(239,68,68,0.08)"; e.currentTarget.style.color="#F87171"; }}
            onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#7878A8"; }}
          >
            ← Sign Out
          </button>
        </div>
      )}

      {/* ── Collapse toggle ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{
          background:"#0E0E2A", border:"1px solid #2A2A50",
          borderRadius:10, color:"#7070A8", cursor:"pointer",
          padding:"9px", fontSize:16, marginTop:12,
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"all .15s",
          letterSpacing:2,
        }}
        onMouseEnter={e=>{ e.currentTarget.style.background="#18183A"; e.currentTarget.style.color="#B0B0D0"; }}
        onMouseLeave={e=>{ e.currentTarget.style.background="#0E0E2A"; e.currentTarget.style.color="#7070A8"; }}
      >
        {collapsed ? "☰" : "☰"}
      </button>

      <style>{`
        @keyframes pcGlow {
          0%,100% { box-shadow: 0 4px 20px #7C5CFC55; }
          50%      { box-shadow: 0 4px 28px #B45AFD99, 0 0 0 3px #7C5CFC22; }
        }
      `}</style>
    </div>
  );
}
