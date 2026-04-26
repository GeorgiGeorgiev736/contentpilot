import { useState, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
function hdr() { return { Authorization: `Bearer ${localStorage.getItem("token")}` }; }

const CREDIT_COSTS = { meta: 1, thumbnails: 5, captions: 3, repurpose: 10 };

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ padding:"4px 12px", fontSize:12, background:copied?"#22C55E18":"transparent", border:`1px solid ${copied?"#22C55E33":"#222"}`, borderRadius:7, color:copied?"#22C55E":"#777", cursor:"pointer" }}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function OptionRow({ id, label, cost, checked, onChange, disabled }) {
  return (
    <label style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", background:checked?"#40A0C008":"transparent", border:`1px solid ${checked?"#40A0C033":"#1e1e1e"}`, borderRadius:10, cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.4:1 }}>
      <input type="checkbox" checked={checked} onChange={e => !disabled && onChange(e.target.checked)}
        style={{ width:16, height:16, accentColor:"#40A0C0", cursor:disabled?"not-allowed":"pointer" }} />
      <span style={{ flex:1, fontSize:14, color:checked?"#E0E0F8":"#888", fontWeight:checked?600:400 }}>{label}</span>
      <span style={{ fontSize:12, fontFamily:"'DM Mono',monospace", color:checked?"#40A0C0":"#555" }}>{cost} cr</span>
    </label>
  );
}

