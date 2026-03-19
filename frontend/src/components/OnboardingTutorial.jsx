import { useState } from "react";

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to Autopilot 👋",
    body: "Autopilot turns your ideas, podcasts, and trends into a full content engine — scripted, edited, scheduled, and posted across every platform while you sleep. This 2-minute tour shows you exactly how it works.",
    illustration: "🚀",
    diagram: null, // custom per-step
  },
  {
    id: "podcast",
    title: "Turn one podcast into 10 viral Shorts",
    body: "Upload any long-form video. AI reads the transcript and picks the most engaging 30–60 second moments. Each clip gets auto-cropped to 9:16, captions burned in, a thumbnail generated, then gets scheduled to release every few hours across all three platforms — all from one upload.",
    illustration: "🎙",
    diagram: null,
  },
  {
    id: "trends",
    title: "Ride a trend from idea to posted in 10 minutes",
    body: "See a trending topic → AI writes a scroll-stopping script, generates a thumbnail concept, and renders a talking-head avatar video using your photo and chosen voice — no camera needed. Then schedule it to all platforms in one click.",
    illustration: "📡",
    diagram: null,
  },
  {
    id: "platforms",
    title: "Connect your channels first",
    body: "Before posting, connect your YouTube, TikTok and Instagram accounts. Each platform uses official OAuth — you approve it on their site, we never see your password. You can connect a main YouTube channel and a separate YouTube Shorts channel.",
    illustration: "🔗",
    diagram: null,
  },
  {
    id: "credits",
    title: "AI Credits — what they cost",
    body: "Every AI feature uses credits from your monthly allowance:",
    illustration: "✦",
    diagram: null,
  },
];

function FlowBox({ children, style = {} }) {
  return (
    <div style={{
      background: "#080816",
      border: "1px solid #2A2A50",
      borderRadius: 12,
      padding: "12px 18px",
      fontSize: 13,
      color: "#C8C8E8",
      fontWeight: 500,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Arrow({ vertical = false }) {
  if (vertical) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        color: "#7C5CFC",
        fontSize: 18,
        lineHeight: 1,
        margin: "2px 0",
        fontWeight: 700,
      }}>↓</div>
    );
  }
  return (
    <div style={{
      color: "#7C5CFC",
      fontSize: 18,
      fontWeight: 700,
      lineHeight: 1,
      flexShrink: 0,
      alignSelf: "center",
    }}>→</div>
  );
}

function StepNum({ n }) {
  return (
    <div style={{
      background: "linear-gradient(135deg,#7C5CFC,#B45AFD)",
      color: "#fff",
      width: 28,
      height: 28,
      borderRadius: "50%",
      fontWeight: 700,
      fontSize: 13,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}>{n}</div>
  );
}

/* ── Step diagrams ──────────────────────────────────── */

function DiagramWelcome() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
      <FlowBox style={{ flex: 1, minWidth: 120, textAlign: "center" }}>
        <div style={{ fontSize: 22, marginBottom: 4 }}>💡</div>
        Idea / Podcast
      </FlowBox>
      <Arrow />
      <FlowBox style={{ flex: 1, minWidth: 120, textAlign: "center", border: "1px solid #7C5CFC44", background: "linear-gradient(135deg,#0D0B24,#12102A)" }}>
        <div style={{ fontSize: 22, marginBottom: 4 }}>🤖</div>
        <span style={{ background: "linear-gradient(90deg,#7C5CFC,#B45AFD)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}>AI Engine</span>
      </FlowBox>
      <Arrow />
      <FlowBox style={{ flex: 1, minWidth: 120, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ color: "#FF0000", fontWeight: 700 }}>▶</span>
          <span style={{ color: "#69C9D0", fontWeight: 700 }}>♪</span>
          <span style={{ color: "#E1306C", fontWeight: 700 }}>◈</span>
        </div>
        YouTube · TikTok<br/>· Instagram
      </FlowBox>
    </div>
  );
}

function DiagramPodcast() {
  const steps = [
    { icon: "🎙", text: "Upload podcast / long video" },
    { icon: "🤖", text: "AI detects 5–10 viral clip moments" },
    { icon: "✂", text: "Auto-crop, captions, thumbnail" },
    { icon: "📅", text: "Batch schedule: every 6h → TikTok · Reels · Shorts" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 24 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StepNum n={i + 1} />
            <FlowBox style={{ flex: 1 }}>
              <span style={{ marginRight: 8 }}>{s.icon}</span>{s.text}
            </FlowBox>
          </div>
          {i < steps.length - 1 && <Arrow vertical />}
        </div>
      ))}
    </div>
  );
}

