import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { UploadProvider, useUpload } from "./context/UploadContext"; // eslint-disable-line
import AuthPage     from "./pages/AuthPage";
import Sidebar      from "./components/Sidebar";
import Dashboard    from "./pages/Dashboard";
import Platforms    from "./pages/Platforms";
import Scripts      from "./pages/Scripts";
import Analytics    from "./pages/Analytics";
import Pipeline     from "./pages/Pipeline";
import Pricing      from "./pages/Pricing";
import Account      from "./pages/Account";
import PostContent  from "./pages/PostContent";
import Avatar       from "./pages/Avatar";
import Admin        from "./pages/Admin";
import Calendar     from "./pages/Calendar";
import Achievements from "./pages/Achievements";
import { BubbleTutorial, LoginTip } from "./components/BubbleTutorial";

const PAGES = {
  dashboard:    Dashboard,
  postcontent:  PostContent,
  scripts:      Scripts,
  analytics:    Analytics,
  pipeline:     Pipeline,
  platforms:    Platforms,
  pricing:      Pricing,
  account:      Account,
  avatar:       Avatar,
  admin:        Admin,
  calendar:     Calendar,
  achievements: Achievements,
};

function AppInner() {
  const { user, loading } = useAuth();
  const { upload } = useUpload();
  const [page,      setPage]      = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  // Show every login unless user has explicitly checked "Don't show again"
  const [showTutorial, setShowTutorial] = useState(() => localStorage.getItem("autopilot_tutorial_v1") !== "done");
  const [pageProps, setPageProps] = useState({});

  // Handle OAuth redirects that land on /platforms?connected=...
  useEffect(() => {
    const path   = window.location.pathname.replace("/", "");
    const params = new URLSearchParams(window.location.search);
    if (path && PAGES[path]) {
      setPage(path);
      window.history.replaceState({}, "", "/");
    }
    const connected = params.get("connected");
    if (connected) {
      setPage("platforms");
      window.history.replaceState({}, "", "/");
    }
  }, []);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#06060F", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:32, height:32, border:"3px solid #1E1E32", borderTopColor:"#40A0C0", borderRadius:"50%", animation:"spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user) return <AuthPage />;

  const Page = PAGES[page] || Dashboard;

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#0e0e0e", color:"#e8e8e8", fontSize:17, fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input,textarea,select,button{font-family:inherit}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#080808}
        ::-webkit-scrollbar-thumb{background:#222;border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:#444}

        :root { --g-red:#C060A0; --g-blue:#40A0C0; }

        @keyframes spin    {to{transform:rotate(360deg)}}
        @keyframes fadeUp  {from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer {0%,100%{opacity:.4}50%{opacity:1}}
        @keyframes pulse   {0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes glow    {0%,100%{box-shadow:0 0 12px rgba(192,96,160,0.3)}50%{box-shadow:0 0 22px rgba(64,160,192,0.4)}}
        @keyframes glitchBorder {
          0%,100% { box-shadow:-8px 0 0 var(--g-red),8px 0 0 var(--g-blue); }
          33%     { box-shadow:8px 0 0 var(--g-red),-8px 0 0 var(--g-blue); }
          66%     { box-shadow:-4px 0 0 var(--g-red),4px 0 0 var(--g-blue); }
        }
        @keyframes glitchShake {
          0%,100% { transform:translateX(0) skewX(0deg); }
          10%     { transform:translateX(-2px) skewX(-8deg); }
          20%     { transform:translateX(2px) skewX(14deg); }
          30%     { transform:translateX(-2px) skewX(-28deg); }
          40%     { transform:translateX(1px) skewX(10deg); }
          50%     { transform:translateX(-1px) skewX(-18deg); }
          60%     { transform:translateX(0) skewX(3deg); }
          80%     { transform:translateX(1px) skewX(-2deg); }
        }

        .fade{animation:fadeUp .28s cubic-bezier(.22,1,.36,1) both}

        /* ── Cards ── */
        .card{
          background:#141414;
          border:1px solid #242424;
          border-radius:16px;
          box-shadow:0 2px 20px rgba(0,0,0,0.4);
        }
        .card-hover:hover{border-color:#333;background:#181818}

        /* ── Primary button ── */
        .btn-primary{
          background:#ffffff;
          border:1px solid transparent;
          border-radius:10px;
          color:#000000;
          font-weight:800;
          font-size:15px;
          cursor:pointer;
          transition:none;
          box-shadow:none;
        }
        .btn-primary:hover{
          animation:glitchBorder .1s steps(2) infinite,glitchShake .2s steps(8) infinite;
          border-color:rgba(255,255,255,0.8)!important;
          text-shadow:14px 5px rgba(246,0,153,0.85),-16px -3px rgba(15,210,255,0.85),-2px -2px rgba(255,210,0,0.9);
        }
        .btn-primary:active{transform:none;opacity:1}
        .btn-primary:disabled{opacity:.3;cursor:not-allowed;animation:none}

        /* ── Ghost button ── */
        .btn-ghost{
          background:transparent;
          border:1px solid #2a2a2a;
          border-radius:10px;
          color:#888;
          cursor:pointer;
          font-size:15px;
          transition:none;
        }
        .btn-ghost:hover{color:#fff;border-color:rgba(255,255,255,0.4);animation:glitchBorder .1s steps(2) infinite,glitchShake .2s steps(8) infinite;text-shadow:14px 5px rgba(246,0,153,0.85),-16px -3px rgba(15,210,255,0.85),-2px -2px rgba(255,210,0,0.9)}
        .btn-ghost:active{background:#111}

        /* ── Glitch utility ── */
        .btn-glitch:hover{
          border-color:rgba(255,255,255,0.7)!important;
          animation:glitchBorder 0.1s steps(2) infinite,glitchShake 0.2s steps(8) infinite;
          text-shadow:14px 5px rgba(246,0,153,0.85),-16px -3px rgba(15,210,255,0.85),-2px -2px rgba(255,210,0,0.9);
        }

        /* ── Inputs ── */
        .inp{
          width:100%;
          background:#0a0a0a;
          border:1px solid #222;
          border-radius:10px;
          color:#e0e0e0;
          padding:11px 14px;
          font-size:15px;
          outline:none;
          transition:none;
        }
        .inp:focus{border-color:rgba(255,255,255,0.3);box-shadow:-2px 0 0 var(--g-red),2px 0 0 var(--g-blue)}
        .inp::placeholder{color:#555}

        /* ── Tags / badges ── */
        .tag{display:inline-flex;align-items:center;padding:3px 11px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:.03em}

        /* ── AI output panel ── */
        .ai-out{
          background:#081A1E;
          border:1px solid #1A3840;
          border-radius:14px;
          padding:22px;
          font-family:'DM Mono',monospace;
          font-size:15px;
          line-height:2;
          color:#C8E8E8;
          white-space:pre-wrap;
          overflow-y:auto;
        }
        .cursor{color:#40A0C0;animation:shimmer .8s ease infinite}

        /* ── Typography helpers ── */
        .page-title{font-size:42px;font-weight:900;color:#fff;letter-spacing:-.04em;line-height:1.1}
        .page-sub{font-size:17px;color:#888;margin-top:6px}
        .section-title{font-size:20px;font-weight:700;color:#e0e0e0}
        .label-upper{font-size:12px;color:#777;text-transform:uppercase;letter-spacing:.15em;font-weight:700}
        .text-muted{color:#aaa}
        .text-dim{color:#777}
      `}</style>

      <Sidebar page={page} setPage={setPage} user={user} collapsed={collapsed} setCollapsed={setCollapsed} />

      <main style={{ flex:1, overflowY:"auto", marginLeft: window.innerWidth < 768 ? 0 : (collapsed ? 64 : 240), marginTop: window.innerWidth < 768 ? 54 : 0, transition:"margin-left .2s cubic-bezier(.4,0,.2,1)" }}>
        {/* ── Video-waiting reminder banner ── */}
        {upload?.file && page !== "postcontent" && (
          <>
            <style>{`
              @keyframes bannerPulse {
                0%,100% { box-shadow: inset 0 -1px 0 rgba(64,160,192,0.25), 0 2px 24px rgba(64,160,192,0.1); }
                50%      { box-shadow: inset 0 -1px 0 rgba(64,160,192,0.55), 0 2px 36px rgba(64,160,192,0.22); }
              }
              @keyframes dotBlink {
                0%,100% { opacity:1; } 50% { opacity:.3; }
              }
            `}</style>
            <div
              onClick={() => setPage("postcontent")}
              style={{
                cursor: "pointer",
                background: "linear-gradient(90deg,#0A1C1E 0%,#081418 40%,#0C2024 100%)",
                borderBottom: "2px solid rgba(64,160,192,0.3)",
                padding: "14px 36px",
                display: "flex", alignItems: "center", gap: 14,
                animation: "bannerPulse 2.8s ease-in-out infinite",
                position: "relative", overflow: "hidden",
              }}
            >
              {/* shimmer strip */}
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(105deg,transparent 40%,rgba(64,160,192,0.07) 50%,transparent 60%)", pointerEvents:"none" }} />

              {/* blinking live dot */}
              <div style={{ width:10, height:10, borderRadius:"50%", background:"#40A0C0", flexShrink:0, animation:"dotBlink 1.4s ease-in-out infinite", boxShadow:"0 0 8px #40A0C0" }} />

              <span style={{ fontSize:18, flexShrink:0 }}>🎬</span>

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:17, fontWeight:800, color:"#e0e0e0", letterSpacing:"-.01em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  Your video is waiting for you
                </div>
                <div style={{ fontSize:14, color:"#40A0C0", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  "{upload.file.name}" — continue where you left off
                </div>
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0, background:"#fff", padding:"9px 20px", borderRadius:0, clipPath:"polygon(0 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%)", boxShadow:"0 2px 14px rgba(0,0,0,0.3)" }}>
                <span style={{ fontSize:14, fontWeight:900, color:"#000", letterSpacing:".02em" }}>Continue</span>
                <span style={{ fontSize:15, color:"#000" }}>→</span>
              </div>
            </div>
          </>
        )}
        <div key={page} className="fade" style={{ padding:"32px 36px", maxWidth:1300, margin:"0 auto" }}>
          <Page
            setPage={setPage}
            user={user}
            {...pageProps}
            onNavigate={(pg, props) => { setPageProps(props || {}); setPage(pg); }}
          />
        </div>
      </main>

      {showTutorial && (
        <BubbleTutorial onDone={() => setShowTutorial(false)} setCollapsed={setCollapsed} setPage={setPage} />
      )}
      <LoginTip />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <UploadProvider>
        <AppInner />
      </UploadProvider>
    </AuthProvider>
  );
}
