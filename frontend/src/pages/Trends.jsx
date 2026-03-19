import { useState } from "react";
import { useAI } from "../hooks/useAI";
import { useCreditCosts } from "../hooks/useCreditCosts";
import AIPanel from "../components/AIPanel";
import CreditBadge from "../components/CreditBadge";

const MOCK_TRENDS = [
  { topic:"#AIWorkflow",       platforms:["tiktok","youtube"], score:96, growth:"+342%", window:"3-5 days", posts:"847K", cat:"Tech"      },
  { topic:"Vibe Coding",       platforms:["youtube","tiktok"], score:91, growth:"+412%", window:"Act now",  posts:"124K", cat:"Dev"       },
  { topic:"AI replacing jobs", platforms:["youtube"],          score:89, growth:"+380%", window:"This week",posts:"341K", cat:"Tech"      },
  { topic:"Morning Routine 2025",platforms:["tiktok"],         score:84, growth:"+218%", window:"2 weeks",  posts:"2.1M", cat:"Lifestyle" },
  { topic:"Day in life solo dev",platforms:["tiktok","youtube"],score:78,growth:"+156%", window:"Ongoing",  posts:"890K", cat:"Dev"       },
  { topic:"#SlowLiving",       platforms:["instagram","tiktok"],score:72,growth:"+98%",  window:"2 weeks",  posts:"5.6M", cat:"Wellness"  },
];
const PC = { youtube:"#FF0000", tiktok:"#69C9D0", instagram:"#E1306C" };
const PI = { youtube:"▶", tiktok:"♪", instagram:"◈" };

function ScoreRing({ score }) {
  const c = score>90?"#22C55E":score>70?"#F59E0B":"#EF4444";
  const r=18; const circ=2*Math.PI*r;
  return (
    <div style={{ position:"relative", width:44, height:44, flexShrink:0 }}>
      <svg width="44" height="44" style={{ transform:"rotate(-90deg)" }}>
        <circle cx="22" cy="22" r={r} fill="none" stroke="#10102A" strokeWidth="3"/>
        <circle cx="22" cy="22" r={r} fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ*(1-score/100)}/>
      </svg>
      <span style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#CCC" }}>{score}</span>
    </div>
  );
}

