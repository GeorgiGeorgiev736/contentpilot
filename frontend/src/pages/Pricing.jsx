import { useState, useEffect } from "react";
import { paypal } from "../services/api";
import { useAuth } from "../hooks/useAuth";

const PLANS_MONTHLY = [
  {
    id: "free",
    name: "Free",
    price: 0,
    credits: 10,
    creditNote: "10 credits / week",
    color: "#8888B8",
    features: [
      "10 AI credits per week (auto-reset)",
      "1 platform connection",
      "Upload & AI metadata",
      "Content calendar",
      "Community support",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: 12,
    yearlyPrice: 10,
    credits: 75,
    creditNote: "75 credits / month",
    color: "#3B82F6",
    features: [
      "75 AI credits / month (~2/day)",
      "3 platform connections",
      "Upload + AI title, tags & description",
      "Auto-captions (SRT)",
      "Content calendar",
      "Email support",
    ],
  },
  {
    id: "creator",
    name: "Creator",
    price: 25,
    yearlyPrice: 21,
    credits: 300,
    creditNote: "300 credits / month",
    color: "#7C5CFC",
    popular: true,
    features: [
      "300 AI credits / month (~10/day)",
      "All 5 platforms (YouTube, TikTok, Instagram, LinkedIn, X)",
      "AI thumbnails (3 variants)",
      "Repurpose into 5 viral clips",
      "Auto-captions & SRT download",
      "Create Post (text + image)",
      "Priority support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 49,
    yearlyPrice: 41,
    credits: 700,
    creditNote: "700 credits / month",
    color: "#22C55E",
    features: [
      "700 AI credits / month (~23/day)",
      "Everything in Creator",
      "Analytics dashboard",
      "Hook generator",
      "Dedicated account manager",
    ],
  },
];

export default function Pricing({ setPage }) {
  const { user, refreshUser } = useAuth();
  const [billing, setBilling] = useState("monthly"); // "monthly" | "yearly"
  const [loading, setLoading] = useState(null);
  const [error,   setError]   = useState("");
  const [notice,  setNotice]  = useState("");

  useEffect(() => {
    const params   = new URLSearchParams(window.location.search);
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
      const { url } = await paypal.checkout(planId + (billing === "yearly" ? "_yearly" : ""));
      window.location.href = url;
    } catch (err) { setError(err.message); setLoading(null); }
  };

  const currentPlan = user?.plan || "free";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
      <div style={{ textAlign:"center" }}>
        <h1 style={{ fontSize:34, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em", marginBottom:10, fontFamily:"'DM Mono',monospace" }}>
          <span style={{ color:"#40A0C0", fontWeight:400 }}>/</span> Pricing
        </h1>
        <p style={{ color:"#9090B8", fontSize:16, marginBottom:20 }}>Start free. Scale as your audience grows.</p>

        {/* Monthly / Yearly toggle */}
        <div style={{ display:"inline-flex", alignItems:"center", gap:0, background:"#111", border:"1px solid #1e1e1e", borderRadius:10, padding:4 }}>
          {[["monthly","Monthly"],["yearly","Yearly"]].map(([v, lb]) => (
            <button key={v} onClick={() => setBilling(v)}
              style={{ padding:"8px 22px", fontSize:13, fontWeight:700, borderRadius:7, cursor:"pointer", border:"none",
                background: billing===v ? "#40A0C0" : "transparent",
                color:      billing===v ? "#000"    : "#666" }}>
              {lb}
              {v === "yearly" && <span style={{ marginLeft:6, fontSize:10, background:"#22C55E22", color:"#22C55E", border:"1px solid #22C55E33", borderRadius:10, padding:"1px 7px" }}>2 months free</span>}
            </button>
          ))}
        </div>
      </div>

      {currentPlan !== "free" && (
        <div style={{ padding:"14px 20px", background:"#7C5CFC08", border:"1px solid #7C5CFC22", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:14, color:"#B09FFF" }}>
            You're on the <strong style={{ textTransform:"capitalize" }}>{currentPlan}</strong> plan
            {user?.subscription_status === "active" ? " · Active" : user?.subscription_status ? ` · ${user.subscription_status}` : ""}
          </span>
          <button onClick={() => setPage("pricing")} className="btn-ghost" style={{ padding:"7px 16px", fontSize:13 }}>Change Plan →</button>
        </div>
      )}

      {currentPlan === "free" && (
        <div style={{ padding:"14px 20px", background:"#F59E0B08", border:"1px solid #F59E0B22", borderRadius:14, textAlign:"center" }}>
          <span style={{ fontSize:14, color:"#F59E0B" }}>
            Free plan · {user?.credits ?? 0} credits remaining this week
          </span>
        </div>
      )}

      {notice && <div style={{ padding:"12px 16px", background:"#22C55E10", border:"1px solid #22C55E33", borderRadius:10, color:"#22C55E", fontSize:13 }}>✓ {notice}</div>}
      {error  && <div style={{ padding:"12px 16px", background:"#EF444410", border:"1px solid #EF444422", borderRadius:10, color:"#EF4444", fontSize:13 }}>{error}</div>}

      {/* Plan cards */}
      <div className="grid-4" style={{ gap:14 }}>
        {PLANS_MONTHLY.map(plan => {
          const isCurrent = currentPlan === plan.id;
          const col       = plan.color;
          const price     = billing === "yearly" && plan.yearlyPrice ? plan.yearlyPrice : plan.price;
          return (
            <div key={plan.id} style={{
              background:"#0C0C1A",
              border:`2px solid ${plan.popular?"#7C5CFC":isCurrent?"#22C55E44":"#16162A"}`,
              borderRadius:18, padding:"22px 18px",
              position:"relative",
              boxShadow: plan.popular ? "0 0 40px #7C5CFC18" : "none",
              display:"flex", flexDirection:"column",
            }}>
              {plan.popular && (
                <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:"linear-gradient(135deg,#7C5CFC,#B45AFD)", color:"#fff", fontSize:10, fontWeight:700, padding:"3px 14px", borderRadius:20, whiteSpace:"nowrap", letterSpacing:".04em" }}>
                  MOST POPULAR
                </div>
              )}
              {isCurrent && (
                <div style={{ position:"absolute", top:-12, right:16, background:"#22C55E", color:"#fff", fontSize:10, fontWeight:700, padding:"3px 12px", borderRadius:20, letterSpacing:".04em" }}>
                  CURRENT
                </div>
              )}

              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:16, fontWeight:700, color:col, marginBottom:6 }}>{plan.name}</div>
                <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                  <span style={{ fontSize:32, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em" }}>
                    {price === 0 ? "Free" : `$${price}`}
                  </span>
                  {price > 0 && <span style={{ fontSize:13, color:"#8888B8" }}>/mo</span>}
                </div>
                {billing === "yearly" && plan.yearlyPrice && (
                  <div style={{ fontSize:11, color:"#22C55E", marginTop:2 }}>billed ${plan.yearlyPrice * 10}/yr · save ${(plan.price - plan.yearlyPrice) * 12}</div>
                )}
                <div style={{ fontSize:13, color:"#9090B8", marginTop:4 }}>{plan.creditNote}</div>
              </div>

              <button
                onClick={() => checkout(plan.id)}
                disabled={isCurrent || plan.id === "free" || !!loading}
                style={{
                  width:"100%", padding:"11px", marginBottom:14, borderRadius:9, border:"none",
                  background: isCurrent || plan.id === "free" ? "#1A1A2E" : "#FFC439",
                  color:      isCurrent || plan.id === "free" ? "#3A3A5A" : "#003087",
                  fontWeight:700, cursor: isCurrent || plan.id === "free" ? "default" : "pointer",
                  fontSize:13, opacity: loading && loading !== plan.id ? .5 : 1,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                }}>
                {loading === plan.id
                  ? <><span style={{ width:12, height:12, border:"2px solid #003087", borderTopColor:"transparent", borderRadius:"50%", display:"inline-block", animation:"spin 1s linear infinite" }} />Loading…</>
                  : isCurrent ? "Current Plan"
                  : plan.id === "free" ? "Free Forever"
                  : <><span style={{ fontSize:15, fontWeight:900 }}>𝐏</span>{`Get ${plan.name} →`}</>}
              </button>

              <div style={{ display:"flex", flexDirection:"column", gap:7, flex:1 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display:"flex", alignItems:"flex-start", gap:7, fontSize:13, color:"#C0C0D8" }}>
                    <span style={{ color:col, fontSize:10, marginTop:2, flexShrink:0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="card" style={{ padding:28 }}>
        <div style={{ fontSize:16, fontWeight:700, color:"#EDEDFA", marginBottom:20 }}>Common questions</div>
        <div className="grid-2" style={{ gap:20 }}>
          {[
            ["What counts as 1 credit?", "Each AI action uses credits: generating title/tags/description = 1cr, auto-captions = 3cr, AI thumbnails = 5cr, repurposing into 5 clips = 10cr. Free users get 10cr/week, auto-reset every 7 days."],
            ["Can I switch plans anytime?", "Yes. Upgrade or downgrade at any time. Your new plan takes effect immediately and credits are topped up right away."],
            ["What is yearly billing?", "Pay for 10 months, get 12 — that's 2 months free. Charged as a single payment. You can switch back to monthly at renewal."],
            ["Are platform API costs included?", "Yes. YouTube, TikTok, Instagram, LinkedIn and X API usage is included. You need your own developer app credentials (free) from each platform."],
            ["How does repurposing work?", "Upload a long video — AI finds the 5 most engaging moments, cuts them into vertical clips for TikTok, Reels, and Shorts, and gives each a hook caption."],
            ["Is my data secure?", "Videos and credentials are stored on your own server. API keys stay server-side only — never sent to the browser. Payments are processed securely via PayPal."],
          ].map(([q, a]) => (
            <div key={q}>
              <div style={{ fontSize:14, fontWeight:600, color:"#E0E0F0", marginBottom:5 }}>{q}</div>
              <div style={{ fontSize:13, color:"#9898C0", lineHeight:1.6 }}>{a}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign:"center", color:"#7878A8", fontSize:13, paddingBottom:20 }}>
        Questions? Email us at <span style={{ color:"#40A0C088" }}>hello@contentpilots.net</span> · All payments processed securely by PayPal
      </div>
    </div>
  );
}
