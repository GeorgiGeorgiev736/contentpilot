import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { setToken } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Soft glitch logo — wider, rectangular, muted cyan/magenta
function GlitchLogo({ size = 56 }) {
  const w = Math.round(size * 1.6);
  const h = size;
  return (
    <svg width={w} height={h} viewBox="0 0 80 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="50" rx="12" fill="#111"/>
      {/* Soft magenta ghost */}
      <g transform="translate(-2, 0)" opacity="0.5">
        <rect x="10" y="13" width="11" height="18" rx="2" fill="#C060A0"/>
        <rect x="12" y="13" width="16" height="4" rx="2" fill="#C060A0"/>
      </g>
      {/* Soft cyan ghost */}
      <g transform="translate(2, 0)" opacity="0.5">
        <rect x="27" y="19" width="11" height="18" rx="2" fill="#40A0C0"/>
        <rect x="21" y="33" width="16" height="4" rx="2" fill="#40A0C0"/>
      </g>
      {/* White main shapes */}
      <rect x="11" y="14" width="10" height="17" rx="2" fill="#fff"/>
      <rect x="13" y="14" width="15" height="4" rx="2" fill="#fff"/>
      <rect x="28" y="20" width="10" height="17" rx="2" fill="#fff"/>
      <rect x="20" y="33" width="15" height="4" rx="2" fill="#fff"/>
      {/* Right side A */}
      <rect x="48" y="14" width="4" height="22" rx="2" fill="#fff" opacity="0.9"/>
      <rect x="64" y="14" width="4" height="22" rx="2" fill="#fff" opacity="0.9"/>
      <rect x="48" y="14" width="20" height="4" rx="2" fill="#fff" opacity="0.9"/>
      <rect x="48" y="24" width="20" height="3" rx="1.5" fill="#fff" opacity="0.6"/>
      {/* Pixel glitch strips */}
      <rect x="11" y="22" width="5" height="1.5" fill="#C060A0" opacity="0.8"/>
      <rect x="36" y="28" width="4" height="1.5" fill="#40A0C0" opacity="0.8"/>
      <rect x="54" y="18" width="8" height="1.5" fill="#fff" opacity="0.3"/>
      <rect x="48" y="31" width="6" height="1.5" fill="#C060A0" opacity="0.5"/>
    </svg>
  );
}

