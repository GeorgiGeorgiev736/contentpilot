import { useState, useEffect } from "react";
import { campaigns as campaignsApi } from "../services/api";

const STAGE_ORDER = ["trend","virality","idea","script","thumbnail","tags","schedule"];
const STAGE_LABELS = { trend:"Trend", virality:"Virality", idea:"Idea", script:"Script", thumbnail:"Thumbnail", tags:"Tags", schedule:"Scheduled" };
const STAGE_COLORS = { trend:"#7C5CFC", virality:"#F59E0B", idea:"#22C55E", script:"#3B82F6", thumbnail:"#EC4899", tags:"#69C9D0", schedule:"#8B5CF6" };

function StageBar({ stage }) {
  const idx = STAGE_ORDER.indexOf(stage);
  return (
    <div style={{ display:"flex", gap:3, marginTop:8 }}>
      {STAGE_ORDER.map((s, i) => (
        <div key={s} title={STAGE_LABELS[s]} style={{ flex:1, height:3, borderRadius:2, background: i <= idx ? (STAGE_COLORS[s] || "#7C5CFC") : "#1A1A2E" }}/>
      ))}
    </div>
  );
}

export default function Projects({ setPage }) {
  const [projects,  setProjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [outputs,   setOutputs]   = useState([]);
  const [activeOut, setActiveOut] = useState(null);

  useEffect(() => {
    campaignsApi.list()
      .then(data => setProjects(data.campaigns || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const openProject = async (p) => {
    setSelected(p); setActiveOut(null); setOutputs([]);
    try {
      const data = await campaignsApi.get(p.id);
      setOutputs(data.outputs || []);
      if (data.outputs?.length) setActiveOut(data.outputs[0]);
    } catch {}
  };

  const deleteProject = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Delete this project?")) return;
    await campaignsApi.delete(id).catch(() => {});
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selected?.id === id) { setSelected(null); setOutputs([]); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em" }}>Content Projects</h1>
          <p style={{ color:"#9090B8", fontSize:15, marginTop:5 }}>
            Each AI Pipeline run saves a project — your trend, idea, script, thumbnail and tags all in one place
          </p>
        </div>
        <button onClick={() => setPage("pipeline")} className="btn-primary" style={{ padding:"10px 20px", fontSize:13 }}>
          + New Project
        </button>
      </div>

      {/* What are projects? */}
      <div style={{ padding:"16px 20px", background:"#7C5CFC08", border:"1px solid #7C5CFC22", borderRadius:14, display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        {[
          ["⊙", "AI Pipeline", "Run trend → script → thumbnail in one click"],
          ["◎", "Trend Research", "AI finds viral topics for your niche"],
          ["✦", "Script + Assets", "Full script, thumbnail concept & tags saved"],
          ["◷", "Ready to Post", "Send straight to Scheduler when done"],
        ].map(([ic, lb, ds]) => (
          <div key={lb} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
            <div style={{ fontSize:18, color:"#7C5CFC", marginTop:1, flexShrink:0 }}>{ic}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"#C8C8E8", marginBottom:2 }}>{lb}</div>
              <div style={{ fontSize:12, color:"#8888A8" }}>{ds}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ color:"#7878A8", fontSize:13, padding:"32px 0", textAlign:"center" }}>Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ padding:"60px 24px", textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>⊙</div>
          <div style={{ fontSize:20, fontWeight:700, color:"#E0E0F0", marginBottom:8 }}>No projects yet</div>
          <div style={{ fontSize:13, color:"#8888A8", marginBottom:24, maxWidth:360, margin:"0 auto 24px" }}>
            Run the AI Pipeline to automatically research a trend, write a script, design a thumbnail concept, and save it all as a project.
          </div>
          <button onClick={() => setPage("pipeline")} className="btn-primary" style={{ padding:"12px 28px", fontSize:14 }}>
            ▶ Run AI Pipeline
          </button>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns: selected ? "340px 1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap:16, alignItems:"start" }}>
          {/* Project list */}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {projects.map(p => {
              const stageIdx = STAGE_ORDER.indexOf(p.stage);
              const pct = Math.round(((stageIdx + 1) / STAGE_ORDER.length) * 100);
              return (
                <div key={p.id} onClick={() => openProject(p)}
                  className="card"
                  style={{ padding:"16px 18px", cursor:"pointer", border:`1px solid ${selected?.id===p.id?"#7C5CFC55":"#20203A"}`, background:selected?.id===p.id?"#7C5CFC0A":"#0C0C1A", transition:"all .15s" }}
                  onMouseEnter={e => { if(selected?.id!==p.id) e.currentTarget.style.borderColor="#2E2E4E"; }}
                  onMouseLeave={e => { if(selected?.id!==p.id) e.currentTarget.style.borderColor="#20203A"; }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:"#E0E0F0", marginBottom:3 }}>{p.name}</div>
                      <div style={{ fontSize:12, color:"#8888A8" }}>
                        {p.niche && <span>{p.niche}</span>}
                        {p.platform && <span style={{ marginLeft:6, color:"#5C5C80" }}>· {p.platform}</span>}
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:STAGE_COLORS[p.stage]||"#888", background:`${STAGE_COLORS[p.stage]||"#888"}18`, padding:"2px 9px", borderRadius:20 }}>
                        {STAGE_LABELS[p.stage] || p.stage || "draft"}
                      </span>
                      <button onClick={e=>deleteProject(p.id,e)} style={{ background:"transparent", border:"none", color:"#6868A0", cursor:"pointer", fontSize:14, padding:"2px 4px", lineHeight:1 }}
                        onMouseEnter={e=>e.currentTarget.style.color="#EF4444"}
                        onMouseLeave={e=>e.currentTarget.style.color="#6868A0"}>×</button>
                    </div>
                  </div>
                  <StageBar stage={p.stage}/>
                  <div style={{ fontSize:11, color:"#5C5C80", marginTop:5 }}>{pct}% complete · {new Date(p.created_at).toLocaleDateString()}</div>
                </div>
              );
            })}
          </div>

          {/* Project detail */}
          {selected && (
            <div className="card" style={{ padding:24 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:"#E8E8FC" }}>{selected.name}</div>
                  <div style={{ fontSize:12, color:"#8888A8", marginTop:2 }}>{selected.niche} · {selected.platform}</div>
                </div>
                <button onClick={()=>setSelected(null)} className="btn-ghost" style={{ padding:"5px 12px", fontSize:12 }}>✕ Close</button>
              </div>

              {/* Stage tabs */}
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
                {outputs.map(o => (
                  <button key={o.stage} onClick={()=>setActiveOut(o)}
                    style={{ padding:"5px 13px", borderRadius:20, border:`1px solid ${activeOut?.stage===o.stage?STAGE_COLORS[o.stage]||"#7C5CFC":"#1E1E32"}`, background:activeOut?.stage===o.stage?`${STAGE_COLORS[o.stage]||"#7C5CFC"}18`:"transparent", color:activeOut?.stage===o.stage?STAGE_COLORS[o.stage]||"#B09FFF":"#9090B8", cursor:"pointer", fontSize:12, fontWeight:activeOut?.stage===o.stage?600:400, fontFamily:"inherit" }}>
                    {STAGE_LABELS[o.stage] || o.stage}
                  </button>
                ))}
                {outputs.length === 0 && <div style={{ fontSize:13, color:"#7878A8" }}>No outputs saved yet — run stages in the Pipeline</div>}
              </div>

              {/* Output content */}
              {activeOut && (
                <div style={{ background:"#080810", border:"1px solid #10102A", borderRadius:12, padding:20, fontFamily:"'DM Mono',monospace", fontSize:13, lineHeight:1.9, color:"#C8C8E0", whiteSpace:"pre-wrap", maxHeight:480, overflowY:"auto" }}>
                  {activeOut.output}
                </div>
              )}

              <div style={{ marginTop:16, display:"flex", gap:10 }}>
                <button onClick={()=>setPage("pipeline")} className="btn-primary" style={{ padding:"9px 18px", fontSize:13 }}>
                  ▶ Continue in Pipeline
                </button>
                <button onClick={()=>setPage("schedule")} className="btn-ghost" style={{ padding:"9px 18px", fontSize:13 }}>
                  ◷ Schedule Post
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
