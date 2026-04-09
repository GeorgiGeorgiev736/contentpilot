import { useState, useEffect, useCallback } from "react";

// ─── Steps ─────────────────────────────────────────────────────────────────
const STEPS = [
  {
    section:"welcome", type:"welcome", position:"center",
    title:"Welcome to Autopilot 👋",
    body:"Let's get you set up in 60 seconds. First connect your social accounts, then you're ready to upload, schedule, and grow — all in one place.",
    cta:"Let's start →",
  },
  {
    section:"platforms", type:"nav", target:"nav-platforms", page:"platforms", position:"right",
    title:"Step 1 · Connect your platforms",
    body:"Connect YouTube, TikTok, and Instagram so Autopilot can publish directly to your accounts.",
    tip:"Takes 30 seconds via OAuth — no passwords stored, revoke access anytime.",
    cta:"Take me there →",
    clickHint:"or click Platforms in the sidebar",
  },
  {
    section:"postcontent", type:"nav", target:"nav-postcontent", page:"postcontent", position:"right",
    title:"Step 2 · Upload & post a video",
    body:"Drop any video here. AI detects if it's short or long-form and shows the right platforms. It writes your title, description, and hashtags automatically.",
    tip:"Videos go directly from your browser to YouTube — no file size limit.",
    cta:"Take me there →",
    clickHint:"or click Post Content in the sidebar",
  },
  {
    section:"ai", type:"page", target:"postcontent-ai-btn", position:"below",
    title:"Step 3 · AI writes your metadata",
    body:"Hit Generate with AI and watch it stream a viral-optimised title, description, and 20 hashtags in seconds. Every field is editable before you post.",
    cta:"Got it →",
  },
  {
    section:"done", type:"done", position:"center", isLast:true,
    title:"You're all set! 🚀",
    body:"Connect platforms → upload a video → hit Schedule. Come back to the Calendar to track your scheduled posts.",
    cta:"Let's go! 🚀",
  },
];

const SECTION_IDS = ["welcome","platforms","postcontent","ai","done"];

function nextSectionIdx(fromIdx) {
  const cur = STEPS[fromIdx].section;
  for (let i = fromIdx + 1; i < STEPS.length; i++) {
    if (STEPS[i].section !== cur) return i;
  }
  return STEPS.length - 1;
}

// ─── Daily login tips ───────────────────────────────────────────────────────
export const LOGIN_TIPS = [
  { icon:"💡", text:"Reels posted between 6–9 PM get 40% more reach. Check Analytics → Best Times to find your personal window." },
  { icon:"🔥", text:"Upload one podcast this week and let Autopilot clip it into 7 Shorts — a full week of content from one recording." },
  { icon:"📈", text:"AI & productivity topics are trending +300% right now. Open Trend Radar and scan your niche." },
  { icon:"⏰", text:"Haven't scheduled anything this week? Head to Post Content to batch-create Shorts in minutes." },
  { icon:"✨", text:"Use the same script on 3 platforms but A/B test different thumbnails — AI can generate multiple variations." },
  { icon:"🎯", text:"Weekends drive 2× more profile visits on TikTok. Schedule your strongest content for Saturday morning." },
  { icon:"📝", text:"Scripts under 60 seconds get 40% more shares. Use the Short Script template in Script Writer." },
  { icon:"🚀", text:"Connect a separate YouTube Shorts account in Platforms for double the algorithmic reach." },
  { icon:"🎬", text:"Generate a full AI Avatar video without a camera. Try Script Writer → Generate Avatar." },
  { icon:"📊", text:"Check Analytics weekly — your top 3 topics should drive all of next week's content strategy." },
];

// ─── Measure target element ─────────────────────────────────────────────────
function useRect(target, idx) {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    if (!target) { setRect(null); return; }
    const measure = () => {
      const el = document.querySelector(`[data-tutorial="${target}"]`);
      if (el) setRect(el.getBoundingClientRect());
    };
    measure();
    const t1 = setTimeout(measure, 150);
    const t2 = setTimeout(measure, 500);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("resize", measure); };
  }, [target, idx]);
  return rect;
}