export default function AuthPage() {
  const { login, register, refreshUser } = useAuth();
  const [mode,     setMode]     = useState("login");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null);
  const [resent,   setResent]   = useState(false);

  useEffect(() => {
    const params   = new URLSearchParams(window.location.search);
    const token    = params.get("token");
    const oauthErr = params.get("error");
    const verified = params.get("verified");
    if (token) {
      setToken(token);
      refreshUser().then(() => window.history.replaceState({}, "", "/"));
    }
    if (verified === "1") {
      window.history.replaceState({}, "", "/");
      setSuccess("Email verified! You can now sign in.");
    }
    if (oauthErr) {
      const detail = params.get("detail");
      const messages = {
        google_failed:   "Google sign-in failed.",
        facebook_failed: "Meta sign-in failed.",
        no_code:         "Authentication was cancelled.",
        token_expired:   "Verification link expired. Please register again.",
        invalid_token:   "Invalid verification link.",
      };
      setError((messages[oauthErr] || "Sign-in failed.") + (detail ? ` (${detail})` : ""));
    }
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        if (!name) { setError("Name is required"); setLoading(false); return; }
        const res = await register(name, email, password);
        if (res?.pendingVerification) { setPendingEmail(email); setLoading(false); return; }
      }
    } catch (err) {
      if (err.pendingVerification) { setPendingEmail(err.email || email); }
      else setError(err.message);
    }
    finally { setLoading(false); }
  };

  const resendVerification = async () => {
    setResent(false);
    await fetch(`${API}/api/auth/resend-verification`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pendingEmail }),
    });
    setResent(true);
  };

  const oauthLogin = (provider) => {
    window.location.href = `${API}/api/oauth/${provider}`;
  };

  // ── Pending verification screen ──────────────────────────────
  if (pendingEmail) return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,700;9..40,800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        :root{--g-red:#C060A0;--g-blue:#40A0C0}
        @keyframes glitchBorder{0%,100%{box-shadow:-3px 0 0 var(--g-red),3px 0 0 var(--g-blue)}33%{box-shadow:3px 0 0 var(--g-red),-3px 0 0 var(--g-blue)}66%{box-shadow:-1px 0 0 var(--g-red),1px 0 0 var(--g-blue)}}
        @keyframes glitchShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-2px)}75%{transform:translateX(2px)}}
      `}</style>
      <div style={{ width:"100%", maxWidth:440, padding:"0 24px", textAlign:"center" }}>
        <div style={{ fontSize:52, marginBottom:18 }}>📧</div>
        <h1 style={{ fontSize:28, fontWeight:900, color:"#fff", marginBottom:10, letterSpacing:"-.03em" }}>Check your email</h1>
        <p style={{ color:"#666", fontSize:16, lineHeight:1.7, marginBottom:28 }}>
          We sent a verification link to<br/>
          <strong style={{ color:"#ccc" }}>{pendingEmail}</strong>
        </p>
        <div style={{ background:"#111", border:"1px solid #222", borderRadius:16, padding:24 }}>
          {resent
            ? <p style={{ color:"#22C55E", fontSize:15, marginBottom:0 }}>✓ Verification email resent!</p>
            : <>
                <p style={{ color:"#555", fontSize:14, marginBottom:16 }}>Didn't get it? Check spam or resend.</p>
                <button onClick={resendVerification} style={{ width:"100%", padding:"13px", background:"#fff", border:"1px solid transparent", borderRadius:10, color:"#000", fontWeight:900, cursor:"pointer", fontSize:15, transition:"none" }}
                  onMouseEnter={e=>{e.currentTarget.style.animation="glitchBorder .1s steps(2) infinite"}}
                  onMouseLeave={e=>{e.currentTarget.style.animation="none"}}>
                  Resend verification email
                </button>
              </>
          }
          <button onClick={() => setPendingEmail(null)} style={{ marginTop:14, background:"none", border:"none", color:"#444", cursor:"pointer", fontSize:14, textDecoration:"underline" }}>
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700;9..40,800;9..40,900&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        :root{--g-red:#C060A0;--g-blue:#40A0C0}
        @keyframes glitchBorder{0%,100%{box-shadow:-3px 0 0 var(--g-red),3px 0 0 var(--g-blue)}33%{box-shadow:3px 0 0 var(--g-red),-3px 0 0 var(--g-blue)}66%{box-shadow:-1px 0 0 var(--g-red),1px 0 0 var(--g-blue)}}
        @keyframes glitchShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-2px)}75%{transform:translateX(2px)}}
        .auth-tab:hover{color:#fff!important}
        .auth-tab.active{background:#fff!important;color:#000!important}
        .auth-google:hover{opacity:.85}
        .auth-submit:hover:not(:disabled){animation:glitchBorder .1s steps(2) infinite,glitchShake .15s steps(3) infinite;border-color:rgba(255,255,255,0.8)!important}
        .auth-input{width:100%;background:#111;border:1px solid #222;border-radius:10px;color:#e0e0e0;padding:14px 16px;font-size:16px;outline:none;transition:none;box-sizing:border-box;font-family:inherit;margin-bottom:12px}
        .auth-input:focus{border-color:rgba(255,255,255,0.3);box-shadow:-2px 0 0 #C060A0,2px 0 0 #40A0C0}
        .auth-input::placeholder{color:#444}
      `}</style>

      <div style={{ width:"100%", maxWidth:440, padding:"0 20px" }}>

        {/* Logo + title */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ display:"inline-block", marginBottom:20 }}>
            <GlitchLogo size={52}/>
          </div>
          <div style={{ fontSize:34, fontWeight:900, color:"#fff", letterSpacing:"-.04em", lineHeight:1 }}>AUTOPILOT</div>
          <div style={{ fontSize:15, color:"#555", marginTop:8, letterSpacing:".05em", textTransform:"uppercase" }}>Creator OS · AI Content Platform</div>
        </div>

        <div style={{ background:"#111", border:"1px solid #1e1e1e", borderRadius:20, padding:32 }}>

          {/* Tab toggle */}
          <div style={{ display:"flex", gap:4, background:"#0a0a0a", padding:4, borderRadius:12, marginBottom:28, border:"1px solid #1a1a1a" }}>
            {["login","register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className={`auth-tab${mode===m?" active":""}`}
                style={{ flex:1, padding:"11px", borderRadius:9, border:"none", background:"transparent", color: mode===m?"#000":"#555", cursor:"pointer", fontSize:15, fontWeight:mode===m?900:500, fontFamily:"inherit", transition:"none", letterSpacing: mode===m?".02em":"0" }}>
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Google OAuth */}
          <div style={{ marginBottom:20 }}>
            <button onClick={() => oauthLogin("google")}
              className="auth-google"
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, width:"100%", padding:"13px", background:"#fff", border:"none", borderRadius:10, color:"#111", cursor:"pointer", fontSize:15, fontWeight:700, fontFamily:"inherit", transition:"opacity .15s" }}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google · YouTube
            </button>
          </div>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22 }}>
            <div style={{ flex:1, height:1, background:"#1e1e1e" }}/>
            <span style={{ fontSize:13, color:"#444", letterSpacing:".05em", textTransform:"uppercase" }}>or with email</span>
            <div style={{ flex:1, height:1, background:"#1e1e1e" }}/>
          </div>

          {/* Form */}
          <form onSubmit={submit}>
            {mode === "register" && (
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" className="auth-input" required />
            )}
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" type="email" className="auth-input" required />
            <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (min 8 chars)" type="password" className="auth-input" style={{ marginBottom:18 }} required minLength={8} />

            {success && (
              <div style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:8, padding:"11px 15px", color:"#22C55E", fontSize:14, marginBottom:14 }}>✓ {success}</div>
            )}
            {error && (
              <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:8, padding:"11px 15px", color:"#EF4444", fontSize:14, marginBottom:14 }}>{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="auth-submit"
              style={{ width:"100%", padding:"14px", background:"#fff", border:"1px solid transparent", borderRadius:10, color:"#000", fontWeight:900, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:loading?0.5:1, fontFamily:"inherit", letterSpacing:".02em", transition:"none" }}>
              {loading
                ? <><span style={{ width:16,height:16,border:"2px solid #0004",borderTopColor:"#000",borderRadius:"50%",display:"inline-block",animation:"spin 1s linear infinite" }}/> {mode==="login"?"Signing in…":"Creating account…"}</>
                : mode==="login" ? "Sign In →" : "Create Account →"}
            </button>
          </form>

          {mode === "register" && (
            <div style={{ fontSize:14, color:"#444", textAlign:"center", marginTop:18, lineHeight:1.7 }}>
              Free plan includes 10 AI generations.<br/>No credit card required.
            </div>
          )}

          <div style={{ fontSize:12, color:"#333", textAlign:"center", marginTop:20 }}>
            By continuing you agree to our{" "}
            <a href="/terms.html" target="_blank" style={{ color:"#666" }}>Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy.html" target="_blank" style={{ color:"#666" }}>Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  );
}
