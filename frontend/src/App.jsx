import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { UploadProvider, useUpload } from "./context/UploadContext"; // eslint-disable-line
import AuthPage     from "./pages/AuthPage";
import LandingPage  from "./pages/LandingPage";
import Sidebar      from "./components/Sidebar";
import Dashboard    from "./pages/Dashboard";
import Platforms    from "./pages/Platforms";
import Analytics    from "./pages/Analytics";
import Pricing      from "./pages/Pricing";
import Account      from "./pages/Account";
import PostContent  from "./pages/PostContent";
import Upload       from "./pages/Upload";
import Admin        from "./pages/Admin";
import Calendar     from "./pages/Calendar";
import Achievements from "./pages/Achievements";
import { BubbleTutorial, LoginTip } from "./components/BubbleTutorial";

const PAGES = {
  dashboard:    Dashboard,
  upload:       Upload,
  postcontent:  PostContent,
  analytics:    Analytics,
  platforms:    Platforms,
  pricing:      Pricing,
  account:      Account,
  admin:        Admin,
  calendar:     Calendar,
  achievements: Achievements,
};

function AppInner() {
  const { user, loading } = useAuth();
  const { upload } = useUpload();
  const [page,      setPageRaw]   = useState(() => localStorage.getItem("autopilot_welcomed") ? "dashboard" : "platforms");
  const [collapsed, setCollapsed] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => localStorage.getItem("autopilot_tutorial_v1") !== "done");
  const [pageProps, setPageProps] = useState({});
  const [showAuth,  setShowAuth]  = useState(() => new URLSearchParams(window.location.search).get("auth") === "1");

  // Wrap setPage so first navigation marks user as welcomed
  const setPage = (pg) => {
    if (!localStorage.getItem("autopilot_welcomed")) {
      localStorage.setItem("autopilot_welcomed", "1");
    }
    setPageRaw(pg);
  };

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

  if (!user) {
    if (showAuth) return <AuthPage />;
    return <LandingPage onSignup={() => setShowAuth(true)} />;
  }

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

        /* ── Logo periodic glitch ── */
        @keyframes logoGlitch {
          0%, 68%, 100% { filter:none; transform:none; clip-path:none; }
          69% {
            filter: drop-shadow(-6px 0 0 rgba(192,96,160,0.95)) drop-shadow(6px 0 0 rgba(64,160,192,0.95));
            transform: skewX(-7deg) translateX(-3px) scaleY(1.02);
            clip-path: polygon(0 10%, 100% 10%, 100% 48%, 0 48%);
          }
          70% {
            filter: drop-shadow(7px 0 0 rgba(192,96,160,0.95)) drop-shadow(-6px 0 0 rgba(64,160,192,0.95)) brightness(1.7);
            transform: skewX(5deg) translateX(4px);
            clip-path: none;
          }
          71% {
            filter: drop-shadow(-3px 0 0 rgba(192,96,160,0.7)) drop-shadow(3px 0 0 rgba(64,160,192,0.7));
            transform: translateX(-1px) skewX(-1deg);
          }
          72%, 83% { filter:none; transform:none; clip-path:none; }
          84% {
            filter: drop-shadow(10px 0 0 rgba(192,96,160,0.95)) drop-shadow(-10px 0 0 rgba(64,160,192,0.95)) brightness(1.5);
            transform: skewX(-11deg) scaleY(0.97);
            clip-path: polygon(0 0, 100% 0, 100% 35%, 0 35%);
          }
          85% {
            filter: drop-shadow(-8px 0 0 rgba(192,96,160,0.95)) drop-shadow(8px 0 0 rgba(64,160,192,0.95));
            transform: skewX(7deg) translateX(7px);
            clip-path: polygon(0 35%, 100% 35%, 100% 100%, 0 100%);
          }
          86% {
            filter: drop-shadow(4px 0 0 rgba(192,96,160,0.5)) drop-shadow(-2px 0 0 rgba(64,160,192,0.5));
            transform: translateX(-2px);
            clip-path: none;
          }
          87% { filter:none; transform:none; }
        }
        .logo-glitch {
          animation: logoGlitch 6s steps(1) infinite;
          display: inline-block;
        }

        /* ── Typography helpers ── */
        .page-title{font-size:42px;font-weight:900;color:#fff;letter-spacing:-.04em;line-height:1.1}
        .page-sub{font-size:17px;color:#888;margin-top:6px}
        .section-title{font-size:20px;font-weight:700;color:#e0e0e0}
        .label-upper{font-size:12px;color:#777;text-transform:uppercase;letter-spacing:.15em;font-weight:700}
        .text-muted{color:#aaa}
        .text-dim{color:#777}

        /* ── Responsive grid utilities ── */
        .grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
        .grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
        .grid-5{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}

        /* ── Mobile overrides ── */
        @media(max-width:767px){
          .grid-2,.grid-3,.grid-4,.grid-5{grid-template-columns:1fr!important}
          .hide-mobile{display:none!important}
          .stack-mobile{flex-direction:column!important}
          .page-title{font-size:26px!important}
          .page-sub{font-size:15px!important}
          .card{border-radius:12px!important}
        }
        @media(min-width:768px) and (max-width:1024px){
          .grid-3,.grid-4,.grid-5{grid-template-columns:repeat(2,1fr)!important}
        }

        @keyframes px1 {
          0%,89%,100%{opacity:0} 90%{opacity:1;transform:translate(0,0)} 91%{opacity:1;transform:translate(-3px,1px)} 92%{opacity:0} 94%{opacity:1;transform:translate(2px,-2px)} 95%{opacity:0}
        }
        @keyframes px2 {
          0%,74%,100%{opacity:0} 75%{opacity:1;transform:translate(0,0)} 76%{opacity:0} 78%{opacity:1;transform:translate(3px,2px)} 79%{opacity:0}
        }
        @keyframes px3 {
          0%,55%,100%{opacity:0} 56%{opacity:1;transform:translate(0,0)} 57%{opacity:1;transform:translate(-2px,-3px)} 58%{opacity:0} 60%{opacity:1;transform:translate(4px,1px)} 61%{opacity:0}
        }
        @keyframes px4 {
          0%,40%,100%{opacity:0} 41%{opacity:1} 42%{opacity:0} 43%{opacity:1;transform:translate(-4px,2px)} 44%{opacity:0}
        }
        @keyframes px5 {
          0%,20%,100%{opacity:0} 21%{opacity:1;transform:translate(0,0)} 22%{opacity:0} 24%{opacity:1;transform:translate(2px,3px)} 25%{opacity:0}
        }
      `}</style>

      {/* ── Glitch pixel overlay ── */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
        {[
          { top:"12%",  left:"23%",  w:8,  h:20, color:"#40A0C0", anim:"px1 7.3s steps(1) infinite",  delay:"0s"    },
          { top:"8%",   left:"23.8%",w:5,  h:5,  color:"#C060A0", anim:"px1 7.3s steps(1) infinite",  delay:"-.05s" },
          { top:"34%",  left:"71%",  w:14, h:5,  color:"#40A0C0", anim:"px2 5.8s steps(1) infinite",  delay:"-1.2s" },
          { top:"34.6%",left:"71%",  w:5,  h:5,  color:"#C060A0", anim:"px2 5.8s steps(1) infinite",  delay:"-1.1s" },
          { top:"61%",  left:"44%",  w:10, h:7,  color:"#C060A0", anim:"px3 9.1s steps(1) infinite",  delay:"-3s"   },
          { top:"61.5%",left:"44.8%",w:5,  h:5,  color:"#40C4C0", anim:"px3 9.1s steps(1) infinite",  delay:"-2.9s" },
          { top:"78%",  left:"82%",  w:16, h:5,  color:"#40A0C0", anim:"px4 6.4s steps(1) infinite",  delay:"-2s"   },
          { top:"22%",  left:"88%",  w:7,  h:14, color:"#C060A0", anim:"px5 11.2s steps(1) infinite", delay:"-4s"   },
          { top:"22.8%",left:"88.6%",w:5,  h:5,  color:"#40A0C0", anim:"px5 11.2s steps(1) infinite", delay:"-3.9s" },
          { top:"50%",  left:"9%",   w:5,  h:16, color:"#40C4C0", anim:"px1 8.7s steps(1) infinite",  delay:"-2.5s" },
          { top:"88%",  left:"31%",  w:12, h:5,  color:"#C060A0", anim:"px3 7.9s steps(1) infinite",  delay:"-1s"   },
          { top:"15%",  left:"57%",  w:5,  h:12, color:"#40A0C0", anim:"px4 10.3s steps(1) infinite", delay:"-5s"   },
        ].map((p, i) => (
          <div key={i} style={{
            position:"absolute", top:p.top, left:p.left,
            width:p.w, height:p.h,
            background:p.color,
            opacity:0,
            animation:p.anim,
            animationDelay:p.delay,
          }} />
        ))}
      </div>

      <Sidebar page={page} setPage={setPage} user={user} collapsed={collapsed} setCollapsed={setCollapsed} />

      <main style={{ flex:1, overflowY:"auto", position:"relative", zIndex:1, marginLeft: window.innerWidth < 768 ? 0 : (collapsed ? 64 : 240), marginTop: window.innerWidth < 768 ? 54 : 0, transition:"margin-left .2s cubic-bezier(.4,0,.2,1)" }}>
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
<div key={page} className="fade" style={{ padding: window.innerWidth < 768 ? "20px 16px" : "32px 36px", maxWidth:1300, margin:"0 auto" }}>
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
