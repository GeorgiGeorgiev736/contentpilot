import { useState, useEffect, useCallback } from "react";

// ─── Steps ─────────────────────────────────────────────────────────────────
// type: "welcome" | "nav" (highlights sidebar item, navigates on Next) | "page" (highlights page element) | "done"
// Skip always jumps to the first step of the next section.
const STEPS = [
  // ── Welcome ──────────────────────────────────────────────────────────────────
  {
    section: "welcome", type: "welcome", position: "center",
    title: "Welcome to Autopilot 👋",
    body: "Upload one video and let AI turn it into a full week of content — titles, hashtags, Shorts, captions, and scheduled posts handled automatically. Let's walk through it in 60 seconds.",
  },

  // ── Post Content (navigate there) ────────────────────────────────────────────
  {
    section: "postcontent", type: "nav", target: "nav-postcontent", page: "postcontent", position: "right",
    title: "Step 1 · Post Content is your home base",
    body: "Everything starts here. Upload a video, trim a clip, generate AI metadata, then schedule — all in one place without leaving the page.",
    tip: "Your video stays in your browser until you hit Schedule. No file size limit because it uploads directly to YouTube.",
  },

  // ── Choose Video ─────────────────────────────────────────────────────────────
  {
    section: "postcontent", type: "page", target: "postcontent-drop", position: "below",
    title: "Drop your video or click Choose Video",
    body: "Drag any MP4, MOV or AVI file here — or click to browse. Autopilot supports videos of any size because the upload goes straight from your browser to YouTube.",
  },

  // ── Edit & Clip ───────────────────────────────────────────────────────────────
  {
    section: "edit", type: "page", target: "postcontent-edit-btn", position: "below",
    title: "Step 2 · Trim & clip",
    body: "Set a start and end time to trim your video, or tick the Short/Reel box to produce an automatic vertical 9:16 version at the same time. Skip editing if you want to upload the full video as-is.",
    tip: "Cropping to 9:16 makes the same video eligible for YouTube Shorts, TikTok, and Instagram Reels.",
  },

  // ── AI Metadata ───────────────────────────────────────────────────────────────
  {
    section: "ai", type: "page", target: "postcontent-ai-btn", position: "below",
    title: "Step 3 · AI writes your title & hashtags",
    body: "Hit Generate with AI and watch it stream a viral-optimised title, 2–3 paragraph description, and 20 hashtags in seconds. Every field is editable before you post.",
    tip: "AI uses your filename and target platform to tailor the output for maximum reach.",
  },

  // ── Auto-clip ─────────────────────────────────────────────────────────────────
  {
    section: "autoclip", type: "page", target: "postcontent-autoclip", position: "below",
    title: "Step 4 · Auto-clip into Shorts",
    body: "Click Enable on the Auto-clip panel: Autopilot finds 4–6 viral moments in your video, trims each to 9:16, overlays a caption, and batch-schedules them to TikTok, Instagram Reels, and YouTube Shorts — 6 hours apart.",
    tip: "One 60-minute video can fill your entire week with zero extra editing.",
  },

  // ── Done ──────────────────────────────────────────────────────────────────────
  {
    section: "done", type: "done", position: "center", isLast: true,
    title: "You're ready to go! 🚀",
    body: "Upload a video → generate AI metadata → hit Schedule. Or use Auto-clip to turn one recording into a week of Shorts automatically.",
  },
];

// One progress dot per section
const SECTION_IDS = ["welcome", "postcontent", "edit", "ai", "autoclip", "done"];

// Jump to first step of the next section
function nextSectionIdx(fromIdx) {
  const cur = STEPS[fromIdx].section;
  for (let i = fromIdx + 1; i < STEPS.length; i++) {
    if (STEPS[i].section !== cur) return i;
  }
  return STEPS.length - 1;
}

