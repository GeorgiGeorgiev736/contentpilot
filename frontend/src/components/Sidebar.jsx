import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

const NAV_TOP = [
  ["dashboard",    "⊞", "Dashboard"],
  ["scripts",      "✦", "AI Scripts"],
  ["pipeline",     "⊙", "AI Pipeline"],
  ["avatar",       "◉", "AI Avatar"],
  ["analytics",    "▦", "Analytics"],
  ["platforms",    "⬡", "Platforms"],
  ["calendar",     "◫", "Calendar"],
  ["achievements", "◆", "Achievements"],
];

const PLAN_COLOR = {
  free:     "#888",
  starter:  "#aaa",
  creator:  "#aaa",
  pro:      "#fff",
  business: "#fff",
  max:      "#fff",
  agency:   "#fff",
};

// ── Glitch Logo SVG ──────────────────────────────────────────
function GlitchLogo({ size = 40 }) {
  const w = Math.round(size * 1.5);
  return (
    <svg width={w} height={size} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="40" rx="9" fill="#111" stroke="#222" strokeWidth="1"/>
      {/* Soft magenta ghost */}
      <g transform="translate(-2,0)" opacity="0.5">
        <rect x="8" y="10" width="8" height="14" rx="1.5" fill="#C060A0"/>
        <rect x="10" y="10" width="12" height="3.5" rx="1.5" fill="#C060A0"/>
      </g>
      {/* Soft cyan ghost */}
      <g transform="translate(2,0)" opacity="0.5">
        <rect x="20" y="16" width="8" height="14" rx="1.5" fill="#40A0C0"/>
        <rect x="14" y="26" width="12" height="3.5" rx="1.5" fill="#40A0C0"/>
      </g>
      {/* White main — left side P/autopilot mark */}
      <rect x="9" y="11" width="7" height="13" rx="1.5" fill="#fff"/>
      <rect x="11" y="11" width="11" height="3.5" rx="1.5" fill="#fff"/>
      <rect x="21" y="17" width="7" height="13" rx="1.5" fill="#fff"/>
      <rect x="13" y="26" width="11" height="3.5" rx="1.5" fill="#fff"/>
      {/* Right side A mark */}
      <rect x="36" y="11" width="3.5" height="18" rx="1.5" fill="#fff" opacity="0.9"/>
      <rect x="49" y="11" width="3.5" height="18" rx="1.5" fill="#fff" opacity="0.9"/>
      <rect x="36" y="11" width="17" height="3.5" rx="1.5" fill="#fff" opacity="0.9"/>
      <rect x="36" y="20" width="17" height="2.5" rx="1" fill="#fff" opacity="0.5"/>
      {/* Pixel glitch strips */}
      <rect x="9" y="17" width="4" height="1.5" fill="#C060A0" opacity="0.9"/>
      <rect x="27" y="22" width="3" height="1.5" fill="#40A0C0" opacity="0.9"/>
      <rect x="41" y="15" width="6" height="1.5" fill="#fff" opacity="0.25"/>
    </svg>
  );
}

