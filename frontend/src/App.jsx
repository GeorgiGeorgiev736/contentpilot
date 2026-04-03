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
import { BubbleTutorial, LoginTip } from "./components/BubbleTutorial";

const PAGES = {
  dashboard:   Dashboard,
  postcontent: PostContent,
  scripts:     Scripts,
  analytics:   Analytics,
  pipeline:    Pipeline,
  platforms:   Platforms,
  pricing:     Pricing,
  account:     Account,
  avatar:      Avatar,
  admin:       Admin,
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
    <div style={{ display:"flex", minHeight:"100vh", background:"#07071C", color:"#E2E2F5", fontSize:15, fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input,textarea,select,button{font-family:inherit}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#0A0A22}
        ::-webkit-scrollbar-thumb{background:#2E2E54;border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:#4A4A80}

        @keyframes spin    {to{transform:rotate(360deg)}}
        @keyframes fadeUp  {from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer {0%,100%{opacity:.4}50%{opacity:1}}
        @keyframes pulse   {0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes glow    {0%,100%{box-shadow:0 0 12px #7C5CFC44}50%{box-shadow:0 0 22px #7C5CFC88}}

        .fade{animation:fadeUp .28s cubic-bezier(.22,1,.36,1) both}

        /* ── Cards ── */
        .card{
          background:#0F0F2A;
          border:1px solid #2A2A50;
          border-radius:18px;
          box-shadow:0 4px 32px rgba(0,0,0,0.55);
        }
        .card-hover:hover{border-color:#3E3E72;background:#111130}

        /* ── Primary button ── */
        .btn-primary{
          background:linear-gradient(135deg,#7C5CFC,#B45AFD);
          border:none;border-radius:11px;color:#fff;
          font-weight:700;font-size:14px;
          cursor:pointer;
          transition:opacity .15s,transform .12s,box-shadow .15s;
          box-shadow:0 2px 16px rgba(124,92,252,0.35);
        }
        .btn-primary:hover{opacity:.92;transform:translateY(-1px);box-shadow:0 4px 24px rgba(124,92,252,0.5)}
        .btn-primary:active{transform:translateY(0);opacity:1}
        .btn-primary:disabled{opacity:.45;cursor:not-allowed;transform:none;box-shadow:none}

        /* ── Ghost button ── */
        .btn-ghost{
          background:transparent;
          border:1px solid #333360;
          border-radius:11px;
          color:#B8B8D8;
          cursor:pointer;
          font-size:14px;
          transition:all .15s;
        }
        .btn-ghost:hover{border-color:#6060A8;color:#E8E8F8;background:#14143A}
        .btn-ghost:active{background:#1A1A44}

        /* ── Inputs ── */
        .inp{
          width:100%;
          background:#0C0C24;
          border:1px solid #2A2A50;
          border-radius:10px;
          color:#E8E8FC;
          padding:11px 14px;
          font-size:15px;
          outline:none;
          transition:border-color .15s,box-shadow .15s;
        }
        .inp:focus{border-color:#7C5CFC;box-shadow:0 0 0 3px rgba(124,92,252,0.15)}
        .inp::placeholder{color:#5A5A88}

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
        .page-title{font-size:28px;font-weight:800;color:#F5F5FF;letter-spacing:-.04em;line-height:1.2}
        .page-sub{font-size:15px;color:#9090B8;margin-top:5px}
        .section-title{font-size:16px;font-weight:700;color:#E0E0F8}
        .label-upper{font-size:12px;color:#8888AA;text-transform:uppercase;letter-spacing:.09em;font-weight:600}
        .text-muted{color:#9090B8}
        .text-dim{color:#7070A0}
      `}</style>

      <Sidebar page={page} setPage={setPage} user={user} collapsed={collapsed} setCollapsed={setCollapsed} />

      <main style={{ flex:1, overflowY:"auto", marginLeft:collapsed?68:256, transition:"margin-left .25s cubic-bezier(.4,0,.2,1)" }}>
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
