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
      <div style={{ width:32, height:32, border:"3px solid #1E1E32", borderTopColor:"#7C5CFC", borderRadius:"50%", animation:"spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user) return <AuthPage />;

  const Page = PAGES[page] || Dashboard;

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#0e0e0e", color:"#d0d0d0", fontSize:16, fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
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
          0%,100% { box-shadow:-4px 0 0 var(--g-red),4px 0 0 var(--g-blue); }
          33%     { box-shadow:4px 0 0 var(--g-red),-4px 0 0 var(--g-blue); }
          66%     { box-shadow:-2px 0 0 var(--g-red),2px 0 0 var(--g-blue); }
        }
        @keyframes glitchShake {
          0%,100% { transform:translateX(0); }
          25%     { transform:translateX(-2px); }
          75%     { transform:translateX(2px); }
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
          font-size:14px;
          cursor:pointer;
          transition:none;
          box-shadow:none;
        }
        .btn-primary:hover{
          animation:glitchBorder .1s steps(2) infinite,glitchShake .15s steps(3) infinite;
          border-color:rgba(255,255,255,0.8)!important;
        }
        .btn-primary:active{transform:none;opacity:1}
        .btn-primary:disabled{opacity:.3;cursor:not-allowed;animation:none}

        /* ── Ghost button ── */
        .btn-ghost{
          background:transparent;
          border:1px solid #2a2a2a;
          border-radius:10px;
          color:#777;
          cursor:pointer;
          font-size:14px;
          transition:none;
        }
        .btn-ghost:hover{color:#fff;border-color:rgba(255,255,255,0.4);animation:glitchBorder .1s steps(2) infinite}
        .btn-ghost:active{background:#111}

        /* ── Glitch utility ── */
        .btn-glitch:hover{
          border-color:rgba(255,255,255,0.7)!important;
          animation:glitchBorder 0.1s steps(2) infinite,glitchShake 0.15s steps(3) infinite;
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
        .inp:focus{border-color:rgba(255,255,255,0.3);box-shadow:-2px 0 0 #FF2040,2px 0 0 #2060FF}
        .inp::placeholder{color:#444}

        /* ── Tags / badges ── */
        .tag{display:inline-flex;align-items:center;padding:3px 11px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:.03em}

        /* ── AI output panel ── */
        .ai-out{
          background:#0A0A22;
          border:1px solid #1E1E42;
          border-radius:14px;
          padding:22px;
          font-family:'DM Mono',monospace;
          font-size:14px;
          line-height:2;
          color:#D4D4F0;
          white-space:pre-wrap;
          overflow-y:auto;
        }
        .cursor{color:#9B79FC;animation:shimmer .8s ease infinite}

        /* ── Typography helpers ── */
        .page-title{font-size:36px;font-weight:900;color:#fff;letter-spacing:-.04em;line-height:1.1}
        .page-sub{font-size:16px;color:#666;margin-top:6px}
        .section-title{font-size:18px;font-weight:700;color:#ccc}
        .label-upper{font-size:11px;color:#555;text-transform:uppercase;letter-spacing:.15em;font-weight:700}
        .text-muted{color:#888}
        .text-dim{color:#666}
      `}</style>

      <Sidebar page={page} setPage={setPage} user={user} collapsed={collapsed} setCollapsed={setCollapsed} />

      <main style={{ flex:1, overflowY:"auto", marginLeft: window.innerWidth < 768 ? 0 : (collapsed ? 64 : 240), marginTop: window.innerWidth < 768 ? 54 : 0, transition:"margin-left .2s cubic-bezier(.4,0,.2,1)" }}>
        {/* ── Video-waiting reminder banner ── */}
        {upload?.file && page !== "postcontent" && (
          <>
            <style>{`
              @keyframes bannerPulse {
                0%,100% { box-shadow: inset 0 -1px 0 #7C5CFC55, 0 2px 24px rgba(124,92,252,0.18); }
                50%      { box-shadow: inset 0 -1px 0 #B45AFD99, 0 2px 36px rgba(180,90,253,0.35); }
              }
              @keyframes dotBlink {
                0%,100% { opacity:1; } 50% { opacity:.3; }
              }
            `}</style>
            <div
              onClick={() => setPage("postcontent")}
              style={{
                cursor: "pointer",
                background: "linear-gradient(90deg,#2D1B69 0%,#1E0F4A 40%,#2A1060 100%)",
                borderBottom: "2px solid #7C5CFC66",
                padding: "14px 36px",
                display: "flex", alignItems: "center", gap: 14,
                animation: "bannerPulse 2.8s ease-in-out infinite",
                position: "relative", overflow: "hidden",
              }}
            >
              {/* shimmer strip */}
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(105deg,transparent 40%,rgba(124,92,252,0.08) 50%,transparent 60%)", pointerEvents:"none" }} />

              {/* blinking live dot */}
              <div style={{ width:10, height:10, borderRadius:"50%", background:"#A78BFA", flexShrink:0, animation:"dotBlink 1.4s ease-in-out infinite", boxShadow:"0 0 8px #A78BFA" }} />

              <span style={{ fontSize:18, flexShrink:0 }}>🎬</span>

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:800, color:"#E9D5FF", letterSpacing:"-.01em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  Your video is waiting for you
                </div>
                <div style={{ fontSize:12, color:"#9B79FC", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  "{upload.file.name}" — continue where you left off
                </div>
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0, background:"linear-gradient(135deg,#7C5CFC,#B45AFD)", padding:"9px 20px", borderRadius:10, boxShadow:"0 2px 14px rgba(124,92,252,0.5)" }}>
                <span style={{ fontSize:13, fontWeight:800, color:"#fff", letterSpacing:"-.01em" }}>Continue</span>
                <span style={{ fontSize:14, color:"#fff" }}>→</span>
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
