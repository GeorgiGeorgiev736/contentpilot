import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { setToken } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function AuthPage() {
  const { login, register, refreshUser } = useAuth();
  const [mode,     setMode]     = useState("login");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  // Handle OAuth callback
  useEffect(() => {
    const params   = new URLSearchParams(window.location.search);
    const token    = params.get("token");
    const oauthErr = params.get("error");
    if (token) {
      setToken(token);
      refreshUser().then(() => window.history.replaceState({}, "", "/"));
    }
    if (oauthErr) {
      const messages = {
        google_failed:   "Google sign-in failed. Please try again.",
        facebook_failed: "Facebook sign-in failed. Please try again.",
        github_failed:   "GitHub sign-in failed. Please try again.",
no_code:         "Authentication was cancelled.",
      };
      setError(messages[oauthErr] || "Sign-in failed.");
    }
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "login") { await login(email, password); }
      else {
        if (!name) { setError("Name is required"); setLoading(false); return; }
        await register(name, email, password);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const oauthLogin = (provider) => {
    window.location.href = `${API}/api/oauth/${provider}`;
  };

  const inp = { width:"100%", background:"#0C0C24", border:"1px solid #2A2A50", borderRadius:10, color:"#E8E8FC", padding:"13px 15px", fontSize:15, outline:"none", marginBottom:12, boxSizing:"border-box", fontFamily:"inherit", transition:"border-color .15s" };

  return (
    <div style={{ minHeight:"100vh", background:"#07071C", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700;9..40,800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        input::placeholder{color:#555580}
        input:focus{border-color:#7C5CFC!important;box-shadow:0 0 0 3px rgba(124,92,252,0.15)}
      `}</style>
      <div style={{ width:"100%", maxWidth:420, padding:"0 20px" }}>

        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{
            width:72, height:72, borderRadius:20, margin:"0 auto 18px",
            border:"1px solid #3A2A8A",
            boxShadow:"0 0 32px rgba(124,92,252,0.5), 0 4px 16px rgba(0,0,0,0.7)",
            overflow:"hidden",
          }}>
            <img src="/logo.svg" alt="Autopilot" style={{ width:"100%", height:"100%", display:"block" }}/>
          </div>
          <div style={{ fontSize:28, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em" }}>Autopilot</div>
          <div style={{ fontSize:15, color:"#7070A0", marginTop:6 }}>Creator OS — AI-powered content platform</div>
        </div>

        <div style={{ background:"#0F0F2A", border:"1px solid #2A2A50", borderRadius:22, padding:32, boxShadow:"0 8px 48px rgba(0,0,0,0.7)" }}>

          <div style={{ display:"flex", gap:4, background:"#0A0A20", padding:4, borderRadius:13, marginBottom:28, border:"1px solid #1E1E40" }}>
            {["login","register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }} style={{ flex:1, padding:"10px", borderRadius:10, border:"none", background:mode===m?"#7C5CFC":"transparent", color:mode===m?"#fff":"#6060A0", cursor:"pointer", fontSize:14, fontWeight:mode===m?700:400, fontFamily:"inherit", transition:"all .15s", boxShadow:mode===m?"0 2px 12px rgba(124,92,252,0.4)":"none" }}>
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* OAuth buttons */}
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>

            <button onClick={() => oauthLogin("google")} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, width:"100%", padding:"11px", background:"#fff", border:"1px solid #E0E0E0", borderRadius:10, color:"#1a1a1a", cursor:"pointer", fontSize:14, fontWeight:500, fontFamily:"inherit", transition:"opacity .15s" }}
              onMouseEnter={e=>e.currentTarget.style.opacity=".85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google · YouTube
            </button>

            <button onClick={() => oauthLogin("facebook")} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, width:"100%", padding:"11px", background:"#1877F2", border:"1px solid #1877F2", borderRadius:10, color:"#fff", cursor:"pointer", fontSize:14, fontWeight:500, fontFamily:"inherit", transition:"opacity .15s" }}
              onMouseEnter={e=>e.currentTarget.style.opacity=".85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Continue with Facebook
            </button>

          </div>

          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22 }}>
            <div style={{ flex:1, height:1, background:"#1E1E40" }}/>
            <span style={{ fontSize:13, color:"#5A5A88" }}>or with email</span>
            <div style={{ flex:1, height:1, background:"#1E1E40" }}/>
          </div>

          <form onSubmit={submit}>
            {mode === "register" && (
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={inp} required />
            )}
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" type="email" style={inp} required />
            <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (min 8 chars)" type="password" style={{ ...inp, marginBottom:18 }} required minLength={8} />

            {error && (
              <div style={{ background:"#EF444410", border:"1px solid #EF444422", borderRadius:8, padding:"10px 14px", color:"#EF4444", fontSize:13, marginBottom:14 }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={{ width:"100%", padding:"13px", background:"linear-gradient(135deg,#7C5CFC,#B45AFD)", border:"none", borderRadius:10, color:"#fff", fontWeight:700, cursor:"pointer", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:loading?.7:1, fontFamily:"inherit" }}>
              {loading
                ? <><span style={{ width:16,height:16,border:"2px solid #fff4",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin 1s linear infinite" }}/> {mode==="login"?"Signing in…":"Creating account…"}</>
                : mode==="login" ? "Sign In →" : "Create Account →"}
            </button>
          </form>

          {mode === "register" && (
            <div style={{ fontSize:13, color:"#6060A0", textAlign:"center", marginTop:16, lineHeight:1.7 }}>
              Free plan includes 10 AI generations.<br/>No credit card required.
            </div>
          )}

          <div style={{ fontSize:12, color:"#44446A", textAlign:"center", marginTop:20 }}>
            By continuing you agree to our{" "}
            <a href="/terms.html" target="_blank" style={{ color:"#6060A8" }}>Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy.html" target="_blank" style={{ color:"#6060A8" }}>Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  );
}