// ── Desktop Sidebar ──────────────────────────────────────────
function DesktopSidebar({ page, setPage, user, collapsed, setCollapsed }) {
  const { logout } = useAuth();
  const plan = user?.plan || "free";
  const pc   = PLAN_COLOR[plan] || "#888";
  const isUnlimited   = ["pro","business","max","agency"].includes(plan);
  const isPostContent = page === "postcontent";

  return (
    <div style={{
      position:"fixed", left:0, top:0, bottom:0,
      width: collapsed ? 64 : 240,
      background:"#0e0e0e",
      borderRight:"1px solid #222",
      display:"flex", flexDirection:"column",
      padding: collapsed ? "16px 10px" : "20px 14px",
      zIndex:50,
      transition:"width .2s cubic-bezier(.4,0,.2,1)",
      overflow:"hidden",
    }}>
      <style>{`
        .snav-btn:hover {
          background: #111 !important;
          color: #fff !important;
          border-color: transparent !important;
          animation: glitchBorder .1s steps(2) infinite;
        }
        .snav-btn.active {
          background: #141414 !important;
          color: #fff !important;
          border-color: #2a2a2a !important;
        }
        .snav-btn.active::before {
          content:'';
          position:absolute;
          left:0; top:25%; bottom:25%;
          width:2px;
          background:#fff;
          border-radius:0 2px 2px 0;
          box-shadow: -2px 0 0 #FF2040, 2px 0 0 #2060FF;
        }
        .scollapse:hover {
          border-color: rgba(255,255,255,0.3) !important;
          color:#fff !important;
          animation: glitchBorder .1s steps(2) infinite;
        }
        .spost:hover {
          animation: glitchBorder .1s steps(2) infinite;
          opacity: .9;
        }
        .sbottom-btn:hover {
          background: #111 !important;
          color: #fff !important;
        }
        .sbottom-btn.danger:hover {
          background: rgba(255,32,64,0.08) !important;
          color: #FF2040 !important;
        }
      `}</style>

      {/* Logo */}
      <div onClick={() => setPage("dashboard")} style={{
        display:"flex", alignItems:"center", gap:10,
        marginBottom:24,
        justifyContent: collapsed ? "center" : "flex-start",
        cursor:"pointer",
      }}>
        <div style={{ flexShrink:0 }}><GlitchLogo size={38}/></div>
        {!collapsed && (
          <div>
            <div style={{ fontWeight:900, fontSize:16, color:"#fff", whiteSpace:"nowrap", letterSpacing:"-.02em", lineHeight:1.1 }}>AUTOPILOT</div>
            <div style={{ fontSize:9, color:"#333", letterSpacing:".2em", textTransform:"uppercase", marginTop:2 }}>Creator OS</div>
          </div>
        )}
      </div>

      {/* Post Content CTA */}
      <button
        data-tutorial="nav-postcontent"
        onClick={() => setPage("postcontent")}
        title={collapsed ? "Post Content" : undefined}
        className="spost"
        style={{
          display:"flex", flexDirection: collapsed ? "column" : "row",
          alignItems:"center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: collapsed ? 4 : 10,
          padding: collapsed ? "12px 0" : "12px 14px",
          marginBottom:18,
          background: isPostContent ? "#fff" : "#fff",
          border:"none",
          borderRadius:10, cursor:"pointer",
          color:"#000",
          width:"100%",
          transition:"none",
        }}
      >
        <svg width={collapsed ? 20 : 18} height={collapsed ? 20 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
          <path d="M12 3v13M7 8l5-5 5 5"/>
          <path d="M5 19h14"/>
        </svg>
        {!collapsed && (
          <div style={{ textAlign:"left", lineHeight:1.2 }}>
            <div style={{ fontSize:13, fontWeight:900, letterSpacing:".02em" }}>POST CONTENT</div>
            <div style={{ fontSize:10, opacity:.5, marginTop:2, fontWeight:500, letterSpacing:".05em" }}>UPLOAD · EDIT · SCHEDULE</div>
          </div>
        )}
      </button>

      {/* Nav items */}
      <nav style={{ flex:1, display:"flex", flexDirection:"column", gap:1 }}>
        {NAV_TOP.map(([id, ic, lb]) => {
          const active = page === id;
          return (
            <button
              key={id}
              data-tutorial={`nav-${id}`}
              onClick={() => setPage(id)}
              title={collapsed ? lb : undefined}
              className={`snav-btn${active?" active":""}`}
              style={{
                display:"flex", alignItems:"center", gap:10,
                padding: collapsed ? "9px 0" : "9px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                background: "transparent",
                border:"1px solid transparent",
                borderRadius:9, cursor:"pointer",
                color: active ? "#fff" : "#444",
                fontSize:13, fontWeight: active ? 700 : 400,
                transition:"none", whiteSpace:"nowrap",
                position:"relative",
              }}
            >
              <span style={{ fontSize:15, flexShrink:0 }}>{ic}</span>
              {!collapsed && <span style={{ letterSpacing:".01em" }}>{lb}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      {!collapsed && (
        <div style={{ borderTop:"1px solid #1a1a1a", paddingTop:14, marginTop:8 }}>
          {/* User row */}
          <div onClick={() => setPage("pricing")} className="sbottom-btn"
            style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:9, cursor:"pointer", marginBottom:6, transition:"none" }}>
            <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, background:"#161616", border:"1px solid #2a2a2a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"#fff", fontWeight:900 }}>
              {(user?.name || "U")[0].toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, color:"#ccc", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.name}</div>
              <div style={{ fontSize:10, color:"#333", marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.email}</div>
            </div>
            <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:"#1a1a1a", color:pc, textTransform:"uppercase", letterSpacing:".08em", border:"1px solid #2a2a2a", flexShrink:0 }}>
              {plan}
            </span>
          </div>

          {/* Credits */}
          <div style={{ padding:"9px 10px", marginBottom:6, background:"#0a0a0a", borderRadius:9, border:"1px solid #1a1a1a" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, alignItems:"center" }}>
              <span style={{ fontSize:11, color:"#444", fontWeight:600, textTransform:"uppercase", letterSpacing:".1em" }}>AI Credits</span>
              <span style={{ fontSize:14, fontWeight:900, color: (user?.credits||0) > 20 ? "#fff" : (user?.credits||0) > 5 ? "#F59E0B" : "#FF2040" }}>
                {user?.credits || 0}
              </span>
            </div>
            {!isUnlimited && (
              <div style={{ height:2, background:"#161616", borderRadius:1, overflow:"hidden" }}>
                <div style={{ width:`${Math.min(100,(user?.credits||0)*10)}%`, height:"100%", background:(user?.credits||0) > 5 ? "#fff" : "#FF2040", borderRadius:1, transition:"width .3s" }}/>
              </div>
            )}
          </div>

          {plan === "free" && (
            <button onClick={() => setPage("pricing")} className="btn-primary"
              style={{ width:"100%", padding:"9px", fontSize:12, marginBottom:6, letterSpacing:".05em" }}>
              ⚡ UPGRADE
            </button>
          )}

          <button onClick={() => setPage("account")} className="sbottom-btn"
            style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 10px", background:"transparent", border:"none", borderRadius:9, cursor:"pointer", color:"#444", fontSize:12, transition:"none", textAlign:"left" }}>
            ⚙ Account Settings
          </button>

          {user?.is_admin && (
            <button onClick={() => setPage("admin")} className={`sbottom-btn${page==="admin"?" active":""}`}
              style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 10px", background: page==="admin"?"#111":"transparent", border:"none", borderRadius:9, cursor:"pointer", color: page==="admin"?"#fff":"#444", fontSize:12, transition:"none", textAlign:"left" }}>
              🛡 Admin
            </button>
          )}

          <button onClick={logout} className="sbottom-btn danger"
            style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 10px", background:"transparent", border:"none", borderRadius:9, cursor:"pointer", color:"#444", fontSize:12, transition:"none", textAlign:"left" }}>
            ← Sign Out
          </button>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="scollapse"
        style={{ background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:8, color:"#333", cursor:"pointer", padding:"8px", fontSize:14, marginTop:10, display:"flex", alignItems:"center", justifyContent:"center", transition:"none" }}
      >
        {collapsed ? "→" : "←"}
      </button>
    </div>
  );
}

// ── Mobile Top Nav ───────────────────────────────────────────
function MobileNav({ page, setPage, user }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const plan = user?.plan || "free";

  return (
    <>
      <style>{`
        .mnav-item:hover { background: #161616 !important; color:#fff !important; animation: glitchBorder .1s steps(2) infinite; }
        .mnav-item.active { background: #161616 !important; color:#fff !important; border-color:#2a2a2a !important; }
        @keyframes drawerDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
      `}</style>

      {/* Fixed top bar */}
      <div style={{ position:"fixed", top:0, left:0, right:0, height:54, background:"#0e0e0e", borderBottom:"1px solid #222", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px", zIndex:200 }}>
        {/* Logo */}
        <div onClick={() => { setPage("dashboard"); setOpen(false); }} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
          <GlitchLogo size={32}/>
          <span style={{ fontWeight:900, fontSize:14, color:"#fff", letterSpacing:"-.01em" }}>AUTOPILOT</span>
        </div>

        {/* Post Content button */}
        <button
          onClick={() => { setPage("postcontent"); setOpen(false); }}
          style={{ flex:1, maxWidth:160, margin:"0 12px", padding:"8px 12px", background:"#fff", border:"none", borderRadius:8, color:"#000", fontWeight:900, fontSize:11, cursor:"pointer", letterSpacing:".05em", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 19h14"/>
          </svg>
          POST
        </button>

        {/* Hamburger */}
        <button
          onClick={() => setOpen(o => !o)}
          style={{ background:"#0e0e0e", border:"1px solid #222", borderRadius:8, color:"#fff", cursor:"pointer", padding:"8px 10px", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", transition:"none" }}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Drawer */}
      {open && (
        <div style={{ position:"fixed", top:54, left:0, right:0, background:"#080808", borderBottom:"1px solid #1a1a1a", zIndex:199, padding:"12px 14px 16px", animation:"drawerDown .18s cubic-bezier(.22,1,.36,1)" }}>
          {/* Nav grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:12 }}>
            {NAV_TOP.map(([id, ic, lb]) => {
              const active = page === id;
              return (
                <button key={id} onClick={() => { setPage(id); setOpen(false); }}
                  className={`mnav-item${active?" active":""}`}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background: active?"#161616":"#0a0a0a", border:`1px solid ${active?"#2a2a2a":"#141414"}`, borderRadius:9, cursor:"pointer", color: active?"#fff":"#555", fontSize:12, fontWeight: active?700:400, transition:"none", textAlign:"left" }}>
                  <span style={{ fontSize:14 }}>{ic}</span>
                  <span>{lb}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom row */}
          <div style={{ borderTop:"1px solid #1a1a1a", paddingTop:12, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:7, background:"#161616", border:"1px solid #2a2a2a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#fff", fontWeight:900 }}>
                {(user?.name||"U")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:12, color:"#ccc", fontWeight:600 }}>{user?.name}</div>
                <div style={{ fontSize:9, color:"#333", textTransform:"uppercase", letterSpacing:".1em" }}>{plan}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>{ setPage("account"); setOpen(false); }} style={{ padding:"7px 12px", background:"#0e0e0e", border:"1px solid #1e1e1e", borderRadius:7, color:"#555", cursor:"pointer", fontSize:11, transition:"none" }}>⚙</button>
              <button onClick={logout} style={{ padding:"7px 12px", background:"#0e0e0e", border:"1px solid #1e1e1e", borderRadius:7, color:"#555", cursor:"pointer", fontSize:11, transition:"none" }}>← Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {open && <div onClick={() => setOpen(false)} style={{ position:"fixed", inset:0, zIndex:198, background:"rgba(0,0,0,0.5)" }}/>}
    </>
  );
}

// ── Main export ──────────────────────────────────────────────
export default function Sidebar({ page, setPage, user, collapsed, setCollapsed }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  // Listen for resize
  if (typeof window !== "undefined") {
    window.onresize = () => setIsMobile(window.innerWidth < 768);
  }

  if (isMobile) return <MobileNav page={page} setPage={setPage} user={user}/>;
  return <DesktopSidebar page={page} setPage={setPage} user={user} collapsed={collapsed} setCollapsed={setCollapsed}/>;
}