function DiagramTrends() {
  const steps = [
    { icon: "📡", text: "Trend Radar detects viral topic" },
    { icon: "✦", text: "AI writes script + title + thumbnail" },
    { icon: "🤖", text: "Avatar renders your talking-head video (costs 15 credits)" },
    { icon: "🚀", text: "Schedule to YouTube · TikTok · Instagram" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 24 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StepNum n={i + 1} />
            <FlowBox style={{ flex: 1 }}>
              <span style={{ marginRight: 8 }}>{s.icon}</span>{s.text}
            </FlowBox>
          </div>
          {i < steps.length - 1 && <Arrow vertical />}
        </div>
      ))}
    </div>
  );
}

function DiagramPlatforms() {
  const platforms = [
    { id: "youtube",   label: "YouTube",   color: "#FF0000", icon: "▶" },
    { id: "tiktok",    label: "TikTok",    color: "#69C9D0", icon: "♪" },
    { id: "instagram", label: "Instagram", color: "#E1306C", icon: "◈" },
  ];
  return (
    <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {platforms.map(p => (
          <div key={p.id} style={{
            flex: 1,
            minWidth: 120,
            background: "#080816",
            border: `1px solid ${p.color}33`,
            borderRadius: 14,
            padding: "16px 14px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 28, color: p.color, marginBottom: 8 }}>{p.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E0E0F0", marginBottom: 8 }}>{p.label}</div>
            <div style={{
              display: "inline-block",
              background: `${p.color}18`,
              border: `1px solid ${p.color}33`,
              color: p.color,
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 20,
              cursor: "default",
            }}>Connect →</div>
          </div>
        ))}
      </div>
      <div style={{
        display: "inline-flex",
        alignSelf: "flex-start",
        alignItems: "center",
        gap: 8,
        background: "#FF000010",
        border: "1px solid #FF000022",
        borderRadius: 10,
        padding: "7px 14px",
        fontSize: 12,
        color: "#FF8888",
      }}>
        <span style={{ color: "#FF0000", fontWeight: 700 }}>▶</span>
        YouTube Shorts (2nd channel)
        <span style={{ background: "#FF000018", color: "#FF6666", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 12 }}>Optional</span>
      </div>
    </div>
  );
}

function DiagramCredits() {
  const items = [
    { label: "Scan trends",        cost: 2 },
    { label: "Write script",       cost: 3 },
    { label: "Optimize video",     cost: 2 },
    { label: "Detect clips (AI)",  cost: 3 },
    { label: "Generate thumbnail", cost: 2 },
    { label: "Run full pipeline",  cost: 10 },
    { label: "AI Avatar video",    cost: 15 },
  ];
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "0",
        background: "#080816",
        border: "1px solid #2A2A50",
        borderRadius: 14,
        overflow: "hidden",
        marginBottom: 14,
      }}>
        {/* header */}
        <div style={{ padding: "9px 16px", fontSize: 11, color: "#7878A8", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700, borderBottom: "1px solid #1A1A38" }}>Feature</div>
        <div style={{ padding: "9px 16px", fontSize: 11, color: "#7878A8", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700, borderBottom: "1px solid #1A1A38", textAlign: "right" }}>Cost</div>
        {items.map((item, i) => (
          <div key={item.label} style={{ display: "contents" }}>
            <div style={{
              padding: "9px 16px",
              fontSize: 13,
              color: "#C8C8E8",
              borderBottom: i < items.length - 1 ? "1px solid #14143A" : "none",
            }}>{item.label}</div>
            <div style={{
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 700,
              color: item.cost >= 10 ? "#B45AFD" : item.cost >= 5 ? "#F59E0B" : "#7C5CFC",
              borderBottom: i < items.length - 1 ? "1px solid #14143A" : "none",
              textAlign: "right",
            }}>{item.cost}✦</div>
          </div>
        ))}
      </div>
      <div style={{
        fontSize: 13,
        color: "#A0A0C8",
        background: "#7C5CFC0A",
        border: "1px solid #7C5CFC22",
        borderRadius: 10,
        padding: "10px 14px",
        lineHeight: 1.6,
      }}>
        Free plan gives you <strong style={{ color: "#B09FFF" }}>10 credits</strong> to try everything. Upgrade anytime.
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────── */

