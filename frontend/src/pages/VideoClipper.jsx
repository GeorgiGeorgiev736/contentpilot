import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
function getToken() { return localStorage.getItem("token"); }
function fmt(s) { const m = Math.floor(s / 60), sec = Math.floor(s % 60); return `${m}:${String(sec).padStart(2, "0")}`; }

async function apiFetch(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Request failed"); }
  return res.json();
}

const TYPE_COLORS = { hook:"#7C5CFC", tip:"#22C55E", reveal:"#F59E0B", story:"#3B82F6", cta:"#EC4899", reaction:"#69C9D0" };
const PLATFORMS = [
  { id:"youtube_shorts", label:"YouTube Shorts", icon:"▶", color:"#FF0000", note:"Under 60s · Vertical" },
  { id:"tiktok",         label:"TikTok",         icon:"♪", color:"#69C9D0", note:"Up to 3 min · Vertical" },
  { id:"instagram",      label:"Instagram Reels", icon:"◈", color:"#E1306C", note:"Up to 90s · Vertical" },
];

export default function VideoClipper({ setPage }) {
  // ── Upload state ─────────────────────────────────────────────
  const [step,        setStep]       = useState("upload"); // upload | review | edit | done
  const [uploading,   setUploading]  = useState(false);
  const [sourceUrl,   setSourceUrl]  = useState(null);
  const [sourceDur,   setSourceDur]  = useState(0);
  const [sourceTitle, setSourceTitle]= useState("");
  const [sourceNiche, setSourceNiche]= useState("");

  // ── AI suggestions ───────────────────────────────────────────
  const [suggesting,  setSuggesting] = useState(false);
  const [suggestions, setSuggestions]= useState([]);
  const [suggestErr,  setSuggestErr] = useState("");

  // ── Editor state ──────────────────────────────────────────────
  const [start,       setStart]      = useState(0);
  const [end,         setEnd]        = useState(0);
  const [mute,        setMute]       = useState(false);
  const [trimming,    setTrimming]   = useState(false);
  const [clipUrl,     setClipUrl]    = useState(null);
  const [clipDur,     setClipDur]    = useState(0);

  // ── Finalize / publish form ────────────────────────────────────
  const [pubTitle,    setPubTitle]   = useState("");
  const [pubDesc,     setPubDesc]    = useState("");
  const [pubTags,     setPubTags]    = useState("#Shorts #viral");
  const [pubPlatforms,setPubPlatforms]= useState({ youtube_shorts: true, tiktok: false, instagram: false });
  const [thumbUrls,   setThumbUrls]  = useState([]);
  const [selThumb,    setSelThumb]   = useState(null);
  const [loadingThumbs,setLoadingThumbs]=useState(false);

  // ── Done state ────────────────────────────────────────────────
  const [publishing,  setPublishing] = useState(false);
  const [published,   setPublished]  = useState(false);
  const [schedModal,  setSchedModal] = useState(false);
  const [schedTime,   setSchedTime]  = useState("");
  const [error,       setError]      = useState("");

  // ── Batch scheduling state ────────────────────────────────────
  const [batchStart,     setBatchStart]     = useState("");
  const [batchInterval,  setBatchInterval]  = useState(6);
  const [batchPlatforms, setBatchPlatforms] = useState(["youtube_shorts","tiktok","instagram"]);
  const [batchBusy,      setBatchBusy]      = useState(false);
  const [batchErr,       setBatchErr]       = useState("");
  const [batchDone,      setBatchDone]      = useState(false);

  const videoRef     = useRef();
  const fileInputRef = useRef();
  const trackRef     = useRef();

  const seek = useCallback((t) => { if (videoRef.current) videoRef.current.currentTime = t; }, []);

  // ── Timeline drag ─────────────────────────────────────────────
  const onTrackMouseDown = (handle, e) => {
    e.preventDefault();
    const onMove = (ev) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x   = (ev.touches?.[0]?.clientX ?? ev.clientX) - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const t   = pct * sourceDur;
      if (handle === "start") {
        const ns = Math.min(t, end - 1);
        setStart(Math.max(0, ns)); seek(Math.max(0, ns));
      } else {
        const ne = Math.max(t, start + 1);
        setEnd(Math.min(sourceDur, Math.min(start + 180, ne))); seek(ne);
      }
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend",  onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend",  onUp);
  };

  // ── Upload ────────────────────────────────────────────────────
  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("video", file);
      const res = await fetch(`${API}/api/clips/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Upload failed"); }
      const data = await res.json();
      setSourceUrl(data.video_url);
      setSourceDur(data.duration);
      if (!sourceTitle) setSourceTitle(file.name.replace(/\.[^.]+$/, "").replace(/_/g, " "));
      setStart(0);
      setEnd(Math.min(59, data.duration));
      setStep("review");
    } catch (err) { setError(err.message); }
    finally { setUploading(false); }
  };

  // ── AI detect clips ───────────────────────────────────────────
  const detectClips = async () => {
    setSuggesting(true); setSuggestErr(""); setSuggestions([]);
    try {
      const data = await apiFetch("POST", "/api/clips/suggest", {
        title:    sourceTitle,
        duration: sourceDur,
        niche:    sourceNiche,
        video_url: sourceUrl,
      });
      setSuggestions(data.clips || []);
      if (!data.clips?.length) setSuggestErr("No clip suggestions returned — try adding a title or niche.");
    } catch (err) { setSuggestErr(err.message); }
    finally { setSuggesting(false); }
  };

  // ── Select a suggestion and go to editor ──────────────────────
  const pickSuggestion = (s) => {
    setStart(s.start); setEnd(s.end);
    setPubTitle(s.title || "");
    seek(s.start);
    setStep("edit");
    loadThumbnails(s.start, s.end);
  };

  const goManualEdit = () => {
    setStep("edit");
    loadThumbnails(0, Math.min(59, sourceDur));
  };

  // ── Extract thumbnail frames ──────────────────────────────────
  const loadThumbnails = async (s, e) => {
    if (!sourceUrl) return;
    setLoadingThumbs(true); setThumbUrls([]); setSelThumb(null);
    const mid = (s + e) / 2;
    const times = [
      Math.max(0, s + 1),
      Math.round(mid),
      Math.max(0, e - 2),
    ];
    try {
      const results = await Promise.allSettled(
        times.map(t => fetch(`${API}/api/clips/thumbnail?video_url=${encodeURIComponent(sourceUrl)}&time=${t}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }).then(r => r.json()))
      );
      const urls = results.filter(r => r.status === "fulfilled" && r.value.thumbnail_url).map(r => r.value.thumbnail_url);
      setThumbUrls(urls);
      if (urls.length) setSelThumb(urls[0]);
    } catch {}
    finally { setLoadingThumbs(false); }
  };

  // Reload thumbnails when end handle settles
  useEffect(() => {
    if (step !== "edit") return;
    const t = setTimeout(() => loadThumbnails(start, end), 800);
    return () => clearTimeout(t);
  }, [start, end]);

  // ── Trim ──────────────────────────────────────────────────────
  const trim = async () => {
    setTrimming(true); setError("");
    try {
      const data = await apiFetch("POST", "/api/clips/trim", {
        video_url: sourceUrl,
        start:     Math.round(start * 10) / 10,
        end:       Math.round(end   * 10) / 10,
        mute,
      });
      setClipUrl(data.clip_url);
      setClipDur(data.duration);
      setStep("done");
      setPublished(false);
    } catch (err) { setError(err.message); }
    finally { setTrimming(false); }
  };

  // ── Publish ───────────────────────────────────────────────────
  const selectedPlatformIds = Object.entries(pubPlatforms).filter(([, v]) => v).map(([k]) => k);

  const doPublish = async (scheduledFor) => {
    setPublishing(true); setError("");
    try {
      const tags = pubTags.split(/[\s,]+/).filter(Boolean);
      const platforms = selectedPlatformIds.map(p => p === "youtube_shorts" ? "youtube" : p);
      await apiFetch("POST", "/api/schedule", {
        title:         pubTitle || "#Shorts",
        description:   pubDesc,
        hashtags:      [...new Set([...tags, ...(selectedPlatformIds.includes("youtube_shorts") ? ["#Shorts"] : [])])],
        platforms,
        scheduled_for: scheduledFor || new Date(Date.now() + 5000).toISOString(),
        video_url:     clipUrl,
        thumbnail_url: selThumb || undefined,
        is_short:      selectedPlatformIds.includes("youtube_shorts"),
      });
      setPublished(true);
      setSchedModal(false);
    } catch (err) { setError(err.message); }
    finally { setPublishing(false); }
  };

  // ── Batch schedule all clips ──────────────────────────────────
  const scheduleBatch = async () => {
    if (!batchStart || batchPlatforms.length === 0) return;
    setBatchBusy(true); setBatchErr("");
    try {
      const platforms = batchPlatforms.map(p => p === "youtube_shorts" ? "youtube" : p);
      const isShort   = batchPlatforms.includes("youtube_shorts");
      let errors = 0;
      for (let i = 0; i < suggestions.length; i++) {
        const s = suggestions[i];
        const scheduledFor = new Date(new Date(batchStart).getTime() + i * batchInterval * 3600000).toISOString();
        try {
          const trimData = await apiFetch("POST", "/api/clips/trim", {
            video_url: sourceUrl,
            start: Math.round(s.start * 10) / 10,
            end:   Math.round(s.end   * 10) / 10,
            mute:  false,
          });
          await apiFetch("POST", "/api/schedule", {
            title:         s.title || pubTitle || "#Shorts",
            description:   s.reason || "",
            hashtags:      ["#Shorts","#viral","#shorts"],
            platforms,
            scheduled_for: scheduledFor,
            video_url:     trimData.clip_url,
            is_short:      isShort,
          });
        } catch { errors++; }
      }
      if (errors === suggestions.length) throw new Error("All clips failed to schedule");
      setBatchDone(true);
    } catch (err) { setBatchErr(err.message); }
    finally { setBatchBusy(false); }
  };

  // ── Reset ─────────────────────────────────────────────────────
  const reset = () => {
    setStep("upload"); setSourceUrl(null); setClipUrl(null); setSuggestions([]);
    setSourceDur(0); setStart(0); setEnd(0); setError(""); setPublished(false);
    setThumbUrls([]); setSelThumb(null); setPubTitle(""); setPubDesc(""); setSuggestErr("");
    setBatchStart(""); setBatchInterval(6); setBatchPlatforms(["youtube_shorts","tiktok","instagram"]);
    setBatchBusy(false); setBatchErr(""); setBatchDone(false);
  };

  const clipLength = end - start;
  const startPct   = sourceDur ? (start / sourceDur) * 100 : 0;
  const endPct     = sourceDur ? (end   / sourceDur) * 100 : 100;
  const isShortEligible = clipLength <= 60;

  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:22 }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em" }}>Video Clipper</h1>
          <p style={{ color:"#9090B8", fontSize:15, marginTop:5 }}>
            AI detects the best Short moments · trim · edit · publish to YouTube Shorts, TikTok &amp; Instagram Reels
          </p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {step !== "upload" && (
            <>
              {step === "edit" && <button onClick={() => setStep("review")} className="btn-ghost" style={{ padding:"9px 16px", fontSize:13 }}>← Back</button>}
              <button onClick={reset} className="btn-ghost" style={{ padding:"9px 16px", fontSize:13 }}>✕ New Clip</button>
            </>
          )}
        </div>
      </div>

      {/* Progress steps */}
      {step !== "upload" && (
        <div style={{ display:"flex", alignItems:"center", gap:0 }}>
          {[["review","1","Review"],["edit","2","Edit"],["done","3","Publish"]].map(([id, num, label], i) => {
            const states = ["review","edit","done"];
            const cur    = states.indexOf(step);
            const idx    = states.indexOf(id);
            const done   = cur > idx;
            const active = cur === idx;
            return (
              <div key={id} style={{ display:"flex", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, cursor: done ? "pointer" : "default" }}
                  onClick={() => { if (done || active) { if(id==="review") setStep("review"); if(id==="edit"&&cur>1) setStep("edit"); }}}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background: active?"#7C5CFC": done?"#22C55E22":"#1A1A2E", border:`2px solid ${active?"#7C5CFC":done?"#22C55E":"#2A2A4A"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color: active?"#fff": done?"#22C55E":"#5A5A80" }}>
                    {done ? "✓" : num}
                  </div>
                  <span style={{ fontSize:13, color: active?"#E0E0F0": done?"#9898B8":"#5A5A80", fontWeight: active?600:400 }}>{label}</span>
                </div>
                {i < 2 && <div style={{ width:32, height:1, background: done?"#22C55E44":"#1A1A2E", margin:"0 8px" }}/>}
              </div>
            );
          })}
        </div>
      )}

      {error && <div style={{ padding:"12px 16px", background:"#EF444410", border:"1px solid #EF444422", borderRadius:10, color:"#EF4444", fontSize:13 }}>{error}</div>}

      {/* ══════════════════════════════════════════════════════════
          STEP 1 — UPLOAD
          ══════════════════════════════════════════════════════════ */}
      {step === "upload" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="card" style={{ padding:40 }}>
            <input ref={fileInputRef} type="file" accept="video/*" onChange={onFileChange} style={{ display:"none" }} />
            <div onClick={() => !uploading && fileInputRef.current.click()}
              style={{ border:"2px dashed #7C5CFC44", borderRadius:16, padding:"52px 40px", textAlign:"center", cursor: uploading?"default":"pointer", transition:"border-color .15s" }}
              onMouseEnter={e => !uploading && (e.currentTarget.style.borderColor="#7C5CFC88")}
              onMouseLeave={e => (e.currentTarget.style.borderColor="#7C5CFC44")}>
              {uploading ? (
                <>
                  <div style={{ width:40, height:40, border:"3px solid #1E1E32", borderTopColor:"#7C5CFC", borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 16px" }}/>
                  <div style={{ fontSize:16, color:"#B09FFF", fontWeight:600 }}>Uploading video…</div>
                  <div style={{ fontSize:13, color:"#7878A8", marginTop:6 }}>Large files may take a moment</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize:52, marginBottom:14 }}>🎬</div>
                  <div style={{ fontSize:20, color:"#C4B5FD", fontWeight:700, marginBottom:8 }}>Drop your video here or click to browse</div>
                  <div style={{ fontSize:14, color:"#8888B8", marginBottom:28 }}>MP4, MOV, WebM — up to 2 GB</div>
                  <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
                    {["AI detects best Short moments","Auto-crops to 9:16 vertical","Publish to 3 platforms at once","No camera needed after upload"].map(t=>(
                      <span key={t} style={{ background:"#7C5CFC12", border:"1px solid #7C5CFC22", color:"#B09FFF", fontSize:12, padding:"5px 14px", borderRadius:20 }}>{t}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Context fields for AI */}
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#C0C0D8", marginBottom:14 }}>Video context <span style={{ color:"#5A5A80", fontWeight:400 }}>(optional — helps AI detect better clips)</span></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <div style={{ fontSize:11, color:"#8888B8", marginBottom:5, textTransform:"uppercase", letterSpacing:".06em" }}>Video title</div>
                <input value={sourceTitle} onChange={e=>setSourceTitle(e.target.value)} className="inp" placeholder="e.g. 10 AI tools that saved my business"/>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#8888B8", marginBottom:5, textTransform:"uppercase", letterSpacing:".06em" }}>Niche / topic</div>
                <input value={sourceNiche} onChange={e=>setSourceNiche(e.target.value)} className="inp" placeholder="e.g. AI tools, productivity, dev"/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 2 — REVIEW (AI suggestions)
          ══════════════════════════════════════════════════════════ */}
      {step === "review" && sourceUrl && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:20, alignItems:"start" }}>

          {/* Left: source video preview */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div className="card" style={{ padding:16 }}>
              <video src={`${API}${sourceUrl}`} controls
                style={{ width:"100%", borderRadius:10, background:"#000", maxHeight:380, objectFit:"contain" }}/>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12, padding:"0 4px" }}>
                <div style={{ fontSize:13, color:"#C0C0D8", fontWeight:600 }}>{sourceTitle || "Uploaded video"}</div>
                <span style={{ fontSize:12, color:"#8888A8" }}>Duration: {fmt(sourceDur)}</span>
              </div>
            </div>

            {/* Suggestions list */}
            {suggestions.length > 0 && (
              <div className="card" style={{ padding:18 }}>
                <div style={{ fontSize:14, fontWeight:600, color:"#D8D8F0", marginBottom:14 }}>
                  AI detected {suggestions.length} viral moments
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {suggestions.map((s, i) => {
                    const col = TYPE_COLORS[s.type] || "#7C5CFC";
                    const len = s.end - s.start;
                    return (
                      <div key={i} onClick={() => pickSuggestion(s)}
                        style={{ display:"flex", gap:14, padding:"14px 16px", borderRadius:12, cursor:"pointer", background:"#0C0C1A", border:`1px solid #20203A`, transition:"all .15s" }}
                        onMouseEnter={e=>{ e.currentTarget.style.background="#0F0F20"; e.currentTarget.style.borderColor=col+"55"; }}
                        onMouseLeave={e=>{ e.currentTarget.style.background="#0C0C1A"; e.currentTarget.style.borderColor="#20203A"; }}>
                        <div style={{ flexShrink:0, textAlign:"center", minWidth:52 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:col, background:`${col}18`, padding:"3px 8px", borderRadius:6, marginBottom:5 }}>{s.type || "clip"}</div>
                          <div style={{ fontSize:12, color:"#9898B8", fontFamily:"DM Mono,monospace" }}>{fmt(s.start)}</div>
                          <div style={{ fontSize:10, color:"#5A5A80" }}>→{fmt(s.end)}</div>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:"#E0E0F0", marginBottom:5, lineHeight:1.4 }}>{s.title || "Untitled clip"}</div>
                          <div style={{ fontSize:12, color:"#8888A8", lineHeight:1.5 }}>{s.reason}</div>
                        </div>
                        <div style={{ flexShrink:0, textAlign:"right" }}>
                          <div style={{ fontSize:16, fontWeight:700, color: s.score>=90?"#22C55E": s.score>=70?"#F59E0B":"#EF4444" }}>{s.score}</div>
                          <div style={{ fontSize:11, color:"#5A5A80" }}>{len}s</div>
                          <div style={{ fontSize:12, color:col, marginTop:6, fontWeight:600 }}>Edit →</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {suggestErr && (
              <div style={{ padding:"12px 16px", background:"#F59E0B08", border:"1px solid #F59E0B22", borderRadius:10, fontSize:13, color:"#C0943A" }}>⚠ {suggestErr}</div>
            )}

            {suggestions.length > 1 && (
              <div className="card" style={{ padding:22, border:"1px solid #22C55E33", background:"#22C55E04" }}>
                {batchDone ? (
                  <div style={{ textAlign:"center", padding:"16px 0" }}>
                    <div style={{ fontSize:32, marginBottom:10 }}>📅</div>
                    <div style={{ fontSize:15, fontWeight:700, color:"#22C55E", marginBottom:6 }}>All {suggestions.length} clips scheduled!</div>
                    <div style={{ fontSize:13, color:"#8888A8", lineHeight:1.6 }}>
                      Your clips are queued to release at {batchInterval}h intervals across {batchPlatforms.length} platform{batchPlatforms.length !== 1 ? "s" : ""}.
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize:15, fontWeight:700, color:"#D8D8F0", marginBottom:6 }}>📅 Batch Release All {suggestions.length} Clips</div>
                    <div style={{ fontSize:13, color:"#8888A8", marginBottom:16 }}>Schedule all detected clips to release at a set interval across all platforms — perfect for spacing out your podcast highlights.</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
                      <div>
                        <div style={{ fontSize:11, color:"#8888B8", textTransform:"uppercase", letterSpacing:".06em", marginBottom:5 }}>First release</div>
                        <input type="datetime-local" value={batchStart} onChange={e=>setBatchStart(e.target.value)} className="inp" style={{ colorScheme:"dark" }}/>
                      </div>
                      <div>
                        <div style={{ fontSize:11, color:"#8888B8", textTransform:"uppercase", letterSpacing:".06em", marginBottom:5 }}>Interval between clips</div>
                        <select value={batchInterval} onChange={e=>setBatchInterval(Number(e.target.value))} className="inp">
                          <option value={1}>Every 1 hour</option>
                          <option value={3}>Every 3 hours</option>
                          <option value={6}>Every 6 hours</option>
                          <option value={12}>Every 12 hours</option>
                          <option value={24}>Every 24 hours</option>
                          <option value={48}>Every 48 hours</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
                      {[{id:"youtube_shorts",label:"YouTube Shorts",color:"#FF0000",icon:"▶"},{id:"tiktok",label:"TikTok",color:"#69C9D0",icon:"♪"},{id:"instagram",label:"Instagram Reels",color:"#E1306C",icon:"◈"}].map(p=>(
                        <label key={p.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:10, border:`1px solid ${batchPlatforms.includes(p.id)?p.color+"44":"#1E1E32"}`, background:batchPlatforms.includes(p.id)?`${p.color}10`:"#080810", cursor:"pointer" }}>
                          <input type="checkbox" checked={batchPlatforms.includes(p.id)} onChange={e=>setBatchPlatforms(prev=>e.target.checked?[...prev,p.id]:prev.filter(x=>x!==p.id))} style={{ accentColor:p.color }}/>
                          <span style={{ color:p.color, fontWeight:700 }}>{p.icon}</span>
                          <span style={{ fontSize:12, color:"#C0C0D8" }}>{p.label}</span>
                        </label>
                      ))}
                    </div>
                    {batchErr && <div style={{ color:"#EF4444", fontSize:13, marginBottom:10 }}>{batchErr}</div>}
                    <button onClick={scheduleBatch} disabled={batchBusy||!batchStart||batchPlatforms.length===0} className="btn-primary" style={{ padding:"12px 24px", fontSize:14, display:"flex", alignItems:"center", gap:8 }}>
                      {batchBusy ? <><span style={{ width:14,height:14,border:"2px solid #fff4",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin 1s linear infinite" }}/> Scheduling…</> : `📅 Schedule all ${suggestions.length} clips as a series`}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: detect button + manual option */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div className="card" style={{ padding:22 }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#E0E0F0", marginBottom:6 }}>Detect Best Clips</div>
              <div style={{ fontSize:13, color:"#8888A8", marginBottom:18, lineHeight:1.6 }}>
                AI analyzes your video's duration, title &amp; niche to find the moments most likely to go viral as Shorts.
              </div>
              <button onClick={detectClips} disabled={suggesting} className="btn-primary"
                style={{ width:"100%", padding:"13px", fontSize:14, marginBottom:10, display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                {suggesting ? (
                  <><span style={{ width:14, height:14, border:"2px solid #fff4", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"spin 1s linear infinite" }}/> Detecting…</>
                ) : <>◎ Detect Clips <span style={{ background:"rgba(255,255,255,0.15)", fontSize:11, padding:"2px 8px", borderRadius:10 }}>3✦</span></>}
              </button>
              <div style={{ fontSize:11, color:"#7878A8", textAlign:"center" }}>Uses 3 AI credits</div>
            </div>

            <div className="card" style={{ padding:18 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#C0C0D8", marginBottom:10 }}>Or clip manually</div>
              <div style={{ fontSize:13, color:"#8888A8", marginBottom:14 }}>
                Select your own start and end points on the timeline editor.
              </div>
              <button onClick={goManualEdit} className="btn-ghost" style={{ width:"100%", padding:"11px", fontSize:13 }}>
                ✂ Open Editor →
              </button>
            </div>

            <div className="card" style={{ padding:16 }}>
              <div style={{ fontSize:11, color:"#7878A8", textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>Platforms</div>
              {PLATFORMS.map(p => (
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:p.color }}/>
                  <div>
                    <div style={{ fontSize:12, color:"#C0C0D8" }}>{p.label}</div>
                    <div style={{ fontSize:11, color:"#7878A8" }}>{p.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 3 — EDIT
          ══════════════════════════════════════════════════════════ */}
      {step === "edit" && sourceUrl && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:20, alignItems:"start" }}>

          {/* Left: video + timeline */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div className="card" style={{ padding:16 }}>
              <video ref={videoRef} src={`${API}${sourceUrl}`} controls
                style={{ width:"100%", borderRadius:10, background:"#000", maxHeight:380, objectFit:"contain" }}/>
            </div>

            {/* Timeline */}
            <div className="card" style={{ padding:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12, alignItems:"center" }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#D8D8F0" }}>Clip Range</div>
                <div style={{ fontSize:13, fontWeight:600, color: isShortEligible?"#22C55E":"#F59E0B" }}>
                  {fmt(clipLength)} {isShortEligible ? "· Short-eligible ✓" : "· over 60s"}
                </div>
              </div>

              <div ref={trackRef} style={{ position:"relative", height:52, borderRadius:8, background:"#080810", border:"1px solid #1A1A2E", cursor:"pointer", userSelect:"none" }}>
                <div style={{ position:"absolute", inset:0, borderRadius:8, background:"#12122A" }}/>
                <div style={{ position:"absolute", top:0, bottom:0, left:`${startPct}%`, width:`${endPct-startPct}%`, background:"#7C5CFC22", borderTop:"2px solid #7C5CFC", borderBottom:"2px solid #7C5CFC" }}/>
                {["start","end"].map(handle => (
                  <div key={handle}
                    onMouseDown={e=>onTrackMouseDown(handle, e)}
                    onTouchStart={e=>onTrackMouseDown(handle, e)}
                    style={{ position:"absolute", top:0, bottom:0, left:`${handle==="start"?startPct:endPct}%`, transform:"translateX(-50%)", width:14, background:"#7C5CFC", borderRadius:4, cursor:"ew-resize", zIndex:2, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ width:2, height:22, background:"#fff5", borderRadius:2 }}/>
                  </div>
                ))}
                {Array.from({length:5}).map((_,i)=>(
                  <div key={i} style={{ position:"absolute", bottom:5, left:`${(i/4)*100}%`, transform:"translateX(-50%)", fontSize:10, color:"#6868A0" }}>{fmt((sourceDur/4)*i)}</div>
                ))}
              </div>

              {/* Time inputs */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:14 }}>
                {[["Start", start, v=>{ const n=Math.max(0,Math.min(Number(v),end-1)); setStart(n); seek(n); }],
                  ["End",   end,   v=>{ const n=Math.min(sourceDur,Math.max(Number(v),start+1)); setEnd(n); seek(n); }]
                ].map(([label,val,setter])=>(
                  <div key={label}>
                    <div style={{ fontSize:11, color:"#8888B8", marginBottom:5, textTransform:"uppercase", letterSpacing:".06em" }}>{label}</div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <input type="number" min={0} max={sourceDur} step={0.1} value={Math.round(val*10)/10} onChange={e=>setter(e.target.value)}
                        style={{ flex:1, background:"#080810", border:"1px solid #20203A", borderRadius:8, color:"#D8D8F0", padding:"8px 10px", fontSize:13, outline:"none", fontFamily:"DM Mono,monospace" }}/>
                      <span style={{ fontSize:13, color:"#7878A8", fontFamily:"DM Mono,monospace", minWidth:36 }}>{fmt(val)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick presets + mute */}
              <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap", alignItems:"center" }}>
                <span style={{ fontSize:12, color:"#8888B8" }}>Quick:</span>
                {[15,30,59].map(sec=>(
                  <button key={sec} onClick={()=>{ setEnd(Math.min(start+sec, sourceDur)); seek(Math.min(start+sec, sourceDur)); }}
                    style={{ padding:"4px 12px", borderRadius:20, border:"1px solid #20203A", background:"transparent", color:"#9898C0", cursor:"pointer", fontSize:12 }}>{sec}s</button>
                ))}
                <button onClick={()=>{ setStart(0); setEnd(Math.min(59,sourceDur)); seek(0); }}
                  style={{ padding:"4px 12px", borderRadius:20, border:"1px solid #20203A", background:"transparent", color:"#9898C0", cursor:"pointer", fontSize:12 }}>Reset</button>
                <button onClick={()=>setMute(!mute)}
                  style={{ padding:"4px 12px", borderRadius:20, border:`1px solid ${mute?"#EF444433":"#20203A"}`, background:mute?"#EF444418":"transparent", color:mute?"#EF4444":"#9898C0", cursor:"pointer", fontSize:12 }}>
                  {mute ? "🔇 Muted" : "🔊 Mute"}
                </button>
              </div>
            </div>

            {/* Thumbnail picker */}
            {(thumbUrls.length > 0 || loadingThumbs) && (
              <div className="card" style={{ padding:18 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#D8D8F0", marginBottom:12 }}>
                  Thumbnail <span style={{ color:"#8888A8", fontWeight:400, fontSize:12 }}>— select cover frame</span>
                </div>
                {loadingThumbs ? (
                  <div style={{ display:"flex", gap:10 }}>
                    {[0,1,2].map(i=><div key={i} style={{ flex:1, height:80, borderRadius:8, background:"#14142A", animation:"shimmer 1.5s ease infinite" }}/>)}
                  </div>
                ) : (
                  <div style={{ display:"flex", gap:10 }}>
                    {thumbUrls.map(url=>(
                      <div key={url} onClick={()=>setSelThumb(url)}
                        style={{ flex:1, height:80, borderRadius:8, overflow:"hidden", cursor:"pointer", border:`2px solid ${selThumb===url?"#7C5CFC":"#20203A"}`, transition:"border-color .15s" }}>
                        <img src={`${API}${url}`} alt="thumb" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: publish settings */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div className="card" style={{ padding:22 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#D8D8F0", marginBottom:16 }}>Publish Settings</div>

              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:"#8888B8", marginBottom:6, textTransform:"uppercase", letterSpacing:".06em" }}>Title</div>
                <input value={pubTitle} onChange={e=>setPubTitle(e.target.value)} className="inp" placeholder="Add a punchy title…"/>
              </div>

              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:"#8888B8", marginBottom:6, textTransform:"uppercase", letterSpacing:".06em" }}>Description</div>
                <textarea value={pubDesc} onChange={e=>setPubDesc(e.target.value)} className="inp" rows={3} placeholder="Optional description…" style={{ resize:"none" }}/>
              </div>

              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, color:"#8888B8", marginBottom:6, textTransform:"uppercase", letterSpacing:".06em" }}>Hashtags</div>
                <input value={pubTags} onChange={e=>setPubTags(e.target.value)} className="inp" placeholder="#Shorts #viral"/>
                {selectedPlatformIds.includes("youtube_shorts") && !pubTags.includes("#Shorts") && (
                  <div style={{ fontSize:11, color:"#F59E0B", marginTop:4 }}>⚠ Add #Shorts for Shorts feed eligibility</div>
                )}
              </div>

              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:11, color:"#8888B8", marginBottom:10, textTransform:"uppercase", letterSpacing:".06em" }}>Publish to</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {PLATFORMS.map(p=>(
                    <label key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, cursor:"pointer", background: pubPlatforms[p.id]?`${p.color}0C`:"#080810", border:`1px solid ${pubPlatforms[p.id]?p.color+"33":"#1E1E32"}`, transition:"all .15s" }}>
                      <input type="checkbox" checked={!!pubPlatforms[p.id]} onChange={e=>setPubPlatforms(prev=>({...prev,[p.id]:e.target.checked}))} style={{ accentColor:p.color, width:15, height:15 }}/>
                      <span style={{ fontSize:14, color:p.color, fontWeight:600 }}>{p.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, color: pubPlatforms[p.id]?"#E0E0F0":"#8888A8", fontWeight: pubPlatforms[p.id]?600:400 }}>{p.label}</div>
                        <div style={{ fontSize:11, color:"#5A5A80" }}>{p.note}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {selectedPlatformIds.length === 0 && (
                <div style={{ fontSize:12, color:"#F59E0B", marginBottom:12 }}>⚠ Select at least one platform</div>
              )}

              <button onClick={trim} disabled={trimming || clipLength <= 0 || selectedPlatformIds.length === 0} className="btn-primary"
                style={{ width:"100%", padding:"13px", fontSize:14, marginBottom:10 }}>
                {trimming ? (
                  <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    <span style={{ width:14, height:14, border:"2px solid #fff4", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"spin 1s linear infinite" }}/>
                    Trimming clip…
                  </span>
                ) : `✂ Trim & Preview (${fmt(clipLength)})`}
              </button>

              {!isShortEligible && (
                <div style={{ fontSize:12, color:"#F59E0B", padding:"8px 12px", background:"#F59E0B08", borderRadius:8 }}>
                  ⚠ Clip is {Math.round(clipLength)}s — over 60s won't appear in Shorts feed
                </div>
              )}
            </div>

            {/* Format info */}
            <div className="card" style={{ padding:16 }}>
              <div style={{ fontSize:11, color:"#7878A8", textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>Output format</div>
              {[["Aspect ratio","9:16 Vertical (auto-crop)"],["Codec","H.264 MP4"],["Quality","High (CRF 23)"],["Max size","59s for Shorts feed"]].map(([k,v])=>(
                <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
                  <span style={{ color:"#7878A8" }}>{k}</span>
                  <span style={{ color:"#C0C0D8" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 4 — DONE (preview + publish)
          ══════════════════════════════════════════════════════════ */}
      {step === "done" && clipUrl && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:20 }}>

          {/* Left: clip preview */}
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontSize:14, fontWeight:600, color:"#D8D8F0", marginBottom:14 }}>
              Preview · {fmt(clipDur)} {isShortEligible ? <span style={{ color:"#22C55E", fontSize:12 }}>· Short-eligible ✓</span> : <span style={{ color:"#F59E0B", fontSize:12 }}>· over 60s</span>}
            </div>
            <video src={`${API}${clipUrl}`} controls
              style={{ width:"100%", borderRadius:10, background:"#000", maxHeight:520, objectFit:"contain" }}/>
            <div style={{ display:"flex", gap:10, marginTop:14 }}>
              <a href={`${API}${clipUrl}`} download style={{ textDecoration:"none", flex:1 }}>
                <button className="btn-ghost" style={{ width:"100%", padding:"10px", fontSize:13 }}>⬇ Download</button>
              </a>
              <button onClick={()=>setStep("edit")} className="btn-ghost" style={{ flex:1, padding:"10px", fontSize:13 }}>✂ Re-edit</button>
            </div>
          </div>

          {/* Right: publish panel */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div className="card" style={{ padding:22 }}>
              {published ? (
                <div style={{ textAlign:"center", padding:"20px 0" }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>🚀</div>
                  <div style={{ fontSize:15, fontWeight:700, color:"#22C55E", marginBottom:6 }}>Queued for publishing!</div>
                  <div style={{ fontSize:13, color:"#8888A8", marginBottom:20, lineHeight:1.6 }}>
                    Your clip is scheduled across{" "}
                    {selectedPlatformIds.map(p=>PLATFORMS.find(pl=>pl.id===p)?.label).join(", ")}.
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <button onClick={()=>setPage("schedule")} className="btn-primary" style={{ padding:"10px 20px", fontSize:13 }}>
                      ◷ View in Scheduler
                    </button>
                    <button onClick={reset} className="btn-ghost" style={{ padding:"10px", fontSize:13 }}>
                      ✂ Clip Another
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize:14, fontWeight:700, color:"#D8D8F0", marginBottom:14 }}>Ready to publish</div>

                  {/* Summary */}
                  <div style={{ marginBottom:16 }}>
                    {pubTitle && <div style={{ fontSize:13, color:"#C0C0E0", fontWeight:600, marginBottom:4 }}>{pubTitle}</div>}
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                      {selectedPlatformIds.map(p => {
                        const pl = PLATFORMS.find(pl=>pl.id===p);
                        return pl ? (
                          <span key={p} style={{ fontSize:11, color:pl.color, background:`${pl.color}18`, padding:"2px 9px", borderRadius:20, fontWeight:600 }}>{pl.icon} {pl.label}</span>
                        ) : null;
                      })}
                    </div>
                    {pubTags && <div style={{ fontSize:12, color:"#8888A8" }}>{pubTags.split(/\s+/).slice(0,5).join(" ")}</div>}
                  </div>

                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <button onClick={()=>doPublish()} disabled={publishing} className="btn-primary" style={{ padding:"13px", fontSize:14 }}>
                      {publishing ? "Publishing…" : "▶ Publish Now"}
                    </button>
                    <button onClick={()=>setSchedModal(true)} className="btn-ghost" style={{ padding:"11px", fontSize:13 }}>
                      ◷ Schedule for Later
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Clip details */}
            <div className="card" style={{ padding:16 }}>
              <div style={{ fontSize:11, color:"#7878A8", textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>Clip details</div>
              {[
                ["Duration",  fmt(clipDur)],
                ["Format",    "9:16 Vertical"],
                ["Codec",     "H.264 MP4"],
                ["Shorts eligible", clipDur<=60?"Yes ✓":"No (over 60s)"],
                ["Muted",     mute?"Yes":"No"],
              ].map(([k,v])=>(
                <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
                  <span style={{ color:"#7878A8" }}>{k}</span>
                  <span style={{ color:"#C0C0D8" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule modal ──────────────────────────────────────── */}
      {schedModal && createPortal(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(6px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ width:400, background:"#0C0C1A", border:"1px solid #7C5CFC33", borderRadius:18, padding:28, boxShadow:"0 0 60px #7C5CFC22" }}>
            <div style={{ fontSize:17, fontWeight:700, color:"#F5F5FF", marginBottom:6 }}>Schedule Clip</div>
            <div style={{ fontSize:13, color:"#8888A8", marginBottom:20 }}>
              Will be queued to: {selectedPlatformIds.map(p=>PLATFORMS.find(pl=>pl.id===p)?.label).join(", ")}
            </div>
            <div style={{ fontSize:12, color:"#8888B8", marginBottom:6, textTransform:"uppercase", letterSpacing:".06em" }}>Date &amp; Time</div>
            <input type="datetime-local" value={schedTime} onChange={e=>setSchedTime(e.target.value)}
              style={{ width:"100%", background:"#080810", border:"1px solid #20203A", borderRadius:9, color:"#D8D8F0", padding:"11px 13px", fontSize:14, outline:"none", marginBottom:20, colorScheme:"dark", boxSizing:"border-box" }}/>
            {error && <div style={{ color:"#EF4444", fontSize:13, marginBottom:12 }}>{error}</div>}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setSchedModal(false)} className="btn-ghost" style={{ flex:1, padding:"11px" }}>Cancel</button>
              <button onClick={()=>schedTime && doPublish(schedTime)} disabled={publishing||!schedTime} className="btn-primary" style={{ flex:2, padding:"11px", fontSize:14 }}>
                {publishing?"Scheduling…":"Schedule →"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
