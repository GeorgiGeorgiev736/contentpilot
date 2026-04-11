export default function LandingPage({ onLogin, onSignup }) {
  return (
    <div style={{ minHeight:"100vh", background:"#06060F", color:"#e8e8e8", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glitchBorder{0%,100%{box-shadow:-8px 0 0 #C060A0,8px 0 0 #40A0C0}33%{box-shadow:8px 0 0 #C060A0,-8px 0 0 #40A0C0}66%{box-shadow:-4px 0 0 #C060A0,4px 0 0 #40A0C0}}
        @keyframes glitchShake{0%,100%{transform:translateX(0) skewX(0deg)}10%{transform:translateX(-2px) skewX(-8deg)}20%{transform:translateX(2px) skewX(14deg)}30%{transform:translateX(-2px) skewX(-28deg)}50%{transform:translateX(-1px) skewX(-18deg)}60%{transform:translateX(0) skewX(3deg)}}
        @keyframes px1{0%,89%,100%{opacity:0}90%{opacity:1;transform:translate(0,0)}91%{opacity:1;transform:translate(-3px,1px)}92%{opacity:0}94%{opacity:1;transform:translate(2px,-2px)}95%{opacity:0}}
        @keyframes px2{0%,74%,100%{opacity:0}75%{opacity:1}76%{opacity:0}78%{opacity:1;transform:translate(3px,2px)}79%{opacity:0}}
        @keyframes px3{0%,55%,100%{opacity:0}56%{opacity:1}57%{opacity:1;transform:translate(-2px,-3px)}58%{opacity:0}60%{opacity:1;transform:translate(4px,1px)}61%{opacity:0}}
        @keyframes logoGlitch{0%,68%,100%{filter:none;transform:none;clip-path:none}69%{filter:drop-shadow(-6px 0 0 rgba(192,96,160,0.95)) drop-shadow(6px 0 0 rgba(64,160,192,0.95));transform:skewX(-7deg) translateX(-3px) scaleY(1.02);clip-path:polygon(0 10%,100% 10%,100% 48%,0 48%)}70%{filter:drop-shadow(7px 0 0 rgba(192,96,160,0.95)) drop-shadow(-6px 0 0 rgba(64,160,192,0.95)) brightness(1.7);transform:skewX(5deg) translateX(4px);clip-path:none}71%{filter:drop-shadow(-3px 0 0 rgba(192,96,160,0.7)) drop-shadow(3px 0 0 rgba(64,160,192,0.7));transform:translateX(-1px) skewX(-1deg)}72%,83%{filter:none;transform:none;clip-path:none}84%{filter:drop-shadow(10px 0 0 rgba(192,96,160,0.95)) drop-shadow(-10px 0 0 rgba(64,160,192,0.95)) brightness(1.5);transform:skewX(-11deg) scaleY(0.97);clip-path:polygon(0 0,100% 0,100% 35%,0 35%)}85%{filter:drop-shadow(-8px 0 0 rgba(192,96,160,0.95)) drop-shadow(8px 0 0 rgba(64,160,192,0.95));transform:skewX(7deg) translateX(7px);clip-path:polygon(0 35%,100% 35%,100% 100%,0 100%)}86%{filter:drop-shadow(4px 0 0 rgba(192,96,160,0.5)) drop-shadow(-2px 0 0 rgba(64,160,192,0.5));transform:translateX(-2px);clip-path:none}87%{filter:none;transform:none}}
        .land-logo-glitch{animation:logoGlitch 6s steps(1) infinite;display:inline-block}
        .land-btn-primary{background:#fff;border:1px solid transparent;border-radius:10px;color:#000;font-weight:800;font-size:15px;cursor:pointer;padding:13px 32px;transition:none}
        .land-btn-primary:hover{animation:glitchBorder .1s steps(2) infinite,glitchShake .2s steps(8) infinite;border-color:rgba(255,255,255,0.8)!important;text-shadow:14px 5px rgba(246,0,153,0.85),-16px -3px rgba(15,210,255,0.85)}
        .land-btn-ghost{background:transparent;border:1px solid #2a2a2a;border-radius:10px;color:#aaa;cursor:pointer;font-size:15px;padding:13px 28px;transition:none}
        .land-btn-ghost:hover{color:#fff;border-color:rgba(255,255,255,0.4);animation:glitchBorder .1s steps(2) infinite,glitchShake .2s steps(8) infinite}
        .feature-card{background:#141414;border:1px solid #1e1e1e;border-radius:16px;padding:28px 24px;transition:border-color .2s}
        .feature-card:hover{border-color:#40A0C044}
        @media(max-width:767px){
          .hero-title{font-size:38px!important}
          .features-grid{grid-template-columns:1fr!important}
          .hero-btns{flex-direction:column!important;align-items:stretch!important}
          .nav-inner{padding:0 20px!important}
          .hero-inner{padding:80px 20px 60px!important}
        }
      `}</style>

      {/* Pixel overlay */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
        {[
          { top:"12%", left:"23%",   w:8,  h:20, color:"#40A0C0", anim:"px1 7.3s steps(1) infinite",  delay:"0s"    },
          { top:"34%", left:"71%",   w:14, h:5,  color:"#40A0C0", anim:"px2 5.8s steps(1) infinite",  delay:"-1.2s" },
          { top:"61%", left:"44%",   w:10, h:7,  color:"#C060A0", anim:"px3 9.1s steps(1) infinite",  delay:"-3s"   },
          { top:"78%", left:"82%",   w:16, h:5,  color:"#40A0C0", anim:"px2 6.4s steps(1) infinite",  delay:"-2s"   },
          { top:"22%", left:"88%",   w:7,  h:14, color:"#C060A0", anim:"px3 11.2s steps(1) infinite", delay:"-4s"   },
          { top:"50%", left:"9%",    w:5,  h:16, color:"#40C4C0", anim:"px1 8.7s steps(1) infinite",  delay:"-2.5s" },
        ].map((p, i) => (
          <div key={i} style={{ position:"absolute", top:p.top, left:p.left, width:p.w, height:p.h, background:p.color, opacity:0, animation:p.anim, animationDelay:p.delay }} />
        ))}
      </div>

      {/* Nav */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, borderBottom:"1px solid #111", background:"rgba(6,6,15,0.92)", backdropFilter:"blur(12px)" }}>
        <div className="nav-inner" style={{ maxWidth:1200, margin:"0 auto", padding:"0 36px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div className="land-logo-glitch">
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="9" fill="#111" stroke="#222" strokeWidth="1"/>
                <g transform="translate(-2,0)" opacity="0.5"><rect x="8" y="10" width="8" height="14" rx="1.5" fill="#C060A0"/><rect x="10" y="10" width="12" height="3.5" rx="1.5" fill="#C060A0"/></g>
                <g transform="translate(2,0)" opacity="0.5"><rect x="20" y="16" width="8" height="14" rx="1.5" fill="#40A0C0"/><rect x="14" y="26" width="12" height="3.5" rx="1.5" fill="#40A0C0"/></g>
                <rect x="9" y="11" width="7" height="13" rx="1.5" fill="#fff"/>
                <rect x="11" y="11" width="11" height="3.5" rx="1.5" fill="#fff"/>
                <rect x="21" y="17" width="7" height="13" rx="1.5" fill="#fff"/>
                <rect x="13" y="26" width="11" height="3.5" rx="1.5" fill="#fff"/>
                <rect x="9" y="17" width="4" height="1.5" fill="#C060A0" opacity="0.9"/>
                <rect x="27" y="22" width="3" height="1.5" fill="#40A0C0" opacity="0.9"/>
              </svg>
            </div>
            <span style={{ fontSize:17, fontWeight:800, color:"#fff", fontFamily:"'DM Mono',monospace", letterSpacing:"-.02em" }}>contentpilots</span>
          </div>
          <button onClick={onSignup} className="land-btn-primary" style={{ padding:"8px 20px", fontSize:14 }}>Get started</button>
        </div>
      </nav>

      {/* Hero */}
      <div className="hero-inner" style={{ maxWidth:1100, margin:"0 auto", padding:"140px 36px 80px", textAlign:"center", position:"relative", zIndex:1, animation:"fadeUp .5s cubic-bezier(.22,1,.36,1) both" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:20, border:"1px solid #40A0C022", background:"#40A0C010", marginBottom:28 }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:"#40A0C0", display:"inline-block" }} />
          <span style={{ fontSize:13, color:"#40A0C0", fontFamily:"'DM Mono',monospace", letterSpacing:".05em" }}>// AI-powered content automation</span>
        </div>

        <h1 className="hero-title" style={{ fontSize:62, fontWeight:900, color:"#fff", letterSpacing:"-.04em", lineHeight:1.08, marginBottom:24 }}>
          Create, schedule &amp; publish<br />
          <span style={{ color:"#40A0C0" }}>content on autopilot</span>
        </h1>

        <p style={{ fontSize:20, color:"#888", maxWidth:600, margin:"0 auto 40px", lineHeight:1.65 }}>
          ContentPilots uses AI to generate scripts, thumbnails, and metadata — then automatically publishes your content to YouTube, TikTok, and Instagram.
        </p>

        <div style={{ display:"flex", justifyContent:"center" }}>
          <button onClick={onSignup} className="land-btn-primary" style={{ padding:"16px 48px", fontSize:17 }}>
            Start for free →
          </button>
        </div>

        <div style={{ marginTop:20, fontSize:13, color:"#555" }}>No credit card required · Free plan available</div>
      </div>

      {/* Features */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 36px 80px", position:"relative", zIndex:1 }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ fontSize:13, color:"#40A0C0", fontFamily:"'DM Mono',monospace", letterSpacing:".1em", marginBottom:12 }}>// what it does</div>
          <h2 style={{ fontSize:36, fontWeight:800, color:"#fff", letterSpacing:"-.03em" }}>Everything you need to grow faster</h2>
        </div>

        <div className="features-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {[
            { icon:"⊙", title:"AI Pipeline",         desc:"Enter a niche and topic. Claude AI researches trends, writes a viral script, generates metadata, and scores virality — in one click." },
            { icon:"◉", title:"AI Avatar Studio",     desc:"Generate a photorealistic AI presenter, add a voice, paste your script — get a talking video without ever going on camera." },
            { icon:"⬡", title:"Multi-Platform Publishing", desc:"Connect YouTube, TikTok, and Instagram. Schedule and publish automatically — one workflow for all platforms." },
            { icon:"✦", title:"Trend Scanner",        desc:"Real-time trend analysis across platforms. Know what's going viral before you create, so every video has a head start." },
            { icon:"◈", title:"Thumbnail Generator",  desc:"AI-generated thumbnails optimised for click-through rate. No design skills needed." },
            { icon:"⚡", title:"Content Calendar",    desc:"Visual calendar to plan, schedule, and track all your posts across platforms in one place." },
          ].map((f, i) => (
            <div key={i} className="feature-card" style={{ animationDelay:`${i * 0.06}s` }}>
              <div style={{ fontSize:28, marginBottom:14, color:"#40A0C0" }}>{f.icon}</div>
              <div style={{ fontSize:16, fontWeight:700, color:"#e0e0e0", marginBottom:8 }}>{f.title}</div>
              <div style={{ fontSize:14, color:"#777", lineHeight:1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ borderTop:"1px solid #111", borderBottom:"1px solid #111", background:"#0a0a0a", position:"relative", zIndex:1 }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"72px 36px" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <div style={{ fontSize:13, color:"#40A0C0", fontFamily:"'DM Mono',monospace", letterSpacing:".1em", marginBottom:12 }}>// how it works</div>
            <h2 style={{ fontSize:36, fontWeight:800, color:"#fff", letterSpacing:"-.03em" }}>From idea to published in minutes</h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:32, maxWidth:900, margin:"0 auto" }}>
            {[
              ["01", "Connect your platforms", "Link YouTube, TikTok, and Instagram with one-click OAuth."],
              ["02", "Run the AI Pipeline",    "Enter a topic — AI handles research, scripting, metadata, and thumbnails."],
              ["03", "Review &amp; schedule",  "Edit if you want, pick a publish time, and let ContentPilots handle the rest."],
              ["04", "Track performance",      "Monitor views, engagement, and growth across all platforms in one dashboard."],
            ].map(([num, title, desc]) => (
              <div key={num} style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ fontSize:13, fontFamily:"'DM Mono',monospace", color:"#40A0C0", letterSpacing:".1em" }}>{num}</div>
                <div style={{ fontSize:16, fontWeight:700, color:"#e0e0e0" }} dangerouslySetInnerHTML={{ __html: title }} />
                <div style={{ fontSize:14, color:"#666", lineHeight:1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ maxWidth:700, margin:"0 auto", padding:"80px 36px", textAlign:"center", position:"relative", zIndex:1 }}>
        <h2 style={{ fontSize:40, fontWeight:900, color:"#fff", letterSpacing:"-.03em", marginBottom:16 }}>Ready to put your content on autopilot?</h2>
        <p style={{ fontSize:17, color:"#777", marginBottom:36 }}>Join creators who are publishing more with less effort.</p>
        <button onClick={onSignup} className="land-btn-primary" style={{ padding:"16px 48px", fontSize:17 }}>
          Create free account →
        </button>
      </div>

      {/* Footer */}
      <footer style={{ borderTop:"1px solid #111", padding:"24px 36px", textAlign:"center", position:"relative", zIndex:1 }}>
        <div style={{ fontSize:13, color:"#444", fontFamily:"'DM Mono',monospace" }}>
          © 2026 ContentPilots · <span style={{ color:"#40A0C088" }}>contentpilots.net</span>
        </div>
      </footer>
    </div>
  );
}