// ─── Daily login tips ───────────────────────────────────────────────────────
export const LOGIN_TIPS = [
  { icon: "💡", text: "Reels posted between 6–9 PM get 40% more reach. Check Analytics → Best Times to find your personal window." },
  { icon: "🔥", text: "Upload one podcast this week and let Autopilot clip it into 7 Shorts — a full week of content from one recording." },
  { icon: "📈", text: "AI & productivity topics are trending +300% right now. Open Trend Radar and scan your niche." },
  { icon: "⏰", text: "Haven't scheduled anything this week? Head to Video Clipper to batch-create Shorts in minutes." },
  { icon: "✨", text: "Use the same script on 3 platforms but A/B test different thumbnails — AI can generate multiple variations." },
  { icon: "🎯", text: "Weekends drive 2× more profile visits on TikTok. Schedule your strongest content for Saturday morning." },
  { icon: "📝", text: "Scripts under 60 seconds get 40% more shares. Use the Short Script template in Script Writer." },
  { icon: "🚀", text: "Connect a separate YouTube Shorts account in Platforms for double the algorithmic reach." },
  { icon: "🎬", text: "Generate a full AI Avatar video without a camera. Try Script Writer → Generate Avatar." },
  { icon: "📊", text: "Check Analytics weekly — your top 3 topics should drive all of next week's content strategy." },
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
    // Extra delay after page navigation
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
      <svg
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 9997, pointerEvents: "none" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="tut-spot">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect x={x} y={y} width={w} height={h} rx="11" fill="black" />
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(2,2,16,0.85)" mask="url(#tut-spot)" />
      </svg>
      <div style={{
        position: "fixed",
        left: x, top: y, width: w, height: h,
        borderRadius: 11,
        border: "2px solid #9B79FC",
        boxShadow: "0 0 0 4px rgba(124,92,252,0.18), 0 0 28px rgba(124,92,252,0.4)",
        zIndex: 9998,
        pointerEvents: "none",
        animation: "tutPulse 2s ease-in-out infinite",
      }} />
    </>
  );
}

// ─── Bubble tooltip ─────────────────────────────────────────────────────────
const BW = { right: 360, below: 380, center: 500 };

function getBubbleStyle(step, rect) {
  const { position } = step;
  if (position === "center" || !rect) {
    return { style: { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: BW.center }, arrowLeft: null };
  }
  if (position === "right") {
    return {
      style: { position: "fixed", left: rect.right + 24, top: Math.max(16, Math.min(rect.top + rect.height / 2 - 140, window.innerHeight - 390)), width: BW.right },
      arrowLeft: null,
    };
  }
  if (position === "below") {
    const w = BW.below;
    const left = Math.max(16, Math.min(rect.left + rect.width / 2 - w / 2, window.innerWidth - w - 16));
    return {
      style: { position: "fixed", left, top: Math.min(rect.bottom + 20, window.innerHeight - 380), width: w },
      arrowLeft: (rect.left + rect.width / 2) - left,
    };
  }
  return { style: { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: BW.center }, arrowLeft: null };
}