export default function OnboardingTutorial({ onDone }) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  const finish = () => {
    localStorage.setItem("autopilot_tutorial_v1", "done");
    onDone();
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setExiting(true);
      setTimeout(() => { setStep(s => s + 1); setExiting(false); }, 200);
    } else {
      finish();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setExiting(true);
      setTimeout(() => { setStep(s => s - 1); setExiting(false); }, 200);
    }
  };

  const current = STEPS[step];

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.92)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px 16px",
      backdropFilter: "blur(8px)",
    }}>
      <style>{`
        @keyframes tutFadeIn {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tutFadeOut {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-10px); }
        }
        .tut-card {
          animation: tutFadeIn 0.32s cubic-bezier(.22,1,.36,1) both;
        }
        .tut-card.exiting {
          animation: tutFadeOut 0.18s ease forwards;
        }
        .tut-skip {
          background: none;
          border: none;
          color: #7878A8;
          cursor: pointer;
          font-size: 13px;
          font-family: inherit;
          text-decoration: underline;
          text-underline-offset: 3px;
          padding: 0;
          transition: color .15s;
        }
        .tut-skip:hover { color: #B09FFF; }
      `}</style>

      {/* Card */}
      <div
        className={`tut-card${exiting ? " exiting" : ""}`}
        style={{
          width: "100%",
          maxWidth: 780,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#0F0F2A",
          border: "1px solid #7C5CFC44",
          borderRadius: 24,
          padding: "48px 52px",
          boxShadow: "0 0 80px rgba(124,92,252,0.2)",
          position: "relative",
        }}
      >
        {/* Top row: progress dots + skip */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36 }}>
          {/* Progress dots */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                onClick={() => { if (i <= step) { setExiting(true); setTimeout(() => { setStep(i); setExiting(false); }, 200); } }}
                style={{
                  width: i === step ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === step ? "#7C5CFC" : i < step ? "#7C5CFC44" : "#1E1E42",
                  transition: "all .25s",
                  cursor: i < step ? "pointer" : "default",
                }}
              />
            ))}
            <span style={{ fontSize: 12, color: "#5A5A80", marginLeft: 4 }}>{step + 1} / {STEPS.length}</span>
          </div>

          {/* Skip */}
          <button className="tut-skip" onClick={finish}>Skip tutorial</button>
        </div>

        {/* Illustration + title */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 52,
            lineHeight: 1,
            marginBottom: 16,
            filter: "drop-shadow(0 0 20px rgba(124,92,252,0.4))",
          }}>
            {current.illustration}
          </div>
          <h2 style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#F5F5FF",
            letterSpacing: "-.04em",
            lineHeight: 1.25,
            marginBottom: 14,
          }}>
            {current.title}
          </h2>
          <p style={{
            fontSize: 15,
            color: "#A0A0C8",
            lineHeight: 1.7,
            maxWidth: 640,
          }}>
            {current.body}
          </p>
        </div>

        {/* Per-step diagram */}
        {step === 0 && <DiagramWelcome />}
        {step === 1 && <DiagramPodcast />}
        {step === 2 && <DiagramTrends />}
        {step === 3 && <DiagramPlatforms />}
        {step === 4 && <DiagramCredits />}

        {/* Navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 36 }}>
          <div>
            {step > 0 && (
              <button
                onClick={handleBack}
                className="btn-ghost"
                style={{ padding: "0 24px", height: 44, fontSize: 14 }}
              >
                ← Back
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Step label */}
            <span style={{ fontSize: 12, color: "#5A5A80" }}>
              {["Welcome", "Podcast Workflow", "Trend Workflow", "Platforms", "Credits"][step]}
            </span>

            {step < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className="btn-primary"
                style={{ padding: "0 28px", height: 44, fontSize: 14 }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={finish}
                className="btn-primary"
                style={{ padding: "0 32px", height: 44, fontSize: 15, fontWeight: 800 }}
              >
                Let's go →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
