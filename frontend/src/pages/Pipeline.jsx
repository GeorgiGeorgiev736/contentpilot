import { useState, useCallback } from "react";
import { useAI } from "../hooks/useAI";
import AIPanel from "../components/AIPanel";

const STAGES = [
  { id:"trend",     label:"Detect Trend",     icon:"◎", color:"#9B79FC" },
  { id:"virality",  label:"Predict Virality", icon:"⚡", color:"#F59E0B" },
  { id:"idea",      label:"Generate Idea",    icon:"✦", color:"#22C55E" },
  { id:"script",    label:"Write Script",     icon:"⊡", color:"#60A5FA" },
  { id:"thumbnail", label:"Design Thumbnail", icon:"◈", color:"#EC4899" },
  { id:"tags",      label:"Optimize Tags",    icon:"⬡", color:"#00E5CC" },
  { id:"schedule",  label:"Schedule Post",    icon:"◷", color:"#A78BFA" },
];

export default function Pipeline() {
  const { run, loading, streaming, output, reset } = useAI();
  const [showModal, setShowModal]   = useState(true);
  const [niche,     setNiche]       = useState("");
  const [topic,     setTopic]       = useState("");
  const [platform,  setPlatform]    = useState("YouTube & TikTok");
  const [running,   setRunning]     = useState(null);
  const [done,      setDone]        = useState([]);
  const [outputs,   setOutputs]     = useState({});
  const [active,    setActive]      = useState(null);
  const [isAll,     setIsAll]       = useState(false);

  const runStage = useCallback(async (id) => {
    setRunning(id); setActive(id); reset();
    const ctx = { niche: niche||"content creation", topic: topic||niche||"viral content", platforms: platform, idea: outputs["idea"]?.slice(0,200)||topic||niche };
    await run({
      feature: id,
      context: ctx,
      onComplete: (full) => {
        setOutputs(p => ({ ...p, [id]: full }));
        setDone(p => [...new Set([...p, id])]);
        setRunning(null);
      },
    });
  }, [niche, topic, platform, outputs, run, reset]);

  const runAll = useCallback(async () => {
    setIsAll(true); setDone([]); setOutputs({}); reset();
    for (const s of STAGES) {
      await runStage(s.id);
      await new Promise(r => setTimeout(r, 300));
    }
    setIsAll(false);
  }, [runStage, reset]);

  const launch = () => {
    if (!niche.trim()) return;
    setShowModal(false);
  };

  // ── Launch modal ─────────────────────────────────────────────
  if (showModal) return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.95)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" }}>
      <style>{`
        @keyframes modalIn { from { opacity:0; transform:scale(.96) translateY(10px); } to { opacity:1; transform:none; } }
        .modal-launch:hover { animation: glitchBorder 0.1s steps(2) infinite, glitchShake 0.15s steps(3) infinite; border-color:rgba(255,255,255,0.8)!important; }
        .modal-platform:hover { border-color:rgba(255,255,255,0.4)!important; }
        .modal-platform.active { border-color:rgba(255,255,255,0.7)!important; background:#1e1e1e!important; color:#fff!important; animation: glitchBorder 0.12s steps(2) infinite; }
      `}</style>
      <div style={{ width:"100%", maxWidth:520, padding:"0 24px", animation:"modalIn .3s cubic-bezier(.22,1,.36,1)" }}>
        {/* Glitch title */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ fontSize:10, color:"#444", letterSpacing:".3em", textTransform:"uppercase", marginBottom:10 }}>Initializing</div>
          <div style={{ fontSize:42, fontWeight:900, color:"#fff", letterSpacing:"-.04em", lineHeight:1 }}>AI AUTOPILOT</div>
          <div style={{ fontSize:13, color:"#444", marginTop:10, letterSpacing:".1em" }}>Full pipeline · Trend → Script → Schedule</div>
        </div>

        <div style={{ background:"#0a0a0a", border:"1px solid #1e1e1e", borderRadius:16, padding:28, display:"flex", flexDirection:"column", gap:18 }}>
          {/* Niche input */}
          <div>
            <label style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:".15em", display:"block", marginBottom:8 }}>Channel Niche *</label>
            <input
              value={niche}
              onChange={e=>setNiche(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&launch()}
              placeholder="e.g. AI tools, fitness, finance, gaming..."
              autoFocus
              style={{ width:"100%", background:"#0e0e0e", border:"1px solid #222", borderRadius:8, color:"#fff", padding:"13px 16px", fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit", transition:"border-color .15s" }}
              onFocus={e=>e.target.style.borderColor="rgba(255,255,255,0.3)"}
              onBlur={e=>e.target.style.borderColor="#222"}
            />
          </div>

          {/* Topic input */}
          <div>
            <label style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:".15em", display:"block", marginBottom:8 }}>Seed Topic <span style={{ color:"#333" }}>(optional)</span></label>
            <input
              value={topic}
              onChange={e=>setTopic(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&launch()}
              placeholder="Leave blank for AI to find trending topics"
              style={{ width:"100%", background:"#0e0e0e", border:"1px solid #222", borderRadius:8, color:"#fff", padding:"13px 16px", fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit", transition:"border-color .15s" }}
              onFocus={e=>e.target.style.borderColor="rgba(255,255,255,0.3)"}
              onBlur={e=>e.target.style.borderColor="#222"}
            />
          </div>

          {/* Platform */}
          <div>
            <label style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:".15em", display:"block", marginBottom:8 }}>Target Platform</label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {["YouTube & TikTok","YouTube","TikTok","Instagram","All Platforms"].map(p => (
                <button key={p} onClick={()=>setPlatform(p)} className={`modal-platform${platform===p?" active":""}`}
                  style={{ padding:"7px 14px", background:platform===p?"#1a1a1a":"transparent", border:`1px solid ${platform===p?"#333":"#1e1e1e"}`, borderRadius:6, color:platform===p?"#fff":"#444", cursor:"pointer", fontSize:11, fontWeight:600, transition:"none", letterSpacing:".03em" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Launch button */}
          <button
            onClick={launch}
            disabled={!niche.trim()}
            className="modal-launch"
            style={{ width:"100%", padding:"15px", background:"#fff", border:"1px solid transparent", borderRadius:10, color:"#000", fontWeight:900, fontSize:15, cursor:niche.trim()?"pointer":"not-allowed", letterSpacing:".05em", textTransform:"uppercase", marginTop:6, opacity:niche.trim()?1:0.3, transition:"none" }}
          >
            ▶ Launch Pipeline
          </button>
        </div>
      </div>
    </div>
  );

  // ── Pipeline UI ───────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:10, color:"#444", letterSpacing:".2em", textTransform:"uppercase", marginBottom:6 }}>Niche: {niche}{topic?` · ${topic}`:""}</div>
          <h1 style={{ fontSize:32, fontWeight:900, color:"#fff", letterSpacing:"-.04em" }}>AI Pipeline</h1>
          <p style={{ color:"#555", fontSize:13, marginTop:4, letterSpacing:".03em" }}>Trend → Virality → Idea → Script → Thumbnail → Tags → Schedule</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>{ setShowModal(true); setDone([]); setOutputs({}); setRunning(null); setActive(null); reset(); }} className="btn-ghost" style={{ padding:"9px 16px", fontSize:12 }}>↺ New Run</button>
          {done.length>0 && <button onClick={()=>{ setDone([]); setOutputs({}); setRunning(null); setActive(null); reset(); }} className="btn-ghost" style={{ padding:"9px 16px", fontSize:12 }}>Reset</button>}
          <button onClick={runAll} disabled={isAll} className="btn-primary" style={{ padding:"9px 20px", fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
            {isAll ? <><span style={{ width:12,height:12,border:"2px solid #0004",borderTopColor:"#000",borderRadius:"50%",display:"inline-block",animation:"spin 1s linear infinite" }}/>Running…</> : "▶ Run All"}
          </button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"240px 1fr", gap:16, alignItems:"start" }}>
        {/* Stage list */}
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          {STAGES.map(s => {
            const isDone=done.includes(s.id), isRun=running===s.id;
            return (
              <div key={s.id}
                onClick={()=>{ if(!isAll){ if(outputs[s.id]) setActive(s.id); else runStage(s.id); }}}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 12px", borderRadius:10, cursor:isAll?"default":"pointer", background:active===s.id?"#111":"#0a0a0a", border:`1px solid ${active===s.id?"#333":isDone?"#1e1e1e":"#0e0e0e"}`, transition:"none" }}
              >
                <div style={{ width:32,height:32,borderRadius:"50%",background:"#111",border:`1.5px solid ${isRun?s.color:isDone?s.color+"66":"#222"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:isDone?s.color:"#444",boxShadow:isRun?`0 0 12px ${s.color}44`:"none",flexShrink:0,transition:"none" }}>
                  {isRun ? <span style={{ width:11,height:11,border:`2px solid ${s.color}44`,borderTopColor:s.color,borderRadius:"50%",display:"inline-block",animation:"spin 1s linear infinite" }}/> : isDone?"✓":s.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:isDone?600:400, color:isDone?"#e0e0e0":active===s.id?"#aaa":"#555" }}>{s.label}</div>
                  <div style={{ fontSize:10, color:isRun?s.color:isDone?"#444":"#333", marginTop:1, letterSpacing:".05em" }}>{isRun?"PROCESSING…":isDone?"DONE":""}</div>
                </div>
                {isDone && <div style={{ width:5,height:5,borderRadius:"50%",background:"#22C55E",flexShrink:0 }}/>}
              </div>
            );
          })}
          {done.length>0 && (
            <div style={{ background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:10, padding:"11px 12px", marginTop:4 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:10, color:"#444", textTransform:"uppercase", letterSpacing:".1em" }}>Progress</span>
                <span style={{ fontSize:10, color:"#fff", fontWeight:700 }}>{done.length}/{STAGES.length}</span>
              </div>
              <div style={{ height:2, background:"#111", borderRadius:1 }}>
                <div style={{ width:`${(done.length/STAGES.length)*100}%`,height:"100%",background:"#fff",borderRadius:1,transition:"width .4s",boxShadow:"0 0 6px rgba(255,255,255,0.3)" }}/>
              </div>
            </div>
          )}
        </div>

        {/* Output panel */}
        <div style={{ background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:14, padding:22, minHeight:480 }}>
          {active ? (
            <>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#e0e0e0" }}>{STAGES.find(s=>s.id===active)?.label}</div>
                  <div style={{ fontSize:11, color:"#444", marginTop:2, letterSpacing:".05em" }}>{running===active?"GENERATING…":"COMPLETE"}</div>
                </div>
                {streaming&&running===active && <div style={{ fontSize:11, color:STAGES.find(s=>s.id===active)?.color, letterSpacing:".1em" }}>AI WRITING</div>}
              </div>
              <AIPanel output={running===active?output:(outputs[active]||"")} loading={loading&&running===active} streaming={streaming&&running===active} minHeight={400}/>
            </>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:440, gap:16, color:"#333" }}>
              <div style={{ fontSize:48, opacity:.3 }}>⊙</div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:14, fontWeight:600, color:"#555", marginBottom:6 }}>Click a stage to run individually</div>
                <div style={{ fontSize:12, color:"#333" }}>or run the full pipeline at once</div>
              </div>
              <button onClick={runAll} className="btn-primary" style={{ padding:"11px 24px", fontSize:13, marginTop:8 }}>▶ Run Full Pipeline</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