export default function Upload({ setPage }) {
  const [mode,      setMode]      = useState("file"); // "file" | "url"
  const [file,      setFile]      = useState(null);
  const [url,       setUrl]       = useState("");
  const [dragging,  setDragging]  = useState(false);
  const [opts,      setOpts]      = useState({ meta: true, thumbnails: true, captions: true, repurpose: false });
  const [phase,     setPhase]     = useState("idle"); // idle | processing | done
  const [results,   setResults]   = useState(null);
  const [err,       setErr]       = useState("");
  const [editMeta,  setEditMeta]  = useState(null);
  const [pickedThumb, setPickedThumb] = useState(0);
  const inputRef = useRef();

  const totalCost = Object.entries(opts).filter(([, v]) => v).reduce((s, [k]) => s + CREDIT_COSTS[k], 0);
  const hasInput  = mode === "file" ? !!file : url.trim().length > 0;

  const setOpt = (key, val) => setOpts(o => ({ ...o, [key]: val }));

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("video/")) { setFile(f); setMode("file"); }
  };

  const process = async () => {
    if (!hasInput) return;
    setPhase("processing"); setErr(""); setResults(null);
    const fd = new FormData();
    if (mode === "file") fd.append("video", file);
    else fd.append("videoUrl", url.trim());
    Object.entries(opts).forEach(([k, v]) => fd.append(k, String(v)));
    try {
      const r = await fetch(`${API}/api/tools/process`, { method: "POST", headers: hdr(), body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setResults(d);
      setEditMeta(d.meta ? { title: d.meta.title || "", description: d.meta.description || "", tags: (d.meta.tags || []).join(", ") } : null);
      setPickedThumb(0);
      setPhase("done");
    } catch (e) {
      setErr(e.message);
      setPhase("idle");
    }
  };

  const reset = () => { setFile(null); setUrl(""); setPhase("idle"); setResults(null); setErr(""); };

  // ── Idle / input phase ─────────────────────────────────────
  if (phase === "idle" || phase === "processing") return (
    <div style={{ display:"flex", flexDirection:"column", gap:22, maxWidth:820, margin:"0 auto" }}>
      <div>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em", fontFamily:"'DM Mono',monospace" }}>
          <span style={{ color:"#40A0C0", fontWeight:400 }}>/</span> Upload
        </h1>
        <p style={{ color:"#9090B8", fontSize:15, marginTop:5 }}>Upload a video or paste a link — AI writes your title, description, tags, thumbnails, and captions automatically</p>
      </div>

      {/* Drop zone / URL input */}
      <div className="card" style={{ padding:0, overflow:"hidden" }}>
        {/* Mode toggle */}
        <div style={{ display:"flex", borderBottom:"1px solid #1e1e1e" }}>
          {[["file","⬆  Upload File"],["url","🔗  Paste URL"]].map(([m, lb]) => (
            <button key={m} onClick={() => { setMode(m); setFile(null); setUrl(""); }}
              style={{ flex:1, padding:"13px", background:mode===m?"#141414":"transparent", border:"none", borderRight:"1px solid #1e1e1e", color:mode===m?"#fff":"#555", fontWeight:mode===m?700:400, fontSize:14, cursor:"pointer" }}>
              {lb}
            </button>
          ))}
        </div>

        {mode === "file" ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current.click()}
            style={{ padding:"52px 32px", textAlign:"center", cursor:"pointer", background:dragging?"#40A0C008":"transparent", border:dragging?"2px dashed #40A0C066":"2px dashed transparent", transition:"background .15s" }}>
            <input ref={inputRef} type="file" accept="video/*" style={{ display:"none" }} onChange={e => setFile(e.target.files[0] || null)} />
            {file ? (
              <>
                <div style={{ fontSize:36, marginBottom:10 }}>🎬</div>
                <div style={{ fontSize:16, fontWeight:700, color:"#E0E0F8", marginBottom:4 }}>{file.name}</div>
                <div style={{ fontSize:13, color:"#555" }}>{(file.size / 1024 / 1024).toFixed(1)} MB</div>
                <button onClick={e => { e.stopPropagation(); setFile(null); }} style={{ marginTop:14, padding:"5px 14px", background:"transparent", border:"1px solid #333", borderRadius:7, color:"#777", cursor:"pointer", fontSize:12 }}>✕ Remove</button>
              </>
            ) : (
              <>
                <div style={{ fontSize:42, marginBottom:12, opacity:.4 }}>⬆</div>
                <div style={{ fontSize:16, fontWeight:600, color:"#888", marginBottom:6 }}>Drop your video here or click to browse</div>
                <div style={{ fontSize:13, color:"#555" }}>MP4, MOV, MKV · max 200 MB · best with 1–60 min videos</div>
              </>
            )}
          </div>
        ) : (
          <div style={{ padding:"28px 24px" }}>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=... or any direct video URL"
              className="inp" style={{ fontSize:15 }} />
            <div style={{ fontSize:12, color:"#555", marginTop:8 }}>Supports YouTube, YouTube Shorts, and direct video URLs</div>
          </div>
        )}
      </div>

      {/* Options */}
      {hasInput && (
        <div className="card" style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#E0E0F8", marginBottom:2 }}>What should AI generate?</div>
          <OptionRow id="meta"       label="Title, description & tags"  cost={CREDIT_COSTS.meta}       checked={opts.meta}       onChange={v => setOpt("meta",v)} />
          <OptionRow id="thumbnails" label="Thumbnail variants (3 options)" cost={CREDIT_COSTS.thumbnails} checked={opts.thumbnails} onChange={v => setOpt("thumbnails",v)} />
          <OptionRow id="captions"   label="Auto-captions (SRT file)"   cost={CREDIT_COSTS.captions}   checked={opts.captions}   onChange={v => setOpt("captions",v)} />
          <OptionRow id="repurpose"  label="Repurpose into 5 viral clips" cost={CREDIT_COSTS.repurpose}  checked={opts.repurpose}  onChange={v => setOpt("repurpose",v)} />

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:8, borderTop:"1px solid #1e1e1e", flexWrap:"wrap", gap:12 }}>
            <div style={{ fontSize:13, color:"#555", fontFamily:"'DM Mono',monospace" }}>
              Total: <span style={{ color: totalCost > 0 ? "#40A0C0" : "#555", fontWeight:700 }}>{totalCost} credits</span>
              {opts.repurpose && <span style={{ display:"block", fontSize:11, color:"#555", marginTop:2 }}>⚠ Repurpose adds ~5 min processing time</span>}
            </div>
            <button onClick={process} disabled={totalCost === 0 || phase === "processing"} className="btn-primary" style={{ padding:"12px 32px", fontSize:15 }}>
              ⚡ Process with AI →
            </button>
          </div>
        </div>
      )}

      {err && (
        <div style={{ padding:"12px 16px", background:"#EF444410", border:"1px solid #EF444422", borderRadius:10, color:"#EF4444", fontSize:13, display:"flex", justifyContent:"space-between" }}>
          {err}
          <button onClick={() => setErr("")} style={{ background:"none", border:"none", color:"#EF4444", cursor:"pointer", fontSize:18, lineHeight:1 }}>×</button>
        </div>
      )}

      {/* Processing state */}
      {phase === "processing" && (
        <div className="card" style={{ padding:"48px 32px", textAlign:"center" }}>
          <div style={{ fontSize:36, color:"#40A0C0", animation:"spin 1s linear infinite", display:"inline-block", marginBottom:18 }}>◌</div>
          <div style={{ fontSize:18, fontWeight:700, color:"#E0E0F8", marginBottom:10 }}>AI is processing your video…</div>
          <div style={{ fontSize:14, color:"#6090A8", marginBottom:6 }}>Transcribing → writing metadata → generating thumbnails</div>
          {opts.repurpose && <div style={{ fontSize:13, color:"#555", marginTop:4 }}>Finding best clips takes 3–8 min — don't close this tab</div>}
        </div>
      )}
    </div>
  );

  // ── Results phase ──────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, maxWidth:900, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em", fontFamily:"'DM Mono',monospace" }}>
            <span style={{ color:"#40A0C0", fontWeight:400 }}>/</span> Results
          </h1>
          <div style={{ fontSize:13, color:"#40A0C0", fontFamily:"'DM Mono',monospace", marginTop:4 }}>
            // AI processing complete · {results.creditsUsed} credits used
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => setPage("calendar")} className="btn-primary" style={{ padding:"10px 22px", fontSize:14 }}>
            📅 Schedule to platforms →
          </button>
          <button onClick={reset} className="btn-ghost" style={{ padding:"10px 18px", fontSize:14 }}>
            ↺ New upload
          </button>
        </div>
      </div>

      {/* Meta */}
      {editMeta && (
        <div className="card" style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#E0E0F8" }}>Title, Description &amp; Tags</div>
          <div>
            <div style={{ fontSize:12, color:"#555", marginBottom:6, textTransform:"uppercase", letterSpacing:".08em" }}>Title</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={editMeta.title} onChange={e => setEditMeta(m => ({ ...m, title: e.target.value }))} className="inp" style={{ flex:1 }} />
              <CopyBtn text={editMeta.title} />
            </div>
          </div>
          <div>
            <div style={{ fontSize:12, color:"#555", marginBottom:6, textTransform:"uppercase", letterSpacing:".08em" }}>Description</div>
            <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
              <textarea value={editMeta.description} onChange={e => setEditMeta(m => ({ ...m, description: e.target.value }))}
                className="inp" style={{ flex:1, minHeight:100, resize:"vertical", lineHeight:1.6 }} />
              <CopyBtn text={editMeta.description} />
            </div>
          </div>
          <div>
            <div style={{ fontSize:12, color:"#555", marginBottom:6, textTransform:"uppercase", letterSpacing:".08em" }}>Tags</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={editMeta.tags} onChange={e => setEditMeta(m => ({ ...m, tags: e.target.value }))}
                placeholder="tag1, tag2, tag3…" className="inp" style={{ flex:1 }} />
              <CopyBtn text={editMeta.tags} />
            </div>
          </div>
        </div>
      )}

      {/* Thumbnails */}
      {results.thumbnails?.length > 0 && (
        <div className="card" style={{ padding:24 }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#E0E0F8", marginBottom:14 }}>Thumbnail Variants — pick your favourite</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
            {results.thumbnails.map((t, i) => (
              <div key={i} onClick={() => setPickedThumb(i)}
                style={{ borderRadius:12, overflow:"hidden", border:`2px solid ${pickedThumb===i?"#40A0C0":"#1e1e1e"}`, cursor:"pointer", background:"#0a0a0a" }}>
                <img src={t.url} alt={t.label} style={{ width:"100%", aspectRatio:"16/9", objectFit:"cover", display:"block" }} onError={e => e.currentTarget.style.display="none"} />
                <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ fontSize:13, fontWeight:600, color:pickedThumb===i?"#40A0C0":"#888" }}>{pickedThumb===i?"✓ ":""}{t.label}</div>
                  <a href={t.url} download={`thumbnail-${i+1}.png`} onClick={e => e.stopPropagation()}
                    style={{ fontSize:11, color:"#40A0C0", textDecoration:"none", border:"1px solid #1e3040", borderRadius:6, padding:"3px 10px" }}>⬇ Save</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Captions */}
      {results.captions?.srt && (
        <div className="card" style={{ padding:24 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#E0E0F8" }}>Auto-Captions (SRT)</div>
            <div style={{ display:"flex", gap:8 }}>
              <CopyBtn text={results.captions.srt} />
              <button onClick={() => { const b = new Blob([results.captions.srt],{type:"text/plain"}); const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="captions.srt";a.click(); }}
                style={{ padding:"4px 14px", fontSize:12, background:"#40A0C015", border:"1px solid #40A0C033", borderRadius:7, color:"#40A0C0", cursor:"pointer" }}>⬇ Download .srt</button>
            </div>
          </div>
          <pre style={{ fontSize:12, color:"#8888B8", lineHeight:1.7, maxHeight:220, overflowY:"auto", background:"#0a0a0a", padding:16, borderRadius:10, fontFamily:"'DM Mono',monospace", whiteSpace:"pre-wrap" }}>
            {results.captions.srt.slice(0, 1500)}{results.captions.srt.length > 1500 ? "\n…(truncated)" : ""}
          </pre>
        </div>
      )}

      {/* Repurposed clips */}
      {results.clips?.length > 0 && (
        <div className="card" style={{ padding:24 }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#E0E0F8", marginBottom:16 }}>{results.clips.length} Viral Clips — ready to post</div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {results.clips.map((c, i) => (
              <div key={i} style={{ display:"flex", gap:16, alignItems:"flex-start", padding:"14px 16px", background:"#0a0a0a", borderRadius:12, border:"1px solid #1e1e1e", flexWrap:"wrap" }}>
                <video src={c.url} controls style={{ width:200, height:112, borderRadius:8, background:"#000", objectFit:"cover", flexShrink:0 }} />
                <div style={{ flex:1, minWidth:180 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#E0E0F8", marginBottom:5 }}>{c.title}</div>
                  <div style={{ fontSize:13, color:"#40A0C0", marginBottom:8, fontStyle:"italic" }}>"{c.hook}"</div>
                  <div style={{ fontSize:12, color:"#555", marginBottom:12 }}>{c.duration}s · TikTok / Reels / Shorts</div>
                  <div style={{ display:"flex", gap:8 }}>
                    <a href={c.url} download={`clip-${i+1}.mp4`} className="btn-primary" style={{ padding:"7px 18px", fontSize:12, textDecoration:"none", display:"inline-block" }}>⬇ Download</a>
                    <CopyBtn text={c.hook} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
