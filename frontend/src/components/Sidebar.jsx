import { useAuth } from "../hooks/useAuth";

const NAV = [
  ["dashboard",   "⊞", "Dashboard"],
  ["postcontent", "↑", "Post Content", true], // true = prominent
  ["scripts",     "✦", "AI Scripts"],
  ["pipeline",    "⊙", "AI Pipeline"],
  ["avatar",      "◉", "AI Avatar"],
  ["analytics",   "▦", "Analytics"],
  ["platforms",   "⬡", "Platforms"],
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

  return (
    <div style={{
      position:"fixed", left:0, top:0, bottom:0,
      width: collapsed ? 64 : 238,
      background:"#080820",
      borderRight:"1px solid #1E1E42",
      display:"flex", flexDirection:"column",
      padding: collapsed ? "16px 10px" : "20px 14px",
      zIndex:50,
      transition:"width .25s cubic-bezier(.4,0,.2,1)",
      overflow:"hidden",
    }}>

      {/* ── Logo ── */}
      <div onClick={() => setPage("dashboard")} style={{
        display:"flex", alignItems:"center", gap:11,
        marginBottom:30, paddingLeft: collapsed ? 0 : 3,
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
            <div style={{ fontWeight:800, fontSize:17, color:"#F5F5FF", whiteSpace:"nowrap", letterSpacing:"-.02em", lineHeight:1.2 }}>
              Autopilot
            </div>
            <div style={{ fontSize:11, color:"#5858A0", letterSpacing:".1em", textTransform:"uppercase", marginTop:1 }}>
              Creator OS
            </div>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex:1, display:"flex", flexDirection:"column", gap:3 }}>
        {NAV.map(([id, ic, lb, prominent]) => {
          const active = page === id;
          if (prominent) return (
            <button
              key={id}
              data-tutorial={`nav-${id}`}
              onClick={() => setPage(id)}
              title={collapsed ? lb : undefined}
              style={{
                display:"flex", alignItems:"center", gap:10,
                padding: collapsed ? "11px 0" : "11px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                background: active
                  ? "linear-gradient(135deg,#7C5CFC,#B45AFD)"
                  : "linear-gradient(135deg,#7C5CFC22,#B45AFD18)",
                border: `1px solid ${active ? "transparent" : "#7C5CFC44"}`,
                borderRadius:11, cursor:"pointer",
                color: active ? "#fff" : "#C4B5FD",
                fontSize:14, fontWeight:700,
                transition:"all .15s", whiteSpace:"nowrap",
                boxShadow: active ? "0 2px 16px #7C5CFC55" : "none",
                marginBottom:4,
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background="linear-gradient(135deg,#7C5CFC44,#B45AFD33)"; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background="linear-gradient(135deg,#7C5CFC22,#B45AFD18)"; }}}
            >
              <span style={{ fontSize:17, flexShrink:0 }}>{ic}</span>
              {!collapsed && <span>{lb}</span>}
            </button>
          );
          return (
            <button
              key={id}
              data-tutorial={`nav-${id}`}
              onClick={() => setPage(id)}
              title={collapsed ? lb : undefined}
              style={{
                display:"flex", alignItems:"center", gap:10,
                padding: collapsed ? "10px 0" : "10px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                background: active ? "rgba(124,92,252,0.18)" : "transparent",
                border: `1px solid ${active ? "rgba(124,92,252,0.4)" : "transparent"}`,
                borderRadius:11, cursor:"pointer",
                color: active ? "#C4B5FD" : "#9090B8",
                fontSize:14, fontWeight: active ? 700 : 400,
                transition:"all .15s", whiteSpace:"nowrap",
                boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.05)" : "none",
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

          {/* User row + plan badge */}
          <div
            onClick={() => setPage("pricing")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:11, cursor:"pointer", marginBottom:8, transition:"background .15s" }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.04)"}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}
          >
            <div style={{
              width:32, height:32, borderRadius:10, flexShrink:0,
              background:`${pc}22`,
              border:`1px solid ${pc}44`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:14, color:pc, fontWeight:800,
            }}>
              {(user?.name || "U")[0].toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, color:"#D8D8F0", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {user?.name}
              </div>
              <div style={{ fontSize:12, color:"#6060A0", marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {user?.email}
              </div>
            </div>
            <span style={{
              fontSize:10, fontWeight:800, padding:"3px 9px", borderRadius:20,
              background:`${pc}20`, color:pc, textTransform:"uppercase",
              letterSpacing:".06em", border:`1px solid ${pc}30`, flexShrink:0,
            }}>
              {plan}
            </span>
          </div>

          {/* Credits */}
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
                  background: (user?.credits||0) > 5
                    ? "linear-gradient(90deg,#7C5CFC,#B45AFD)"
                    : "linear-gradient(90deg,#EF4444,#F87171)",
                  borderRadius:3,
                  transition:"width .3s",
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
        style={{
          background:"#0E0E2A", border:"1px solid #2A2A50",
          borderRadius:10, color:"#7070A8", cursor:"pointer",
          padding:"8px", fontSize:13, marginTop:12,
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"all .15s",
        }}
        onMouseEnter={e=>{ e.currentTarget.style.background="#18183A"; e.currentTarget.style.color="#B0B0D0"; }}
        onMouseLeave={e=>{ e.currentTarget.style.background="#0E0E2A"; e.currentTarget.style.color="#7070A8"; }}
      >
        {collapsed ? "▷" : "◁"}
      </button>
    </div>
  );
}
