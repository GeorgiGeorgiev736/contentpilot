import { useState, useEffect } from "react";
import { paypal } from "../services/api";
import { useAuth } from "../hooks/useAuth";

// 1 AI credit = 1 feature run (script, trend scan, optimize, etc.)
// Each costs ~$0.01–0.05 in API fees — prices below are profitable at stated credit limits
const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    credits: 10,
    creditLabel: "10 credits",
    creditNote: "one-time",
    color: "#8888B8",
    features: [
      "10 AI generations (one-time)",
      "1 platform connection",
      "Trend radar",
      "Basic video optimizer",
      "Community support",
    ],
  },
  {
    id: "creator",
    name: "Creator",
    price: 19,
    credits: 200,
    creditLabel: "200 credits",
    creditNote: "per month",
    color: "#3B82F6",
    features: [
      "200 AI credits/month (~6/day)",
      "All 3 platforms (YouTube, TikTok, Instagram)",
      "Content scheduler",
      "Video Clipper & Shorts maker",
      "Trend radar + Script writer",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 49,
    credits: 500,
    creditLabel: "500 credits",
    creditNote: "per month",
    color: "#7C5CFC",
    popular: true,
    features: [
      "500 AI credits/month (~16/day)",
      "All platforms",
      "Full AI pipeline autopilot",
      "Thumbnail designer",
      "Analytics dashboard",
      "Video Clipper & Shorts maker",
      "Priority support",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: 149,
    credits: 1500,
    creditLabel: "1,500 credits",
    creditNote: "per month",
    color: "#22C55E",
    features: [
      "1,500 AI credits/month (~50/day)",
      "Everything in Pro",
      "5 team members · 10 channels",
      "White-label reports",
      "API access",
      "Dedicated account manager",
    ],
  },
  {
    id: "max",
    name: "Max",
    price: 349,
    credits: 5000,
    creditLabel: "5,000 credits",
    creditNote: "per month",
    color: "#F59E0B",
    badge: "AI AVATAR",
    features: [
      "5,000 AI credits/month (~166/day)",
      "Everything in Business",
      "AI Avatar video generation",
      "Custom avatar & voice cloning",
      "Unlimited team members",
      "SLA + dedicated Slack channel",
    ],
  },
];

export default function Pricing({ setPage }) {
  const { user, refreshUser } = useAuth();
  const [plans,   setPlans]   = useState(PLANS);
  const [loading, setLoading] = useState(null);
  const [error,   setError]   = useState("");
  const [notice,  setNotice]  = useState("");

  useEffect(() => {
    // Handle return from PayPal approval
    const params = new URLSearchParams(window.location.search);
    const ppStatus = params.get("paypal");
    const subId    = params.get("subscription_id");
    if (ppStatus === "success" && subId) {
      window.history.replaceState({}, "", window.location.pathname);
      paypal.verify(subId)
        .then(() => { refreshUser(); setNotice("Payment successful! Your plan has been upgraded."); })
        .catch(err => setError(err.message || "PayPal verification failed"));
    }
    if (ppStatus === "cancelled") {
      window.history.replaceState({}, "", window.location.pathname);
      setError("PayPal payment was cancelled.");
    }
  }, []);

  const checkout = async (planId) => {
    if (planId === "free" || user?.plan === planId) return;
    setLoading(planId); setError("");
    try {
      const { url } = await paypal.checkout(planId);
      window.location.href = url;
    } catch (err) { setError(err.message); setLoading(null); }
  };

  const currentPlan = user?.plan || "free";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 34, fontWeight: 800, color: "#F5F5FF", letterSpacing: "-.04em", marginBottom: 10, fontFamily:"'DM Mono',monospace" }}><span style={{ color:"#40A0C0", fontWeight:400 }}>/</span> Pricing</h1>
        <p style={{ color: "#9090B8", fontSize: 16, marginBottom: 8 }}>Start free. Scale as your audience grows.</p>
        <p style={{ color: "#6868A0", fontSize: 13 }}>1 AI credit = 1 feature run (script, trend scan, optimize, etc.) · each costs ~$0.01–0.05 in API fees · credit caps keep your costs predictable</p>
      </div>

      {currentPlan !== "free" && (
        <div style={{ padding: "14px 20px", background: "#7C5CFC08", border: "1px solid #7C5CFC22", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, color: "#B09FFF" }}>
            You're on the <strong style={{ textTransform: "capitalize" }}>{currentPlan}</strong> plan
            {user?.subscription_status === "active" ? " · Active" : user?.subscription_status ? ` · ${user.subscription_status}` : ""}
          </span>
          <button onClick={() => setPage("pricing")} className="btn-ghost" style={{ padding: "7px 16px", fontSize: 13 }}>
            Change Plan →
          </button>
        </div>
      )}

      {currentPlan === "free" && (
        <div style={{ padding: "14px 20px", background: "#F59E0B08", border: "1px solid #F59E0B22", borderRadius: 14, textAlign: "center" }}>
          <span style={{ fontSize: 14, color: "#F59E0B" }}>
            Free plan · {user?.credits ?? 0} of 10 AI credits remaining
          </span>
        </div>
      )}

      {notice && (
        <div style={{ padding: "12px 16px", background: "#22C55E10", border: "1px solid #22C55E33", borderRadius: 10, color: "#22C55E", fontSize: 13 }}>✓ {notice}</div>
      )}
      {error && (
        <div style={{ padding: "12px 16px", background: "#EF444410", border: "1px solid #EF444422", borderRadius: 10, color: "#EF4444", fontSize: 13 }}>{error}</div>
      )}

      {/* Plan cards — 5 across */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 16 }}>
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.id;
          const col = plan.color;
          return (
            <div key={plan.id} style={{
              background: "#0C0C1A",
              border: `2px solid ${plan.popular ? "#7C5CFC" : isCurrent ? "#22C55E44" : "#16162A"}`,
              borderRadius: 18, padding: "22px 18px",
              position: "relative",
              boxShadow: plan.popular ? "0 0 40px #7C5CFC18" : plan.id === "max" ? "0 0 30px #F59E0B10" : "none",
              display: "flex", flexDirection: "column",
            }}>
              {plan.popular && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#7C5CFC,#B45AFD)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 14px", borderRadius: 20, whiteSpace: "nowrap", letterSpacing: ".04em" }}>
                  MOST POPULAR
                </div>
              )}
              {plan.badge && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#F59E0B,#FCD34D)", color: "#000", fontSize: 10, fontWeight: 700, padding: "3px 14px", borderRadius: 20, whiteSpace: "nowrap", letterSpacing: ".04em" }}>
                  {plan.badge}
                </div>
              )}
              {isCurrent && (
                <div style={{ position: "absolute", top: -12, right: 16, background: "#22C55E", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 20, letterSpacing: ".04em" }}>
                  CURRENT
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: col, marginBottom: 6 }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: "#F5F5FF", letterSpacing: "-.04em" }}>
                    {plan.price === 0 ? "Free" : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && <span style={{ fontSize: 13, color: "#8888B8" }}>/mo</span>}
                </div>
                <div style={{ fontSize: 13, color: "#9090B8", marginTop: 4 }}>
                  {plan.creditLabel} <span style={{ color:"#5A5A80" }}>· {plan.creditNote}</span>
                </div>
              </div>

              <button
                onClick={() => checkout(plan.id)}
                disabled={isCurrent || plan.id === "free" || !!loading}
                style={{
                  width: "100%", padding: "11px", marginBottom: 14, borderRadius: 9,
                  border: "none",
                  background: isCurrent || plan.id === "free"
                    ? "#1A1A2E"
                    : "#FFC439",
                  color: isCurrent || plan.id === "free" ? "#3A3A5A" : "#003087",
                  fontWeight: 700, cursor: isCurrent || plan.id === "free" ? "default" : "pointer",
                  fontSize: 13, transition: "all .15s",
                  opacity: loading && loading !== plan.id ? .5 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                {loading === plan.id
                  ? <><span style={{ width: 12, height: 12, border: "2px solid #003087", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 1s linear infinite" }} />Loading…</>
                  : isCurrent ? "Current Plan"
                  : plan.id === "free" ? "Free Forever"
                  : <><span style={{ fontSize: 15, fontWeight: 900 }}>𝐏</span>{`Get ${plan.name} →`}</>}
              </button>

              <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 13, color: "#C0C0D8" }}>
                    <span style={{ color: col, fontSize: 10, marginTop: 2, flexShrink: 0 }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Avatar callout */}
      <div style={{ padding: "22px 26px", background: "linear-gradient(135deg,#F59E0B08,#FCD34D04)", border: "1px solid #F59E0B22", borderRadius: 16, display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ fontSize: 36 }}>🤖</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#F5F5FF", marginBottom: 4 }}>AI Avatar — Max plan exclusive</div>
          <div style={{ fontSize: 13, color: "#9898C0" }}>
            Generate talking-head videos with a custom AI avatar instead of filming yourself. Powered by HeyGen — add your face, voice clone, and script. Your avatar posts for you 24/7.
          </div>
        </div>
        <button onClick={() => checkout("max")} className="btn-primary" style={{ padding: "11px 24px", fontSize: 13, background: "linear-gradient(135deg,#F59E0B,#FCD34D)", color: "#000", whiteSpace: "nowrap" }}>
          Unlock AI Avatar →
        </button>
      </div>

      {/* FAQ */}
      <div className="card" style={{ padding: 28 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#EDEDFA", marginBottom: 20 }}>Common questions</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {[
            ["What counts as an AI generation?", "Each AI button click (generate script, scan trends, optimize video, create thumbnail, etc.) uses 1 credit. Streaming responses count as one even if long."],
            ["Can I switch plans anytime?", "Yes. Upgrade or downgrade at any time. Your new plan takes effect immediately."],
            ["What is AI Avatar (Max)?", "Uses HeyGen's API to generate a talking-head video from your script. Set up once with your face/voice and your avatar records videos automatically."],
            ["Are platform API costs included?", "Yes. YouTube, TikTok and Instagram API usage is included. You only need your own developer app credentials (free) from each platform."],
            ["How does the Video Clipper work?", "Upload any long-form video, drag handles to pick your segment (up to 3 min), and we trim it server-side with FFmpeg. Auto-crops to 9:16 for YouTube Shorts."],
            ["Is my data secure?", "Videos and credentials are stored on your own server. API keys stay server-side only — never sent to the browser. Payments are processed securely via PayPal."],
          ].map(([q, a]) => (
            <div key={q}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#E0E0F0", marginBottom: 5 }}>{q}</div>
              <div style={{ fontSize: 13, color: "#9898C0", lineHeight: 1.6 }}>{a}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: "center", color: "#7878A8", fontSize: 13, paddingBottom: 20 }}>
        Questions? Email us at hello@autopilot.io · All payments processed securely by PayPal
      </div>
    </div>
  );
}