function Bubble({ step, idx, rect, onNext, onBack, onSkip, dontShow, setDontShow }) {
  const { style: posStyle, arrowLeft } = getBubbleStyle(step, rect);
  const sectionPos = SECTION_IDS.indexOf(step.section);

  return (
    <div style={{
      ...posStyle,
      zIndex: 10000,
      background: "linear-gradient(155deg,#151530 0%,#0F0F26 100%)",
      border: "1px solid #3E2E94",
      borderRadius: 20,
      padding: "26px 28px",
      boxShadow: "0 16px 64px rgba(0,0,0,0.85), 0 0 0 1px rgba(124,92,252,0.1), inset 0 1px 0 rgba(255,255,255,0.04)",
      animation: "tutFadeIn .28s cubic-bezier(.22,1,.36,1)",
    }}>

      {/* Arrow: left (for sidebar nav steps) */}
      {step.position === "right" && rect && (
        <div style={{
          position: "absolute", left: -11, top: "38%",
          width: 0, height: 0,
          borderTop: "11px solid transparent",
          borderBottom: "11px solid transparent",
          borderRight: "11px solid #3E2E94",
        }} />
      )}
      {/* Arrow: up (for below-element page steps) */}
      {step.position === "below" && rect && arrowLeft != null && (
        <div style={{
          position: "absolute", top: -11,
          left: Math.max(16, Math.min(arrowLeft, (BW.below) - 22)) - 11,
          width: 0, height: 0,
          borderLeft: "11px solid transparent",
          borderRight: "11px solid transparent",
          borderBottom: "11px solid #3E2E94",
        }} />
      )}

      {/* Section progress dots */}
      <div style={{ display: "flex", gap: 5, marginBottom: 20 }}>
        {SECTION_IDS.map((s, i) => (
          <div key={s} style={{
            height: 4, borderRadius: 4, flexShrink: 0,
            width: i === sectionPos ? 24 : 8,
            background: i < sectionPos ? "#7C5CFC" : i === sectionPos ? "#C4B5FD" : "#1E1E44",
            transition: "all .35s cubic-bezier(.4,0,.2,1)",
          }} />
        ))}
      </div>

      {/* "On this page" label for page steps */}
      {step.type === "page" && (
        <div style={{ fontSize: 11, color: "#9B79FC", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>
          On this page
        </div>
      )}

      <div style={{ fontSize: 18, fontWeight: 800, color: "#F2F2FF", marginBottom: 10, lineHeight: 1.3 }}>
        {step.title}
      </div>
      <div style={{ fontSize: 14, color: "#9090C0", lineHeight: 1.78, marginBottom: step.tip ? 16 : 24 }}>
        {step.body}
      </div>

      {step.tip && (
        <div style={{
          background: "#7C5CFC09", border: "1px solid #7C5CFC22",
          borderRadius: 12, padding: "12px 15px", marginBottom: 22,
          display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
          <span style={{ fontSize: 12.5, color: "#B09FFF", lineHeight: 1.65 }}>{step.tip}</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {idx > 0 && (
          <button
            onClick={onBack}
            style={{ padding: "10px 16px", background: "transparent", border: "1px solid #2A2A50", borderRadius: 11, color: "#8888B8", cursor: "pointer", fontSize: 13, transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#5050A0"; e.currentTarget.style.color = "#C0C0E0"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2A50"; e.currentTarget.style.color = "#8888B8"; }}
          >← Back</button>
        )}
        <button
          onClick={onNext}
          style={{
            flex: 1, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
            background: step.isLast ? "linear-gradient(135deg,#22C55E,#16A34A)" : "linear-gradient(135deg,#7C5CFC,#B45AFD)",
            border: "none", borderRadius: 12, color: "#fff",
            boxShadow: step.isLast ? "0 3px 20px rgba(34,197,94,0.45)" : "0 3px 20px rgba(124,92,252,0.5)",
            transition: "opacity .15s, transform .12s",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = ".88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "none"; }}
        >
          {step.isLast ? "Let's go! 🚀" : step.page ? "Take me there →" : "Next →"}
        </button>
        {!step.isLast && (
          <button
            onClick={onSkip}
            style={{ padding: "10px 12px", background: "transparent", border: "none", color: "#5858A0", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap", transition: "color .15s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#9898C0"}
            onMouseLeave={e => e.currentTarget.style.color = "#5858A0"}
          >Skip section</button>
        )}
      </div>

      {/* Don't show again checkbox */}
      <label style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 16, cursor: "pointer", userSelect: "none" }}>
        <div
          onClick={() => setDontShow(!dontShow)}
          style={{
            width: 17, height: 17, borderRadius: 5, flexShrink: 0,
            border: `2px solid ${dontShow ? "#7C5CFC" : "#3A3A60"}`,
            background: dontShow ? "#7C5CFC" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all .15s",
          }}
        >
          {dontShow && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
        </div>
        <span onClick={() => setDontShow(!dontShow)} style={{ fontSize: 12, color: "#5858A0", lineHeight: 1 }}>
          Don't show this tutorial again
        </span>
      </label>
    </div>
  );
}

// ─── Click blocker with a transparent hole over the highlighted element ─────
// Four divs that surround the rect, blocking all clicks except inside the hole.
function ClickBlockerWithHole({ rect }) {
  if (!rect) {
    return <div style={{ position: "fixed", inset: 0, zIndex: 9996, pointerEvents: "all" }} />;
  }
  const pad = 9;
  const x = rect.left - pad, y = rect.top - pad;
  const w = rect.width + pad * 2, h = rect.height + pad * 2;
  const s = { position: "fixed", zIndex: 9996, pointerEvents: "all", background: "transparent" };
  return (
    <>
      <div style={{ ...s, left: 0, top: 0, right: 0, height: y }} />
      <div style={{ ...s, left: 0, top: y + h, right: 0, bottom: 0 }} />
      <div style={{ ...s, left: 0, top: y, width: x, height: h }} />
      <div style={{ ...s, left: x + w, top: y, right: 0, height: h }} />
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

  // Keep sidebar open so nav items are always measurable
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
      setTimeout(() => { setIdx(i => i + 1); setNavigating(false); }, 400);
    } else {
      setIdx(i => Math.min(STEPS.length - 1, i + 1));
    }
  }, [idx, finish, setPage]);

  const back = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);

  // Skip = jump to first step of the next section
  const skip = useCallback(() => setIdx(nextSectionIdx(idx)), [idx]);

  // Let the highlighted element be clicked organically — it fires its own
  // handler first (navigation / connect etc.), then we advance the tutorial.
  useEffect(() => {
    if (!step.target) return;
    const el = document.querySelector(`[data-tutorial="${step.target}"]`);
    if (!el) return;
    // nav steps: element already navigates, so skip internal setPage call
    const isNavStep = step.type === "nav";
    const handler = () => next(isNavStep);
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [step.target, step.type, next]);

  const CSS = `
    @keyframes tutFadeIn { from { opacity:0; transform:translateY(10px) scale(.97) } to { opacity:1; transform:none } }
    @keyframes tutPulse  { 0%,100% { box-shadow:0 0 0 4px rgba(124,92,252,.18),0 0 28px rgba(124,92,252,.35) } 50% { box-shadow:0 0 0 8px rgba(124,92,252,.08),0 0 44px rgba(124,92,252,.55) } }
  `;

  if (navigating) return (
    <>
      <style>{CSS}</style>
      <div style={{ position: "fixed", inset: 0, background: "rgba(2,2,16,0.85)", zIndex: 9997 }} />
    </>
  );

  const hasTarget = !!step.target;
  const isCenter = step.position === "center" || !hasTarget;

  return (
    <>
      <style>{CSS}</style>
      {isCenter ? (
        // Center steps: full backdrop, no hole needed
        <div style={{ position: "fixed", inset: 0, background: "rgba(2,2,16,0.85)", zIndex: 9997, pointerEvents: "all" }} />
      ) : (
        <>
          {/* Spotlight visual + click blocker with hole over the element */}
          <Spotlight rect={rect} />
          <ClickBlockerWithHole rect={rect} />
        </>
      )}
      <Bubble
        step={step} idx={idx} rect={rect}
        onNext={next} onBack={back} onSkip={skip}
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
        position: "fixed", bottom: 24, right: 24, zIndex: 1000,
        background: "linear-gradient(155deg,#141432,#0F0F28)",
        border: "1px solid #3A2A8A",
        borderRadius: 16, padding: "16px 18px", width: 340,
        boxShadow: "0 8px 44px rgba(0,0,0,0.65), 0 0 0 1px rgba(124,92,252,0.1)",
        animation: "tipSlideUp .35s cubic-bezier(.22,1,.36,1)",
        display: "flex", gap: 13, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{tip.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, color: "#6060A0", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 5 }}>
            Daily tip
          </div>
          <div style={{ fontSize: 13, color: "#9898C8", lineHeight: 1.68 }}>{tip.text}</div>
        </div>
        <button
          onClick={() => setVisible(false)}
          style={{ background: "none", border: "none", color: "#5050A0", cursor: "pointer", fontSize: 20, lineHeight: 1, flexShrink: 0, padding: "0 0 0 6px", marginTop: -2, transition: "color .15s" }}
          onMouseEnter={e => e.currentTarget.style.color = "#A0A0C8"}
          onMouseLeave={e => e.currentTarget.style.color = "#5050A0"}
        >×</button>
      </div>
    </>
  );
}
