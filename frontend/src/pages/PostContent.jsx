import { useState, useRef, useEffect, useCallback } from "react";
import { streamAI, platforms as platformsApi } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const STEPS = ["Upload", "Edit & Clip", "AI Metadata", "Schedule"];

// Extract N frames from a video element as data URLs
async function extractFrames(videoEl, count = 6) {
  const frames = [];
  const duration = videoEl.duration;
  if (!duration || !isFinite(duration)) return frames;
  const canvas = document.createElement("canvas");
  canvas.width  = Math.min(videoEl.videoWidth,  640);
  canvas.height = Math.min(videoEl.videoHeight, 360);
  const ctx = canvas.getContext("2d");
  for (let i = 0; i < count; i++) {
    const t = (i / (count - 1)) * duration * 0.9;
    await new Promise(res => {
      videoEl.currentTime = t;
      videoEl.onseeked = () => { ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height); frames.push(canvas.toDataURL("image/jpeg", 0.8)); res(); };
    });
  }
  return frames;
}

export default function PostContent() {
  const [step,         setStep]         = useState(0);
  const [videoFile,    setVideoFile]    = useState(null);
  const [videoUrl,     setVideoUrl]     = useState(null);   // server path
  const [videoPreview, setVideoPreview] = useState(null);   // object URL
  const [uploading,    setUploading]    = useState(false);
  const [clipStart,    setClipStart]    = useState("");
  const [clipEnd,      setClipEnd]      = useState("");
  const [makeShort,    setMakeShort]    = useState(false);
  const [frames,       setFrames]       = useState([]);
  const [thumbIdx,     setThumbIdx]     = useState(0);
  const [title,        setTitle]        = useState("");
  const [description,  setDescription]  = useState("");
  const [hashtags,     setHashtags]     = useState("");
  const [aiLoading,    setAiLoading]    = useState(false);
  const [connections,  setConnections]  = useState([]);
  const [selPlatforms, setSelPlatforms] = useState([]);
  const [scheduleTime, setScheduleTime] = useState("");
  const [postNow,      setPostNow]      = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [done,         setDone]         = useState(false);
  const [error,        setError]        = useState("");
  const videoRef = useRef(null);
  const dropRef  = useRef(null);

  useEffect(() => {
    platformsApi.list()
      .then(({ connections: list }) => setConnections(list.filter(c => c.connected)))
      .catch(() => {});
  }, []);

  // Default schedule to +1 hour
  useEffect(() => {
    const d = new Date(Date.now() + 3600000);
    d.setSeconds(0, 0);
    setScheduleTime(d.toISOString().slice(0, 16));
  }, []);

  const handleDrop = useCallback(async (file) => {
    if (!file || !file.type.startsWith("video/")) { setError("Please upload a video file"); return; }
    setError(""); setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("video", file);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/schedule/upload`, { method:"POST", headers:{ Authorization:`Bearer ${token}` }, body:fd });
      const data = await res.json();
      setVideoUrl(data.video_url);
    } catch { setError("Upload failed — try again"); }
    setUploading(false);
  }, []);

  const onFileChange = e => { if (e.target.files[0]) handleDrop(e.target.files[0]); };

  const onDragOver  = e => { e.preventDefault(); dropRef.current.style.borderColor = "#7C5CFC"; };
  const onDragLeave = ()  => { dropRef.current.style.borderColor = "#2A2A50"; };
  const onDropEvent = e => { e.preventDefault(); onDragLeave(); handleDrop(e.dataTransfer.files[0]); };

  const goToEdit = () => setStep(1);

  const goToAI = async () => {
    setStep(2); setFrames([]);
    if (videoRef.current) {
      try { const f = await extractFrames(videoRef.current, 6); setFrames(f); } catch {}
    }
  };

  const generateAI = async () => {
    setAiLoading(true);
    let out = "";
    await streamAI({
      feature: "optimizer",
      context: { title: videoFile?.name || "video", platform: selPlatforms[0] || "youtube", description: "" },
      onToken: t => { out += t; },
      onDone:  () => {
        // Parse title, description, hashtags from output
        const lines = out.split("\n").filter(Boolean);
        const titleLine = lines.find(l => l.toLowerCase().includes("title:") || l.startsWith("#"));
        const hashLine  = lines.find(l => l.includes("#") && !l.startsWith("#"));
        setTitle(titleLine ? titleLine.replace(/^#*\s*title:\s*/i, "").trim() : lines[0] || "");
        setDescription(lines.slice(1, 4).join("\n"));
        setHashtags(hashLine || lines.find(l => l.includes("#")) || "");
        setAiLoading(false);
      },
      onError: () => setAiLoading(false),
    });
  };

  const togglePlatform = (id) => setSelPlatforms(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const submit = async () => {
    if (!selPlatforms.length) { setError("Select at least one platform"); return; }
    if (!postNow && !scheduleTime) { setError("Set a schedule time"); return; }
    setError(""); setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const body = {
        title: title || videoFile?.name || "Untitled",
        description, hashtags: hashtags.split(/\s+/).filter(h => h.startsWith("#")),
        platforms: selPlatforms,
        scheduled_for: postNow ? new Date().toISOString() : new Date(scheduleTime).toISOString(),
        video_url: videoUrl,
        is_short: makeShort,
      };
      const res = await fetch(`${API}/api/schedule`, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }, body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setDone(true);
    } catch (e) { setError(e.message); }
    setSubmitting(false);
  };

  // ── Done screen ──────────────────────────────────────────────
  if (done) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:400, gap:20, textAlign:"center" }}>
      <div style={{ fontSize:56 }}>🎉</div>
      <h2 style={{ fontSize:26, fontWeight:800, color:"#F5F5FF" }}>
        {postNow ? "Content posted!" : "Content scheduled!"}
      </h2>
      <p style={{ color:"#9090B8", fontSize:15 }}>
        {postNow ? `Posted to ${selPlatforms.join(", ")}` : `Scheduled for ${new Date(scheduleTime).toLocaleString()} on ${selPlatforms.join(", ")}`}
      </p>
      <button onClick={() => { setDone(false); setStep(0); setVideoFile(null); setVideoPreview(null); setVideoUrl(null); setTitle(""); setDescription(""); setHashtags(""); setSelPlatforms([]); }} className="btn-primary" style={{ padding:"12px 32px", fontSize:14 }}>
        Post Another →
      </button>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24, maxWidth:860, margin:"0 auto" }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em" }}>Post Content</h1>
        <p style={{ color:"#9090B8", fontSize:15, marginTop:5 }}>Upload, edit, generate metadata and schedule — all in one flow</p>
      </div>

      {/* Step indicator */}
      <div style={{ display:"flex", alignItems:"center", gap:0 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display:"flex", alignItems:"center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, cursor: i < step ? "pointer" : "default" }} onClick={() => i < step && setStep(i)}>
              <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700,
                background: i < step ? "#22C55E" : i === step ? "linear-gradient(135deg,#7C5CFC,#B45AFD)" : "#1A1A2E",
                color: i <= step ? "#fff" : "#5A5A80", flexShrink:0 }}>
                {i < step ? "✓" : i + 1}
              </div>
              <span style={{ fontSize:13, fontWeight: i === step ? 700 : 400, color: i === step ? "#E0E0F0" : i < step ? "#22C55E" : "#5A5A80", whiteSpace:"nowrap" }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex:1, height:1, background: i < step ? "#22C55E44" : "#1A1A2E", margin:"0 10px" }}/>}
          </div>
        ))}
      </div>

      {error && <div style={{ padding:"12px 16px", background:"#EF444410", border:"1px solid #EF444422", borderRadius:10, color:"#EF4444", fontSize:13 }}>{error}</div>}

      {/* ── Step 0: Upload ── */}
      {step === 0 && (
        <div className="card" style={{ padding:32 }}>
          <input type="file" accept="video/*" id="vidInput" style={{ display:"none" }} onChange={onFileChange} />

          {!videoPreview ? (
            <div
              ref={dropRef}
              onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDropEvent}
              onClick={() => document.getElementById("vidInput").click()}
              style={{ border:"2px dashed #2A2A50", borderRadius:16, padding:"60px 40px", textAlign:"center", cursor:"pointer", transition:"border-color .15s" }}
            >
              <div style={{ fontSize:48, marginBottom:16 }}>🎬</div>
              <div style={{ fontSize:18, fontWeight:700, color:"#E0E0F0", marginBottom:8 }}>Drop your video here</div>
              <div style={{ fontSize:14, color:"#7878A8", marginBottom:20 }}>or click to browse · MP4, MOV, AVI up to 500MB</div>
              <button className="btn-primary" style={{ padding:"11px 28px", fontSize:14 }} onClick={e => { e.stopPropagation(); document.getElementById("vidInput").click(); }}>
                Choose Video
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <video src={videoPreview} controls ref={videoRef} style={{ width:"100%", borderRadius:12, maxHeight:400, background:"#000" }} />
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ flex:1, fontSize:14, color:"#B0B0D0", fontWeight:600 }}>✓ {videoFile?.name}</div>
                <button onClick={() => document.getElementById("vidInput").click()} className="btn-ghost" style={{ padding:"8px 16px", fontSize:13 }}>Change Video</button>
              </div>
              <div style={{ display:"flex", gap:12, justifyContent:"flex-end", marginTop:8 }}>
                <button onClick={goToAI} className="btn-ghost" style={{ padding:"11px 22px", fontSize:14 }} disabled={uploading}>
                  {uploading ? "Uploading…" : "Skip Editing →"}
                </button>
                <button onClick={goToEdit} className="btn-primary" style={{ padding:"11px 28px", fontSize:14 }} disabled={uploading}>
                  {uploading ? "Uploading…" : "Edit & Clip →"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 1: Edit & Clip ── */}
      {step === 1 && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="card" style={{ padding:24 }}>
            <video src={videoPreview} controls ref={videoRef} style={{ width:"100%", borderRadius:12, maxHeight:380, background:"#000" }} />
          </div>

          <div className="card" style={{ padding:24, display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#E0E0F0" }}>Clip Range <span style={{ fontSize:12, color:"#7878A8", fontWeight:400 }}>(optional — leave blank to use full video)</span></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div>
                <label style={{ fontSize:12, color:"#8888B8", display:"block", marginBottom:6 }}>Start time (seconds)</label>
                <input value={clipStart} onChange={e => setClipStart(e.target.value)} placeholder="e.g. 10" className="inp" type="number" min="0" />
              </div>
              <div>
                <label style={{ fontSize:12, color:"#8888B8", display:"block", marginBottom:6 }}>End time (seconds)</label>
                <input value={clipEnd} onChange={e => setClipEnd(e.target.value)} placeholder="e.g. 90" className="inp" type="number" min="0" />
              </div>
            </div>
            <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:14, color:"#C0C0D8" }}>
              <input type="checkbox" checked={makeShort} onChange={e => setMakeShort(e.target.checked)} style={{ width:16, height:16, accentColor:"#7C5CFC" }}/>
              Also create a vertical Short/Reel version (auto-cropped to 9:16)
            </label>
          </div>

          <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
            <button onClick={() => setStep(0)} className="btn-ghost" style={{ padding:"11px 22px", fontSize:14 }}>← Back</button>
            <button onClick={goToAI} className="btn-primary" style={{ padding:"11px 28px", fontSize:14 }}>Next: AI Metadata →</button>
          </div>
        </div>
      )}

      {/* ── Step 2: AI Metadata ── */}
      {step === 2 && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Thumbnail picker */}
          <div className="card" style={{ padding:24 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#E0E0F0", marginBottom:14 }}>Thumbnail</div>
            {frames.length === 0 ? (
              <div style={{ color:"#7878A8", fontSize:13 }}>Extracting frames…</div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8 }}>
                {frames.map((f, i) => (
                  <div key={i} onClick={() => setThumbIdx(i)} style={{ cursor:"pointer", borderRadius:8, overflow:"hidden", border:`2px solid ${thumbIdx===i?"#7C5CFC":"transparent"}`, transition:"border-color .15s", position:"relative" }}>
                    <img src={f} alt={`Frame ${i+1}`} style={{ width:"100%", display:"block" }}/>
                    {thumbIdx===i && <div style={{ position:"absolute", inset:0, background:"#7C5CFC22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>✓</div>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize:12, color:"#7878A8", marginTop:10 }}>Click a frame to use as thumbnail · AI will enhance it</div>
          </div>

          {/* AI metadata */}
          <div className="card" style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#E0E0F0" }}>Title, Description & Hashtags</div>
              <button onClick={generateAI} disabled={aiLoading} className="btn-primary" style={{ padding:"8px 18px", fontSize:13 }}>
                {aiLoading ? "Generating…" : "✦ Generate with AI"}
              </button>
            </div>
            <div>
              <label style={{ fontSize:12, color:"#8888B8", display:"block", marginBottom:6 }}>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter title or generate with AI" className="inp" />
            </div>
            <div>
              <label style={{ fontSize:12, color:"#8888B8", display:"block", marginBottom:6 }}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Video description…" className="inp" style={{ minHeight:100, resize:"vertical" }} />
            </div>
            <div>
              <label style={{ fontSize:12, color:"#8888B8", display:"block", marginBottom:6 }}>Hashtags</label>
              <input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#content #creator #viral" className="inp" />
            </div>
          </div>

          <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
            <button onClick={() => setStep(1)} className="btn-ghost" style={{ padding:"11px 22px", fontSize:14 }}>← Back</button>
            <button onClick={() => setStep(3)} className="btn-primary" style={{ padding:"11px 28px", fontSize:14 }}>Next: Schedule →</button>
          </div>
        </div>
      )}

      {/* ── Step 3: Schedule ── */}
      {step === 3 && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          <div className="card" style={{ padding:24 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#E0E0F0", marginBottom:16 }}>Select Platforms</div>
            {connections.length === 0 ? (
              <div style={{ color:"#7878A8", fontSize:14 }}>No platforms connected. <span style={{ color:"#7C5CFC", cursor:"pointer" }} onClick={() => window.location.hash="platforms"}>Connect a platform →</span></div>
            ) : (
              <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                {connections.map(c => {
                  const sel = selPlatforms.includes(c.platform);
                  const colors = { youtube:"#FF0000", youtube_shorts:"#FF4444", tiktok:"#69C9D0", instagram:"#E1306C" };
                  const col = colors[c.platform] || "#7C5CFC";
                  return (
                    <div key={c.id || c.platform} onClick={() => togglePlatform(c.platform)} style={{ padding:"10px 18px", borderRadius:12, cursor:"pointer", border:`2px solid ${sel ? col : "#2A2A50"}`, background: sel ? `${col}18` : "#0C0C1A", color: sel ? col : "#9090B8", fontSize:14, fontWeight:600, transition:"all .15s", display:"flex", alignItems:"center", gap:8 }}>
                      <span>{sel ? "✓" : "○"}</span>
                      <span>{c.handle}</span>
                      <span style={{ fontSize:12, opacity:.7, textTransform:"capitalize" }}>({c.platform.replace("_", " ")})</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card" style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#E0E0F0" }}>When to Post</div>
            <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:14, color:"#C0C0D8" }}>
              <input type="checkbox" checked={postNow} onChange={e => setPostNow(e.target.checked)} style={{ width:16, height:16, accentColor:"#7C5CFC" }}/>
              Post immediately
            </label>
            {!postNow && (
              <div>
                <label style={{ fontSize:12, color:"#8888B8", display:"block", marginBottom:6 }}>Schedule date & time</label>
                <input type="datetime-local" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="inp" />
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="card" style={{ padding:20, background:"#080810", display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{ fontSize:12, color:"#7878A8", textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>Summary</div>
            <div style={{ fontSize:14, color:"#C0C0D8" }}>📹 <strong>{videoFile?.name || "Video"}</strong></div>
            {title && <div style={{ fontSize:14, color:"#C0C0D8" }}>📝 {title}</div>}
            <div style={{ fontSize:14, color:"#C0C0D8" }}>📤 {selPlatforms.length ? selPlatforms.join(", ") : "No platforms selected"}</div>
            <div style={{ fontSize:14, color:"#C0C0D8" }}>🕐 {postNow ? "Post immediately" : scheduleTime ? new Date(scheduleTime).toLocaleString() : "Not set"}</div>
            {makeShort && <div style={{ fontSize:14, color:"#C0C0D8" }}>✂ Short/Reel version will be created</div>}
          </div>

          <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
            <button onClick={() => setStep(2)} className="btn-ghost" style={{ padding:"11px 22px", fontSize:14 }}>← Back</button>
            <button onClick={submit} disabled={submitting || !selPlatforms.length} className="btn-primary" style={{ padding:"11px 32px", fontSize:14 }}>
              {submitting ? "Scheduling…" : postNow ? "🚀 Post Now" : "📅 Schedule Post"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