// ─── Spotlight + pulse ring ─────────────────────────────────────────────────
function Spotlight({ rect }) {
  if (!rect) return null;
  const pad = 9;
  const x = rect.left - pad, y = rect.top - pad;
  const w = rect.width + pad * 2, h = rect.height + pad * 2;
  return (
    <>
      <svg style={{ position:"fixed", inset:0, width:"100%", height:"100%", zIndex:9997, pointerEvents:"none" }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="tut-spot">
            <rect x="0" y="0" width="100%" height="100%" fill="white"/>
            <rect x={x} y={y} width={w} height={h} rx="11" fill="black"/>
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(2,8,12,0.88)" mask="url(#tut-spot)"/>
      </svg>
      {/* Pulse ring */}
      <div style={{
        position:"fixed", left:x, top:y, width:w, height:h,
        borderRadius:11, border:"2px solid #40A0C0",
        boxShadow:"0 0 0 4px rgba(64,160,192,0.15), 0 0 28px rgba(64,160,192,0.35)",
        zIndex:9998, pointerEvents:"none",
        animation:"tutPulse 2s ease-in-out infinite",
      }}/>
      {/* Click-here arrow bouncing toward the element */}
      <div style={{
        position:"fixed", left:x + w + 10, top:y + h/2 - 12,
        zIndex:9999, pointerEvents:"none",
        animation:"tutBounceRight 1s ease-in-out infinite",
        fontSize:18, color:"#40A0C0",
      }}>←</div>
    </>
  );
}

// ─── Bubble ─────────────────────────────────────────────────────────────────
const BW = { right:360, below:400, center:500 };

function isMobile() { return window.innerWidth < 600; }

function getBubbleStyle(step, rect) {
  if (isMobile()) {
    const vw = window.innerWidth;
    const w  = Math.min(vw - 32, 420);
    return { style:{ position:"fixed", left:(vw-w)/2, top:"50%", transform:"translateY(-50%)", width:w, maxHeight:"80vh", overflowY:"auto" }, arrowLeft:null };
  }
  const { position } = step;
  if (position === "center" || !rect) {
    return { style:{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:BW.center }, arrowLeft:null };
  }
  if (position === "right") {
    if (rect.right + 24 + BW.right > window.innerWidth - 8) {
      return { style:{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:Math.min(BW.right, window.innerWidth-32) }, arrowLeft:null };
    }
    return {
      style:{ position:"fixed", left:rect.right+24, top:Math.max(16, Math.min(rect.top+rect.height/2-160, window.innerHeight-420)), width:BW.right },
      arrowLeft:null,
    };
  }
  if (position === "below") {
    const w = BW.below;
    const left = Math.max(16, Math.min(rect.left+rect.width/2-w/2, window.innerWidth-w-16));
    return {
      style:{ position:"fixed", left, top:Math.min(rect.bottom+20, window.innerHeight-400), width:w },
      arrowLeft:(rect.left+rect.width/2)-left,
    };
  }
  return { style:{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:BW.center }, arrowLeft:null };
}

function Bubble({ step, idx, rect, onNext, onBack, onSkip, onSkipAll, dontShow, setDontShow }) {
  const { style:posStyle, arrowLeft } = getBubbleStyle(step, rect);
  const sectionPos = SECTION_IDS.indexOf(step.section);
  const total = STEPS.length - 1; // exclude done screen from count
  const pct = Math.round((idx / total) * 100);

  return (
    <div style={{
      ...posStyle,
      zIndex:10000,
      background:"linear-gradient(155deg,#091618 0%,#060E10 100%)",
      border:"1px solid #1A4050",
      borderRadius:20,
      padding:"26px 28px",
      boxShadow:"0 16px 64px rgba(0,0,0,0.85), 0 0 0 1px rgba(64,160,192,0.08), inset 0 1px 0 rgba(255,255,255,0.03)",
      animation:"tutFadeIn .28s cubic-bezier(.22,1,.36,1)",
    }}>

      {/* Arrow: left */}
      {step.position === "right" && rect && !isMobile() && (
        <div style={{ position:"absolute", left:-11, top:"40%", width:0, height:0,
          borderTop:"11px solid transparent", borderBottom:"11px solid transparent", borderRight:"11px solid #1A4050" }}/>
      )}
      {/* Arrow: up */}
      {step.position === "below" && rect && arrowLeft != null && !isMobile() && (
        <div style={{ position:"absolute", top:-11, left:Math.max(16, Math.min(arrowLeft, BW.below-22))-11, width:0, height:0,
          borderLeft:"11px solid transparent", borderRight:"11px solid transparent", borderBottom:"11px solid #1A4050" }}/>
      )}

      {/* Progress bar */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
          <div style={{ display:"flex", gap:5 }}>
            {SECTION_IDS.map((s, i) => (
              <div key={s} style={{
                height:3, borderRadius:3, flexShrink:0,
                width: i===sectionPos ? 22 : 7,
                background: i<sectionPos ? "#40A0C0" : i===sectionPos ? "#80D0E0" : "#0A2028",
                transition:"all .35s cubic-bezier(.4,0,.2,1)",
              }}/>
            ))}
          </div>
          <span style={{ fontSize:10, color:"#2A5060", fontFamily:"'DM Mono',monospace" }}>{pct}%</span>
        </div>
      </div>

      {step.type === "page" && (
        <div style={{ fontSize:10, color:"#40A0C0", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", marginBottom:8, fontFamily:"'DM Mono',monospace" }}>
          // on this page
        </div>
      )}
      {step.type === "nav" && (
        <div style={{ fontSize:10, color:"#40A0C0", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", marginBottom:8, fontFamily:"'DM Mono',monospace" }}>
          // navigate
        </div>
      )}

      <div style={{ fontSize:18, fontWeight:800, color:"#F2F2FF", marginBottom:10, lineHeight:1.3 }}>{step.title}</div>
      <div style={{ fontSize:14, color:"#7AA8B8", lineHeight:1.78, marginBottom:step.tip ? 16 : 22 }}>{step.body}</div>

      {step.tip && (
        <div style={{ background:"rgba(64,160,192,0.06)", border:"1px solid rgba(64,160,192,0.15)", borderRadius:10, padding:"11px 14px", marginBottom:20, display:"flex", gap:10, alignItems:"flex-start" }}>
          <span style={{ fontSize:14, flexShrink:0 }}>💡</span>
          <span style={{ fontSize:12.5, color:"#60B8CC", lineHeight:1.65 }}>{step.tip}</span>
        </div>
      )}

      {/* Click hint for nav steps */}
      {step.clickHint && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16, padding:"8px 12px", background:"rgba(64,160,192,0.04)", borderRadius:8, border:"1px dashed rgba(64,160,192,0.2)" }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#40A0C0", animation:"tutPulse 1.5s ease-in-out infinite", flexShrink:0 }}/>
          <span style={{ fontSize:12, color:"#3A6878", fontFamily:"'DM Mono',monospace" }}>{step.clickHint}</span>
        </div>
      )}

      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        {idx > 0 && (
          <button onClick={() => onBack()}
            style={{ padding:"10px 14px", background:"transparent", border:"1px solid #1A3040", borderRadius:11, color:"#5888A0", cursor:"pointer", fontSize:13, transition:"none" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor="#40A0C0"; e.currentTarget.style.color="#A0D0E0"; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor="#1A3040"; e.currentTarget.style.color="#5888A0"; }}
          >← Back</button>
        )}
        <button onClick={() => onNext()}
          style={{
            flex:1, padding:"12px 20px", fontSize:14, fontWeight:700, cursor:"pointer",
            background: step.isLast ? "linear-gradient(135deg,#22C55E,#16A34A)" : "linear-gradient(135deg,#40A0C0,#60C8D8)",
            border:"none", borderRadius:12, color:"#fff",
            boxShadow: step.isLast ? "0 3px 20px rgba(34,197,94,0.4)" : "0 3px 20px rgba(64,160,192,0.3)",
            transition:"opacity .15s, transform .12s",
          }}
          onMouseEnter={e=>{ e.currentTarget.style.opacity=".88"; e.currentTarget.style.transform="translateY(-1px)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.opacity="1"; e.currentTarget.style.transform="none"; }}
        >
          {step.cta || (step.isLast ? "Let's go! 🚀" : "Next →")}
        </button>
        {!step.isLast && (
          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
            <button onClick={() => onSkip()}
              style={{ padding:"5px 10px", background:"transparent", border:"none", color:"#2A5060", cursor:"pointer", fontSize:11, whiteSpace:"nowrap", transition:"color .15s", fontFamily:"'DM Mono',monospace" }}
              onMouseEnter={e=>e.currentTarget.style.color="#60A0B0"}
              onMouseLeave={e=>e.currentTarget.style.color="#2A5060"}
            >skip section</button>
            <button onClick={() => onSkipAll()}
              style={{ padding:"5px 10px", background:"transparent", border:"none", color:"#1A3540", cursor:"pointer", fontSize:11, whiteSpace:"nowrap", transition:"color .15s", fontFamily:"'DM Mono',monospace" }}
              onMouseEnter={e=>e.currentTarget.style.color="#2A5060"}
              onMouseLeave={e=>e.currentTarget.style.color="#1A3540"}
            >skip all</button>
          </div>
        )}
      </div>

      {/* Don't show again */}
      <label style={{ display:"flex", alignItems:"center", gap:9, marginTop:16, cursor:"pointer", userSelect:"none" }}>
        <div onClick={()=>setDontShow(!dontShow)} style={{
          width:16, height:16, borderRadius:4, flexShrink:0,
          border:`2px solid ${dontShow ? "#40A0C0" : "#1A3040"}`,
          background:dontShow ? "#40A0C0" : "transparent",
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"all .15s",
        }}>
          {dontShow && <span style={{ color:"#000", fontSize:10, fontWeight:700, lineHeight:1 }}>✓</span>}
        </div>
        <span onClick={()=>setDontShow(!dontShow)} style={{ fontSize:11, color:"#1A3540", lineHeight:1, fontFamily:"'DM Mono',monospace" }}>
          don't show again
        </span>
      </label>
    </div>
  );
}

// ─── Click blocker with hole ─────────────────────────────────────────────────
function ClickBlockerWithHole({ rect }) {
  if (!rect) return <div style={{ position:"fixed", inset:0, zIndex:9996, pointerEvents:"all" }}/>;
  const pad = 9;
  const x = rect.left - pad, y = rect.top - pad;
  const w = rect.width + pad*2, h = rect.height + pad*2;
  const s = { position:"fixed", zIndex:9996, pointerEvents:"all", background:"transparent" };
  return (
    <>
      <div style={{ ...s, left:0, top:0, right:0, height:y }}/>
      <div style={{ ...s, left:0, top:y+h, right:0, bottom:0 }}/>
      <div style={{ ...s, left:0, top:y, width:x, height:h }}/>
      <div style={{ ...s, left:x+w, top:y, right:0, height:h }}/>
    </>
  );
}

// ─── Main BubbleTutorial ────────────────────────────────────────────────────
export function BubbleTutorial({ onDone, setCollapsed, setPage }) {
  const [idx, setIdx] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const step = STEPS[idx];
  const rect = useRect(step.target, idx);

  useEffect(() => { setCollapsed?.(false); }, []); // eslint-disable-line

  const finish = useCallback(() => {
    if (dontShow) localStorage.setItem("autopilot_tutorial_v1", "done");
    onDone?.();
  }, [onDone, dontShow]);

  const next = useCallback((alreadyNavigated = false) => {
    const s = STEPS[idx];
    if (s.isLast) { finish(); return; }
    if (s.page && setPage && !alreadyNavigated) {
      setPage(s.page);
      setNavigating(true);
      setTimeout(() => { setIdx(i => i + 1); setNavigating(false); }, 450);
    } else {
      setIdx(i => Math.min(STEPS.length - 1, i + 1));
    }
  }, [idx, finish, setPage]);

  const back = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);
  const skip = useCallback(() => setIdx(nextSectionIdx(idx)), [idx]);
  const skipAll = useCallback(() => setIdx(STEPS.length - 1), []);

  // Let the highlighted element be clicked natively — it auto-advances the tutorial
  useEffect(() => {
    if (!step.target) return;
    const el = document.querySelector(`[data-tutorial="${step.target}"]`);
    if (!el) return;
    const isNavStep = step.type === "nav";
    const handler = () => next(isNavStep);
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [step.target, step.type, next]);

  const CSS = `
    @keyframes tutFadeIn { from { opacity:0; transform:translateY(10px) scale(.97) } to { opacity:1; transform:none } }
    @keyframes tutPulse  { 0%,100% { box-shadow:0 0 0 4px rgba(64,160,192,.15),0 0 28px rgba(64,160,192,.3) } 50% { box-shadow:0 0 0 8px rgba(64,160,192,.06),0 0 44px rgba(64,160,192,.5) } }
    @keyframes tutBounceRight { 0%,100% { transform:translateX(0); opacity:1; } 50% { transform:translateX(-6px); opacity:0.5; } }
  `;

  if (navigating) return (
    <>
      <style>{CSS}</style>
      <div style={{ position:"fixed", inset:0, background:"rgba(2,8,12,0.88)", zIndex:9997, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontFamily:"'DM Mono',monospace", color:"#40A0C0", fontSize:13, animation:"tutFadeIn .3s ease" }}>// navigating…</div>
      </div>
    </>
  );

  const hasTarget = !!step.target;
  const isCenter = step.position === "center" || !hasTarget;

  return (
    <>
      <style>{CSS}</style>
      {isCenter ? (
        <div style={{ position:"fixed", inset:0, background:"rgba(2,8,12,0.88)", zIndex:9997, pointerEvents:"all" }}/>
      ) : (
        <>
          <Spotlight rect={rect}/>
          <ClickBlockerWithHole rect={rect}/>
        </>
      )}
      <Bubble
        step={step} idx={idx} rect={rect}
        onNext={next} onBack={back} onSkip={skip} onSkipAll={skipAll}
        dontShow={dontShow} setDontShow={setDontShow}
      />
    </>
  );
}

// ─── Daily login tip toast ─────────────────────────────────────────────────
export function LoginTip() {
  const [visible, setVisible] = useState(false);
  const [tip, setTip] = useState(null);

  useEffect(() => {
    if (sessionStorage.getItem("autopilot_tip_shown")) return;
    sessionStorage.setItem("autopilot_tip_shown", "1");
    const nextIdx = (parseInt(localStorage.getItem("autopilot_tip_idx") || "-1") + 1) % LOGIN_TIPS.length;
    localStorage.setItem("autopilot_tip_idx", String(nextIdx));
    setTip(LOGIN_TIPS[nextIdx]);
    const t = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(t);
  }, []);

  if (!visible || !tip) return null;

  return (
    <>
      <style>{`@keyframes tipSlideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:none } }`}</style>
      <div style={{
        position:"fixed", bottom:16, right:16, left:16, zIndex:1000,
        maxWidth:340, marginLeft:"auto",
        background:"linear-gradient(155deg,#091618,#060E10)",
        border:"1px solid #1A3A48",
        borderRadius:16, padding:"16px 18px",
        boxShadow:"0 8px 44px rgba(0,0,0,0.65), 0 0 0 1px rgba(64,160,192,0.08)",
        animation:"tipSlideUp .35s cubic-bezier(.22,1,.36,1)",
        display:"flex", gap:13, alignItems:"flex-start",
      }}>
        <span style={{ fontSize:22, flexShrink:0, marginTop:1 }}>{tip.icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:10, color:"#3A7088", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", marginBottom:5, fontFamily:"'DM Mono',monospace" }}>// daily_tip</div>
          <div style={{ fontSize:13, color:"#6A9AAA", lineHeight:1.68 }}>{tip.text}</div>
        </div>
        <button onClick={()=>setVisible(false)}
          style={{ background:"none", border:"none", color:"#2A5060", cursor:"pointer", fontSize:20, lineHeight:1, flexShrink:0, padding:"0 0 0 6px", marginTop:-2, transition:"color .15s" }}
          onMouseEnter={e=>e.currentTarget.style.color="#60A0B0"}
          onMouseLeave={e=>e.currentTarget.style.color="#2A5060"}
        >×</button>
      </div>
    </>
  );
}
