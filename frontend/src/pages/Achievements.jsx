import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
function getToken() { return localStorage.getItem("token"); }

const TIER_COLORS = { 0: "#444", 5: "#888", 10: "#aaa", 15: "#ccc", 20: "#fff", 25: "#fff", 30: "#fff" };
const TIER_LABEL = { 0: "BADGE", 5: "BRONZE", 10: "SILVER", 15: "SILVER", 20: "GOLD", 25: "GOLD", 30: "PLATINUM" };

const CATEGORIES = ["all","content","ai","platforms","milestone"];

export default function Achievements() {
  const [achievements, setAchievements] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [copied, setCopied] = useState(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState([]);

  useEffect(() => { fetchAchievements(); }, []);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/achievements`, { headers:{ Authorization:`Bearer ${getToken()}` } });
      const d = await r.json();
      setAchievements(d.achievements || []);
      setCounts(d.counts || {});
      setNewlyUnlocked((d.newly_unlocked || []).map(a => a.key));
    } catch {}
    setLoading(false);
  };

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const filtered = filter === "all" ? achievements : achievements.filter(a => a.category === filter);
  const unlocked = achievements.filter(a => a.unlocked).length;
  const totalSavings = achievements.filter(a => a.unlocked && a.discount > 0).reduce((s, a) => Math.max(s, a.discount), 0);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:400 }}>
      <div style={{ width:32,height:32,border:"2px solid #222",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 1s linear infinite" }}/>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
      <style>{`
        .ach-card { transition: none !important; }
        .ach-card:hover { border-color: rgba(255,255,255,0.2) !important; }
        .ach-card.new-unlock { animation: glitchBorder 0.1s steps(2) infinite; border-color: rgba(255,255,255,0.7) !important; }
        .ach-card.unlocked { box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 0 30px rgba(255,255,255,0.03); }
        .copy-btn:hover { animation: glitchBorder 0.1s steps(2) infinite; border-color: rgba(255,255,255,0.5) !important; color:#fff !important; }
        .cat-btn:hover { border-color: rgba(255,255,255,0.3) !important; color:#fff !important; animation: glitchBorder 0.1s steps(2) infinite; }
        .cat-btn.active { border-color: rgba(255,255,255,0.6) !important; color:#fff !important; background:#161616 !important; }
        @keyframes unlockPulse { 0%,100%{box-shadow:0 0 0 1px rgba(255,255,255,0.1),0 0 20px rgba(255,255,255,0.05)} 50%{box-shadow:0 0 0 2px rgba(255,255,255,0.2),0 0 40px rgba(255,255,255,0.1)} }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:16 }}>
        <div>
          <div style={{ fontSize:11, color:"#40A0C0", letterSpacing:".2em", textTransform:"uppercase", marginBottom:6, fontFamily:"'DM Mono',monospace" }}>// progress_rewards</div>
          <h1 style={{ fontSize:36, fontWeight:900, color:"#fff", letterSpacing:"-.04em", lineHeight:1, fontFamily:"'DM Mono',monospace" }}><span style={{ color:"#40A0C0", fontWeight:400 }}>/</span> Achievements</h1>
        </div>
        <div style={{ display:"flex", gap:24 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:26, fontWeight:900, color:"#fff", lineHeight:1 }}>{unlocked}<span style={{ fontSize:14, color:"#333", fontWeight:400 }}>/{achievements.length}</span></div>
            <div style={{ fontSize:10, color:"#444", textTransform:"uppercase", letterSpacing:".1em", marginTop:3 }}>Unlocked</div>
          </div>
          {totalSavings > 0 && <>
            <div style={{ width:1, background:"#1e1e1e" }}/>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:26, fontWeight:900, color:"#22C55E", lineHeight:1 }}>{totalSavings}%</div>
              <div style={{ fontSize:10, color:"#444", textTransform:"uppercase", letterSpacing:".1em", marginTop:3 }}>Best Discount</div>
            </div>
          </>}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background:"#0e0e0e", border:"1px solid #1e1e1e", borderRadius:10, padding:"14px 18px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ fontSize:12, color:"#555", textTransform:"uppercase", letterSpacing:".1em" }}>Overall Progress</span>
          <span style={{ fontSize:12, color:"#fff", fontWeight:700 }}>{achievements.length > 0 ? Math.round((unlocked/achievements.length)*100) : 0}%</span>
        </div>
        <div style={{ height:3, background:"#161616", borderRadius:2 }}>
          <div style={{ width:`${achievements.length > 0 ? (unlocked/achievements.length)*100 : 0}%`, height:"100%", background:"#fff", borderRadius:2, transition:"width .5s", boxShadow:"0 0 8px rgba(255,255,255,0.3)" }}/>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={()=>setFilter(c)} className={`cat-btn${filter===c?" active":""}`}
            style={{ padding:"7px 16px", background:"#0e0e0e", border:"1px solid #222", borderRadius:6, color: filter===c?"#fff":"#444", cursor:"pointer", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", transition:"none" }}>
            {c}
          </button>
        ))}
      </div>

      {/* Achievement grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
        {filtered.map(a => {
          const isNew = newlyUnlocked.includes(a.key);
          const tierColor = TIER_COLORS[a.discount] || "#444";
          const tierLabel = TIER_LABEL[a.discount] || "BADGE";
          const pct = a.threshold > 0 ? Math.min(100, Math.round((a.progress / a.threshold)*100)) : 100;

          return (
            <div key={a.key}
              className={`ach-card${a.unlocked?" unlocked":""}${isNew?" new-unlock":""}`}
              style={{
                background: a.unlocked ? "#0e0e0e" : "#080808",
                border: `1px solid ${a.unlocked ? "#2a2a2a" : "#141414"}`,
                borderRadius:14,
                padding:20,
                opacity: a.unlocked ? 1 : 0.6,
                position:"relative",
                overflow:"hidden",
                animation: isNew ? "unlockPulse 1.5s ease-in-out infinite" : "none",
              }}
            >
              {/* Tier badge */}
              <div style={{ position:"absolute", top:14, right:14, fontSize:9, fontWeight:800, color:tierColor, letterSpacing:".15em", opacity: a.unlocked?1:0.4 }}>{tierLabel}</div>

              {/* Icon */}
              <div style={{ fontSize:36, marginBottom:12, filter: a.unlocked ? "none" : "grayscale(1)" }}>{a.icon}</div>

              {/* Name + desc */}
              <div style={{ fontSize:15, fontWeight:800, color: a.unlocked?"#fff":"#555", marginBottom:5, letterSpacing:"-.01em" }}>{a.name}</div>
              <div style={{ fontSize:12, color:"#444", lineHeight:1.5, marginBottom:14 }}>{a.desc}</div>

              {/* Progress or unlocked state */}
              {a.unlocked ? (
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom: a.discount>0?12:0 }}>
                    <span style={{ fontSize:10, fontWeight:800, color:"#fff", background:"#fff1", border:"1px solid #fff2", padding:"2px 10px", borderRadius:20, letterSpacing:".1em", textTransform:"uppercase" }}>✓ Unlocked</span>
                  </div>
                  {a.discount>0 && a.discount_code && (
                    <div style={{ background:"#161616", border:"1px solid #222", borderRadius:8, padding:"10px 12px" }}>
                      <div style={{ fontSize:9, color:"#555", textTransform:"uppercase", letterSpacing:".15em", marginBottom:6 }}>{a.discount}% Discount Code</div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <code style={{ flex:1, fontSize:12, fontWeight:800, color:"#22C55E", fontFamily:"monospace", letterSpacing:".05em" }}>{a.discount_code}</code>
                        <button onClick={()=>copyCode(a.discount_code)} className="copy-btn"
                          style={{ padding:"4px 10px", background:"transparent", border:"1px solid #333", borderRadius:5, color:"#666", cursor:"pointer", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", transition:"none" }}>
                          {copied===a.discount_code?"✓":"COPY"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:10, color:"#444", textTransform:"uppercase", letterSpacing:".1em" }}>Progress</span>
                    <span style={{ fontSize:10, color:"#555", fontWeight:700 }}>{a.progress}/{a.threshold}</span>
                  </div>
                  <div style={{ height:2, background:"#1a1a1a", borderRadius:1 }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:"#333", borderRadius:1, transition:"width .5s" }}/>
                  </div>
                  {a.discount>0 && (
                    <div style={{ fontSize:10, color:"#444", marginTop:8, textTransform:"uppercase", letterSpacing:".08em" }}>Reward: {a.discount}% off your next plan</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