export default function Trends({ onNavigate }) {
  const { run, loading, streaming, output, reset } = useAI();
  const { getCost } = useCreditCosts();
  const [niche,    setNiche]    = useState("AI / tech productivity");
  const [selected, setSelected] = useState(null);
  const [filter,   setFilter]   = useState("all");

  const analyzeTrend = (t) => {
    setSelected(t); reset();
    run({ feature:"analyze_trend", context:{ topic:t.topic, growth:t.growth, window:t.window, platforms:t.platforms.join(" and "), niche } });
  };

  const scan = () => {
    setSelected(null); reset();
    run({ feature:"scan_trends", context:{ niche, platforms:"TikTok and YouTube" } });
  };

  const filtered = filter === "all" ? MOCK_TRENDS : MOCK_TRENDS.filter(t => t.platforms.includes(filter));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em" }}>Trend Radar</h1>
          <p style={{ color:"#9090B8", fontSize:15, marginTop:5 }}>AI-detected opportunities across your connected platforms</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <input value={niche} onChange={e=>setNiche(e.target.value)} className="inp" placeholder="Your niche…" style={{ width:220 }} />
          <button onClick={scan} disabled={loading} data-tutorial="trends-scan-btn" className="btn-primary" style={{ padding:"10px 20px", fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
            {loading && !selected ? <span style={{ width:13,height:13,border:"2px solid #fff4",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin 1s linear infinite" }}/> : "◎"}
            Scan <CreditBadge cost={getCost("scan_trends")}/>
          </button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 400px", gap:20, alignItems:"start" }}>
        <div className="card" style={{ padding:18 }}>
          {/* Sample data notice */}
          <div style={{ padding:"8px 13px", background:"#F59E0B08", border:"1px solid #F59E0B20", borderRadius:9, marginBottom:14, fontSize:12, color:"#C0943A", display:"flex", alignItems:"center", gap:8 }}>
            <span>◎</span>
            <span>Sample trends shown below — hit <strong>Scan</strong> to detect real ones for your niche using AI</span>
          </div>
          {/* Filter tabs */}
          <div style={{ display:"flex", gap:6, marginBottom:16 }}>
            {["all","youtube","tiktok","instagram"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding:"5px 13px", borderRadius:20, border:`1px solid ${filter===f?"#7C5CFC":"#1E1E32"}`, background:filter===f?"#7C5CFC22":"transparent", color:filter===f?"#B09FFF":"#7878A8", cursor:"pointer", fontSize:12, fontWeight:filter===f?600:400, textTransform:"capitalize" }}>
                {f === "all" ? "All" : PI[f]+" "+f}
              </button>
            ))}
          </div>

          {filtered.map((t, i) => (
            <div key={t.topic}
              style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 10px", borderRadius:12, cursor:"pointer", background:selected?.topic===t.topic?"#7C5CFC0A":"transparent", border:`1px solid ${selected?.topic===t.topic?"#7C5CFC22":"transparent"}`, transition:"all .15s", marginBottom:4, position:"relative" }}
              onMouseEnter={e=>{ if(selected?.topic!==t.topic) e.currentTarget.style.background="#0F0F1E"; e.currentTarget.querySelector(".trend-script-btn").style.opacity="1"; }}
              onMouseLeave={e=>{ if(selected?.topic!==t.topic) e.currentTarget.style.background="transparent"; e.currentTarget.querySelector(".trend-script-btn").style.opacity="0"; }}>
              <div onClick={() => analyzeTrend(t)} style={{ display:"contents" }}>
                <ScoreRing score={t.score}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:"#E0E0F0", marginBottom:4 }}>{t.topic}</div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                    {t.platforms.map(p => <span key={p} style={{ fontSize:11, color:PC[p], display:"flex", alignItems:"center", gap:3 }}>{PI[p]} {p}</span>)}
                    <span style={{ fontSize:11, background:"#10102A", color:"#8888B8", padding:"2px 8px", borderRadius:10 }}>{t.cat}</span>
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#22C55E" }}>{t.growth}</div>
                  <div style={{ fontSize:11, color:"#8888B8", marginTop:2 }}>{t.posts} posts</div>
                  <div style={{ fontSize:10, color:"#7C5CFC", marginTop:3 }}>{t.window}</div>
                </div>
              </div>
              <button
                className="trend-script-btn btn-ghost"
                onClick={e => { e.stopPropagation(); onNavigate && onNavigate("scripts", { prefillTopic: t.topic + " — " + t.growth + " growth" }); }}
                style={{ opacity:0, transition:"opacity .15s", padding:"5px 12px", fontSize:12, borderRadius:8, flexShrink:0, whiteSpace:"nowrap" }}
              >→ Script</button>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding:22, position:"sticky", top:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:600, color:"#B0B0CC" }}>
              {selected ? `Analyzing: ${selected.topic}` : "AI Analysis"}
            </div>
            {(loading||streaming) && <div style={{ fontSize:12, color:"#7C5CFC", display:"flex", gap:6, alignItems:"center" }}><span style={{ width:7,height:7,borderRadius:"50%",background:"#7C5CFC",animation:"shimmer 1s ease infinite",display:"inline-block" }}/>Live</div>}
          </div>
          <AIPanel output={output} loading={loading} streaming={streaming} placeholder="◎ Click a trend to analyze" minHeight={320}/>
          {selected && !loading && output && (
            <div style={{ display:"flex", gap:10, marginTop:14, flexWrap:"wrap" }}>
              <button
                className="btn-primary"
                style={{ flex:1, padding:"10px", fontSize:13 }}
                onClick={() => onNavigate && onNavigate("scripts", { prefillTopic: selected.topic + " — " + selected.growth + " growth" })}
              >✦ Write Script</button>
              <button
                className="btn-primary"
                style={{ flex:1, padding:"10px", fontSize:13, background:"linear-gradient(135deg,#22C55E,#16A34A)", boxShadow:"0 2px 12px rgba(34,197,94,0.3)" }}
                onClick={() => onNavigate && onNavigate("scripts", { prefillTopic: selected.topic + " — " + selected.growth + " growth" })}
              >🚀 Use Trend</button>
              <button className="btn-ghost" style={{ padding:"10px 14px", fontSize:13 }}>Save</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
