import { useState, useRef, useEffect, useCallback } from "react";
import { streamAI, platforms as platformsApi } from "../services/api";
import { useUpload } from "../context/UploadContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const STEPS = ["Upload", "Edit & Clip", "AI Metadata", "Schedule"];

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
      videoEl.onseeked = () => {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg", 0.8));
        res();
      };
    });
  }
  return frames;
}

// Upload a file directly to a YouTube resumable upload URL with XHR progress
function uploadToYouTube(file, uploadUrl, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { resolve({}); }
      } else {
        reject(new Error(`YouTube upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during YouTube upload"));
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
    xhr.send(file);
  });
}

export default function PostContent() {
  const { upload, selectFile, draft, patchDraft } = useUpload();

  const videoFile    = upload?.file    || null;
  const videoPreview = upload?.preview || null;

  const { step, clipStart, clipEnd, makeShort, frames, thumbIdx,
          title, description, hashtags, scheduleTime, postNow } = draft;

  const set = (key) => (val) => patchDraft({ [key]: val });

  // Platform selection helpers
  const PLAT_COLORS = {
    youtube:        "#40A0C0",
    youtube_shorts: "#50B8A0",
    tiktok:         "#40C4C0",
    instagram:      "#C060A0",
  };
  const PLAT_LABELS = {
    youtube:        "YouTube",
    youtube_shorts: "YouTube Shorts",
    tiktok:         "TikTok",
    instagram:      "Instagram Reels",
  };

  const [connList,        setConnList]        = useState([]);
  const [videoMeta,       setVideoMeta]       = useState(null); // { duration, width, height }
  const [selConnIds,      setSelConnIds]      = useState([]);   // selected by connection ID (fixes multi-same-platform bug)

  // Derived from video metadata
  const isShortForm = videoMeta
    ? (videoMeta.duration <= 90 || videoMeta.height > videoMeta.width)
    : null; // null = not yet detected

  const longFormConns  = connList.filter(c => c.platform === "youtube");
  const shortFormConns = connList.filter(c => ["youtube_shorts","tiktok","instagram"].includes(c.platform));
  // Platforms derived from selected connection IDs (for submit)
  const derivedPlatforms = connList.filter(c => selConnIds.includes(c.id)).map(c => c.platform);

  const toggleConn = (id) => setSelConnIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const onLoadedMetadata = (e) => {
    const v = e.target;
    setVideoMeta({ duration: v.duration, width: v.videoWidth, height: v.videoHeight });
    // Reset platform selection when a new video is loaded
    setSelConnIds([]);
  };
  const [aiLoading,       setAiLoading]       = useState(false);
  const [aiStream,        setAiStream]        = useState("");
  const [submitting,      setSubmitting]      = useState(false);
  const [uploadProgress,  setUploadProgress]  = useState(0);
  const [uploadPhase,     setUploadPhase]     = useState(""); // "initiating" | "uploading" | "saving"
  const [done,            setDone]            = useState(false);
  const [error,           setError]           = useState("");

  // Auto-clip state
  const [autoClipOpen,    setAutoClipOpen]    = useState(false);
  const [autoClipPlats,   setAutoClipPlats]   = useState([]);
  const [autoClipStart,   setAutoClipStart]   = useState("");
  const [autoClipLoading, setAutoClipLoading] = useState(false);
  const [autoClipResults, setAutoClipResults] = useState([]);
  const [autoClipErr,     setAutoClipErr]     = useState("");

  const videoRef = useRef(null);
  const dropRef  = useRef(null);

  useEffect(() => {
    platformsApi.list()
      .then(({ connections: list }) => setConnList(list.filter(c => c.connected)))
      .catch(() => {});
  }, []);

  const handleDrop = useCallback((file) => {
    if (!selectFile(file)) { setError("Please upload a video file"); return; }
    setError("");
  }, [selectFile]);

  const onFileChange = e => { if (e.target.files[0]) handleDrop(e.target.files[0]); };
  const onDragOver  = e => { e.preventDefault(); if (dropRef.current) dropRef.current.style.borderColor = "#40A0C0"; };
  const onDragLeave = ()  => { if (dropRef.current) dropRef.current.style.borderColor = "#333"; };
  const onDropEvent = e => { e.preventDefault(); onDragLeave(); handleDrop(e.dataTransfer.files[0]); };

  const goToAI = async () => {
    set("step")(2);
    if (frames.length === 0 && videoRef.current) {
      try { set("frames")(await extractFrames(videoRef.current, 6)); } catch {}
    }
  };

  const generateAI = async () => {
    setAiLoading(true);
    setAiStream("");
    setError("");
    let out = "";
    try {
      await streamAI({
        feature: "video_metadata",
        context: { filename: videoFile?.name || "video", platform: derivedPlatforms[0] || "youtube" },
        onToken: t => {
          out += t;
          setAiStream(out);
        },
        onDone: () => {
          const titleMatch = out.match(/TITLE:\s*(.+)/);
          const descMatch  = out.match(/DESCRIPTION:\s*([\s\S]+?)(?=\nHASHTAGS:|$)/);
          const hashMatch  = out.match(/HASHTAGS:\s*([\s\S]+)/);
          if (titleMatch) set("title")(titleMatch[1].trim());
          if (descMatch)  set("description")(descMatch[1].trim());
          if (hashMatch)  set("hashtags")(hashMatch[1].trim());
          setAiLoading(false);
          setAiStream("");
        },
        onError: (msg) => {
          setError(msg || "AI generation failed");
          setAiLoading(false);
          setAiStream("");
        },
      });
    } catch (e) {
      setError(e.message || "AI generation failed — check your connection");
      setAiLoading(false);
      setAiStream("");
    }
  };

  const handleAutoClip = async () => {
    if (!videoFile) { setAutoClipErr("Upload a video first."); return; }
    if (!autoClipPlats.length) { setAutoClipErr("Select at least one short-form platform."); return; }
    setAutoClipLoading(true);
    setAutoClipErr("");
    setAutoClipResults([]);
    const token = localStorage.getItem("token");
    const fd = new FormData();
    fd.append("video", videoFile);
    fd.append("title", title || videoFile.name);
    autoClipPlats.forEach(p => fd.append("platforms", p));
    if (autoClipStart) fd.append("start_time", new Date(autoClipStart).toISOString());
    try {
      const res  = await fetch(`${API}/api/clips/batch-schedule`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Auto-clip failed");
      setAutoClipResults(data.clips || []);
    } catch (e) {
      setAutoClipErr(e.message);
    }
    setAutoClipLoading(false);
  };

  const submit = async () => {
    if (!selConnIds.length) { setError("Select at least one platform"); return; }
    if (!postNow && !scheduleTime) { setError("Set a schedule time"); return; }
    if (!videoFile) { setError("No video selected"); return; }
    setError(""); setSubmitting(true);
    const token = localStorage.getItem("token");
    const hashTagArr = hashtags.split(/\s+/).filter(h => h.startsWith("#")).map(h => h.slice(1));

    try {
      let youtubeVideoId = null;
      const youtubeSelected = derivedPlatforms.some(p => p === "youtube" || p === "youtube_shorts");

      if (youtubeSelected) {
        // Step 1: Initiate YouTube resumable upload session
        setUploadPhase("initiating");
        const initRes = await fetch(`${API}/api/schedule/youtube-initiate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title:       title || videoFile.name,
            description: description || "",
            tags:        hashTagArr,
            file_size:   videoFile.size,
            mime_type:   videoFile.type || "video/mp4",
          }),
        });
        if (!initRes.ok) {
          const e = await initRes.json();
          throw new Error(e.error || "Failed to start YouTube upload");
        }
        const { upload_url } = await initRes.json();

        // Step 2: Upload file directly from browser to YouTube (no server involved)
        setUploadPhase("uploading");
        setUploadProgress(0);
        const ytData = await uploadToYouTube(videoFile, upload_url, setUploadProgress);
        youtubeVideoId = ytData.id;
        if (!youtubeVideoId) throw new Error("YouTube did not return a video ID");
      }

      // Step 3: Save scheduled post in our DB
      setUploadPhase("saving");
      const body = {
        title:         title || videoFile.name,
        description:   description || "",
        hashtags:      hashTagArr,
        platforms:     derivedPlatforms,
        scheduled_for: postNow ? new Date().toISOString() : new Date(scheduleTime).toISOString(),
        video_url:     youtubeVideoId ? `https://youtube.com/watch?v=${youtubeVideoId}` : null,
        youtube_video_id: youtubeVideoId,
        is_short:      makeShort,
      };

      const res = await fetch(`${API}/api/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setDone(true);
    } catch (e) {
      setError(e.message);
    }
    setSubmitting(false);
    setUploadPhase("");
    setUploadProgress(0);
  };

  // ── Done screen ──────────────────────────────────────────────
  if (done) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:400, gap:20, textAlign:"center" }}>
      <div style={{ fontSize:56 }}>🎉</div>
      <h2 style={{ fontSize:26, fontWeight:800, color:"#fff" }}>{postNow ? "Posted to YouTube!" : "Scheduled successfully!"}</h2>
      <p style={{ color:"#888", fontSize:15 }}>
        {postNow
          ? `Your video is now on YouTube (${derivedPlatforms.join(", ")})`
          : `Scheduled for ${new Date(scheduleTime).toLocaleString()} on ${derivedPlatforms.join(", ")}`}
      </p>
      <button onClick={() => setDone(false)} className="btn-primary" style={{ padding:"12px 32px", fontSize:14 }}>
        Post Another →
      </button>
    </div>
  );

  // ── Upload progress overlay ──────────────────────────────────
  if (submitting) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:400, gap:20, textAlign:"center" }}>
      <div style={{ fontSize:48 }}>{uploadPhase === "saving" ? "💾" : "📤"}</div>
      <h2 style={{ fontSize:22, fontWeight:800, color:"#fff" }}>
        {uploadPhase === "initiating" ? "Connecting to YouTube…" :
         uploadPhase === "uploading"  ? `Uploading to YouTube — ${uploadProgress}%` :
         uploadPhase === "saving"     ? "Saving schedule…" : "Working…"}
      </h2>
      <p style={{ color:"#888", fontSize:14 }}>
        {uploadPhase === "uploading"
          ? "Your video is going directly to YouTube — you can leave this page"
          : uploadPhase === "initiating"
          ? "Starting secure upload session with YouTube"
          : "Almost done!"}
      </p>
      {uploadPhase === "uploading" && (
        <div style={{ width:400, maxWidth:"90vw" }}>
          <div style={{ height:8, background:"#1A1A3A", borderRadius:4, overflow:"hidden", marginBottom:8 }}>
            <div style={{ width:`${uploadProgress}%`, height:"100%", background:"linear-gradient(90deg,#40A0C0,#60C8E0)", borderRadius:4, transition:"width .3s" }} />
          </div>
          <div style={{ fontSize:13, color:"#777" }}>{videoFile?.name} · {(videoFile?.size / 1024 / 1024).toFixed(0)} MB</div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24, maxWidth:860, margin:"0 auto" }}>

      <div>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#fff", letterSpacing:"-.04em", fontFamily:"'DM Mono',monospace" }}><span style={{ color:"#40A0C0", fontWeight:400 }}>/</span> Post_Content</h1>
        <p style={{ color:"#888", fontSize:15, marginTop:5 }}>Upload goes directly to YouTube — no double transfer, no file size limits</p>
      </div>

      {/* Step indicator */}
      <div style={{ display:"flex", alignItems:"center" }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display:"flex", alignItems:"center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, cursor: i < step ? "pointer" : "default" }} onClick={() => i < step && set("step")(i)}>
              <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700,
                background: i < step ? "#22C55E" : i === step ? "linear-gradient(135deg,#40A0C0,#60C8E0)" : "#1a1a1a",
                color: i <= step ? "#fff" : "#555", flexShrink:0 }}>
                {i < step ? "✓" : i + 1}
              </div>
              <span style={{ fontSize:13, fontWeight: i === step ? 700 : 400, color: i === step ? "#e0e0e0" : i < step ? "#22C55E" : "#555", whiteSpace:"nowrap" }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex:1, height:1, background: i < step ? "#22C55E44" : "#1a1a1a", margin:"0 10px" }}/>}
          </div>
        ))}
      </div>

      {error && <div style={{ padding:"12px 16px", background:"#EF444410", border:"1px solid #EF444422", borderRadius:10, color:"#EF4444", fontSize:13 }}>{error}</div>}

      {/* ── Step 0: Upload ── */}
      {step === 0 && (
        <div className="card" style={{ padding:32 }}>
          <input type="file" accept="video/*" id="vidInput" style={{ display:"none" }} onChange={onFileChange} />

          {!videoFile ? (
            <div
              data-tutorial="postcontent-drop"
              ref={dropRef}
              onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDropEvent}
              onClick={() => document.getElementById("vidInput").click()}
              style={{ border:"2px dashed #2a2a2a", borderRadius:16, padding:"60px 40px", textAlign:"center", cursor:"pointer", transition:"border-color .15s" }}
            >
              <div style={{ fontSize:48, marginBottom:16 }}>🎬</div>
              <div style={{ fontSize:18, fontWeight:700, color:"#e0e0e0", marginBottom:8 }}>Drop your video here</div>
              <div style={{ fontSize:14, color:"#777", marginBottom:4 }}>or click to browse · MP4, MOV, AVI</div>
              <div style={{ fontSize:12, color:"#555", marginBottom:20 }}>No file size limit — uploads go directly to YouTube</div>
              <button className="btn-primary" style={{ padding:"11px 28px", fontSize:14 }} onClick={e => { e.stopPropagation(); document.getElementById("vidInput").click(); }}>
                Choose Video
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <video src={videoPreview} controls ref={videoRef} onLoadedMetadata={onLoadedMetadata} style={{ width:"100%", borderRadius:12, maxHeight:400, background:"#000" }} />
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ flex:1, fontSize:14, color:"#bbb", fontWeight:600 }}>
                  ✓ {videoFile.name} · {(videoFile.size / 1024 / 1024).toFixed(0)} MB
                </div>
                <button onClick={() => document.getElementById("vidInput").click()} className="btn-ghost" style={{ padding:"8px 16px", fontSize:13 }}>Change</button>
              </div>
              <div style={{ display:"flex", gap:12, justifyContent:"flex-end", marginTop:8 }}>
                <button onClick={goToAI} className="btn-ghost" style={{ padding:"11px 22px", fontSize:14 }}>Skip Editing →</button>
                <button data-tutorial="postcontent-edit-btn" onClick={() => set("step")(1)} className="btn-primary" style={{ padding:"11px 28px", fontSize:14 }}>Edit & Clip →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 1: Edit & Clip ── */}
      {step === 1 && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="card" style={{ padding:24 }}>
            <video src={videoPreview} controls ref={videoRef} onLoadedMetadata={onLoadedMetadata} style={{ width:"100%", borderRadius:12, maxHeight:380, background:"#000" }} />
          </div>
          <div className="card" style={{ padding:24, display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#e0e0e0" }}>Clip Range <span style={{ fontSize:12, color:"#777", fontWeight:400 }}>(optional)</span></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div>
                <label style={{ fontSize:12, color:"#888", display:"block", marginBottom:6 }}>Start (seconds)</label>
                <input value={clipStart} onChange={e => set("clipStart")(e.target.value)} placeholder="e.g. 10" className="inp" type="number" min="0" />
              </div>
              <div>
                <label style={{ fontSize:12, color:"#888", display:"block", marginBottom:6 }}>End (seconds)</label>
                <input value={clipEnd} onChange={e => set("clipEnd")(e.target.value)} placeholder="e.g. 90" className="inp" type="number" min="0" />
              </div>
            </div>
            <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:14, color:"#d0d0d0" }}>
              <input type="checkbox" checked={makeShort} onChange={e => set("makeShort")(e.target.checked)} style={{ width:16, height:16, accentColor:"#40A0C0" }}/>
              Also create a vertical Short/Reel version (9:16)
            </label>
          </div>
          <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
            <button onClick={() => set("step")(0)} className="btn-ghost" style={{ padding:"11px 22px", fontSize:14 }}>← Back</button>
            <button onClick={goToAI} className="btn-primary" style={{ padding:"11px 28px", fontSize:14 }}>Next: AI Metadata →</button>
          </div>
        </div>
      )}

      {/* ── Step 2: AI Metadata ── */}
      {step === 2 && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="card" style={{ padding:24 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#e0e0e0" }}>Thumbnail</div>
              {frames.length > 0 && (
                <a
                  href={frames[thumbIdx]}
                  download={`thumbnail-${thumbIdx + 1}.jpg`}
                  style={{ fontSize:13, fontWeight:600, color:"#40A0C0", textDecoration:"none", padding:"6px 14px", border:"1px solid #40A0C044", borderRadius:8, display:"flex", alignItems:"center", gap:6, transition:"all .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background="#40A0C018"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="transparent"; }}
                >
                  ↓ Download frame
                </a>
              )}
            </div>
            {frames.length === 0 ? (
              <div style={{ color:"#777", fontSize:13 }}>Extracting frames…</div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8 }}>
                {frames.map((f, i) => (
                  <div key={i} onClick={() => set("thumbIdx")(i)} style={{ cursor:"pointer", borderRadius:8, overflow:"hidden", border:`2px solid ${thumbIdx===i?"#40A0C0":"transparent"}`, transition:"border-color .15s", position:"relative" }}>
                    <img src={f} alt={`Frame ${i+1}`} style={{ width:"100%", display:"block" }}/>
                    {thumbIdx===i && <div style={{ position:"absolute", inset:0, background:"#40A0C022", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>✓</div>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize:12, color:"#777", marginTop:10 }}>Click a frame to select · Download to use as your YouTube thumbnail</div>
          </div>

          <div className="card" style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#e0e0e0" }}>Title, Description & Hashtags</div>
              <button data-tutorial="postcontent-ai-btn" onClick={generateAI} disabled={aiLoading} className="btn-primary" style={{ padding:"8px 18px", fontSize:13 }}>
                {aiLoading ? "Generating…" : "✦ Generate with AI"}
              </button>
            </div>
            {aiLoading && (
              <div style={{ background:"#0A0A22", border:"1px solid #1E1E42", borderRadius:10, padding:"14px 16px" }}>
                <div style={{ fontSize:12, color:"#40A0C0", fontWeight:600, marginBottom:8, display:"flex", alignItems:"center", gap:7 }}>
                  <span style={{ display:"inline-block", animation:"spin 1s linear infinite" }}>◌</span>
                  AI is generating your metadata…
                </div>
                {aiStream ? (
                  <pre style={{ fontSize:12, color:"#d0d0d0", fontFamily:"'DM Mono',monospace", whiteSpace:"pre-wrap", lineHeight:1.7, margin:0, maxHeight:180, overflowY:"auto" }}>
                    {aiStream}<span style={{ animation:"shimmer .7s ease infinite", color:"#40A0C0" }}>▌</span>
                  </pre>
                ) : (
                  <div style={{ fontSize:12, color:"#666" }}>Connecting to AI…</div>
                )}
              </div>
            )}
            <div>
              <label style={{ fontSize:12, color:"#888", display:"block", marginBottom:6 }}>Title</label>
              <input value={title} onChange={e => set("title")(e.target.value)} placeholder="Enter title or generate with AI" className="inp" />
            </div>
            <div>
              <label style={{ fontSize:12, color:"#888", display:"block", marginBottom:6 }}>Description</label>
              <textarea value={description} onChange={e => set("description")(e.target.value)} placeholder="Video description…" className="inp" style={{ minHeight:100, resize:"vertical" }} />
            </div>
            <div>
              <label style={{ fontSize:12, color:"#888", display:"block", marginBottom:6 }}>Hashtags</label>
              <input value={hashtags} onChange={e => set("hashtags")(e.target.value)} placeholder="#content #creator #viral" className="inp" />
            </div>
          </div>

          <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
            <button onClick={() => set("step")(1)} className="btn-ghost" style={{ padding:"11px 22px", fontSize:14 }}>← Back</button>
            <button onClick={() => set("step")(3)} className="btn-primary" style={{ padding:"11px 28px", fontSize:14 }}>Next: Schedule →</button>
          </div>
        </div>
      )}

      {/* ── Step 3: Schedule ── */}
      {step === 3 && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* ── Auto-clip: only shown for long-form video ── */}
          {isShortForm === false && (
            <div data-tutorial="postcontent-autoclip" className="card" style={{ padding:24, border:"1px solid rgba(64,160,192,0.2)" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: autoClipOpen ? 18 : 0 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:"#e0e0e0" }}>✂ Generate & Schedule Clips</div>
                  {!autoClipOpen && <div style={{ fontSize:13, color:"#777", marginTop:4 }}>AI finds best moments → trims to 9:16 → schedules on Shorts, TikTok & Reels</div>}
                </div>
                <button onClick={() => setAutoClipOpen(o => !o)} className="btn-ghost" style={{ padding:"8px 18px", fontSize:13, flexShrink:0 }}>
                  {autoClipOpen ? "Collapse ↑" : "Enable →"}
                </button>
              </div>
              {autoClipOpen && (
                <>
                  <div style={{ fontSize:13, color:"#888", marginBottom:16, lineHeight:1.65 }}>
                    Autopilot detects 4–6 viral moments, trims each to vertical 9:16, adds a title caption, and schedules them 6 hours apart across your chosen platforms.
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:12, color:"#666", marginBottom:8, textTransform:"uppercase", letterSpacing:".1em" }}>Short-form platforms</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                      {shortFormConns.map(c => {
                        const col = PLAT_COLORS[c.platform] || "#40A0C0";
                        const sel = autoClipPlats.includes(c.platform);
                        return (
                          <div key={c.id} onClick={() => setAutoClipPlats(sel ? autoClipPlats.filter(x => x !== c.platform) : [...autoClipPlats, c.platform])}
                            style={{ padding:"8px 16px", borderRadius:10, cursor:"pointer", border:`2px solid ${sel ? col : "#222"}`, background: sel ? `${col}18` : "#111", color: sel ? col : "#777", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
                            {sel ? "✓" : "○"} {PLAT_LABELS[c.platform]} · {c.handle}
                          </div>
                        );
                      })}
                      {shortFormConns.length === 0 && <div style={{ fontSize:13, color:"#777" }}>No short-form platforms connected. Go to <strong>Platforms</strong> to connect TikTok or Instagram.</div>}
                    </div>
                  </div>
                  <div style={{ marginBottom:16 }}>
                    <label style={{ fontSize:12, color:"#777", display:"block", marginBottom:6 }}>First clip posts at</label>
                    <input type="datetime-local" value={autoClipStart} onChange={e => setAutoClipStart(e.target.value)} className="inp" style={{ maxWidth:300 }} />
                    <div style={{ fontSize:12, color:"#555", marginTop:4 }}>Each subsequent clip is scheduled 6 hours later</div>
                  </div>
                  {autoClipErr && <div style={{ padding:"10px 14px", background:"#EF444410", border:"1px solid #EF444422", borderRadius:8, color:"#EF4444", fontSize:13, marginBottom:14 }}>{autoClipErr}</div>}
                  {autoClipResults.length > 0 && (
                    <div style={{ background:"#0e0e0e", borderRadius:10, padding:16, marginBottom:14 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#22C55E", marginBottom:10 }}>✓ {autoClipResults.length} clips scheduled!</div>
                      {autoClipResults.map((c, i) => (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderTop: i ? "1px solid #1a1a1a" : "none" }}>
                          <div style={{ width:24, height:24, borderRadius:6, background:"rgba(64,160,192,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#40A0C0", flexShrink:0 }}>{i+1}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, color:"#e0e0e0", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</div>
                            <div style={{ fontSize:11, color:"#777" }}>{c.duration}s · {c.platforms?.join(", ")} · {c.scheduled_for ? new Date(c.scheduled_for).toLocaleString() : ""}</div>
                          </div>
                          {c.clip_url && <a href={`${API}${c.clip_url}`} download style={{ fontSize:12, color:"#40A0C0", textDecoration:"none" }}>↓</a>}
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={handleAutoClip} disabled={autoClipLoading || !videoFile || !autoClipPlats.length} className="btn-primary" style={{ padding:"11px 24px", fontSize:14, width:"100%", opacity: (!videoFile || !autoClipPlats.length) && !autoClipLoading ? .5 : 1 }}>
                    {autoClipLoading ? "⏳ Processing clips… this may take a few minutes" : "✂ Generate & Schedule Clips"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Platform Selector ── */}
          <div className="card" style={{ padding:24 }}>
            {isShortForm === null && (
              <div style={{ color:"#777", fontSize:14, textAlign:"center", padding:"12px 0" }}>
                Upload a video — platform options will appear automatically based on the video format.
              </div>
            )}
            {isShortForm === true && (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:"#e0e0e0" }}>Short-form Platforms</div>
                  <span style={{ fontSize:11, background:"rgba(64,160,192,0.15)", color:"#40A0C0", padding:"2px 10px", borderRadius:20, fontWeight:700 }}>● READY</span>
                </div>
                <div style={{ fontSize:13, color:"#777", marginBottom:16 }}>
                  This video is already in short-form format (≤90s or vertical). Select where to post it directly.
                </div>
                {shortFormConns.length === 0 ? (
                  <div style={{ color:"#777", fontSize:14 }}>No short-form platforms connected. Go to <strong>Platforms</strong> to connect TikTok or Instagram.</div>
                ) : (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                    {shortFormConns.map(c => {
                      const col = PLAT_COLORS[c.platform] || "#40A0C0";
                      const sel = selConnIds.includes(c.id);
                      return (
                        <div key={c.id} onClick={() => toggleConn(c.id)} style={{ padding:"10px 18px", borderRadius:12, cursor:"pointer", border:`2px solid ${sel ? col : "#222"}`, background: sel ? `${col}18` : "#111", color: sel ? col : "#777", fontSize:14, fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
                          <span>{sel ? "✓" : "○"}</span>
                          <span>{PLAT_LABELS[c.platform]}</span>
                          <span style={{ fontSize:12, opacity:.6 }}>{c.handle}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
            {isShortForm === false && (
              <>
                <div style={{ fontSize:15, fontWeight:700, color:"#e0e0e0", marginBottom:8 }}>YouTube Upload</div>
                <div style={{ fontSize:13, color:"#777", marginBottom:16 }}>
                  Long-form video uploads directly to YouTube. Use <strong style={{ color:"#40A0C0" }}>Generate & Schedule Clips</strong> above to also post on TikTok, Reels, and Shorts.
                </div>
                {longFormConns.length === 0 ? (
                  <div style={{ color:"#777", fontSize:14 }}>No YouTube account connected. Go to <strong>Platforms</strong> to connect one.</div>
                ) : (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                    {longFormConns.map(c => {
                      const col = PLAT_COLORS.youtube;
                      const sel = selConnIds.includes(c.id);
                      return (
                        <div key={c.id} onClick={() => toggleConn(c.id)} style={{ padding:"10px 18px", borderRadius:12, cursor:"pointer", border:`2px solid ${sel ? col : "#222"}`, background: sel ? `${col}18` : "#111", color: sel ? col : "#777", fontSize:14, fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
                          <span>{sel ? "✓" : "○"}</span>
                          <span>YouTube</span>
                          <span style={{ fontSize:12, opacity:.6 }}>{c.handle}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="card" style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#e0e0e0" }}>When to Post</div>
            <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:14, color:"#d0d0d0" }}>
              <input type="checkbox" checked={postNow} onChange={e => set("postNow")(e.target.checked)} style={{ width:16, height:16, accentColor:"#40A0C0" }}/>
              Post immediately
            </label>
            {!postNow && (
              <div>
                <label style={{ fontSize:12, color:"#888", display:"block", marginBottom:6 }}>Schedule date & time</label>
                <input type="datetime-local" value={scheduleTime} onChange={e => set("scheduleTime")(e.target.value)} className="inp" />
              </div>
            )}
          </div>

          <div className="card" style={{ padding:20, background:"#080810", display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{ fontSize:12, color:"#777", textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>Summary</div>
            <div style={{ fontSize:14, color:"#d0d0d0" }}>📹 <strong>{videoFile?.name}</strong> · {videoFile ? `${(videoFile.size/1024/1024).toFixed(0)} MB` : ""}</div>
            {title && <div style={{ fontSize:14, color:"#d0d0d0" }}>📝 {title}</div>}
            <div style={{ fontSize:14, color:"#d0d0d0" }}>📤 {derivedPlatforms.length ? derivedPlatforms.join(", ") : "No platforms selected"}</div>
            <div style={{ fontSize:14, color:"#d0d0d0" }}>🕐 {postNow ? "Post immediately" : scheduleTime ? new Date(scheduleTime).toLocaleString() : "Not set"}</div>
            {makeShort && <div style={{ fontSize:14, color:"#d0d0d0" }}>✂ Short/Reel version will be created</div>}
          </div>

          <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
            <button onClick={() => set("step")(2)} className="btn-ghost" style={{ padding:"11px 22px", fontSize:14 }}>← Back</button>
            <button onClick={submit} disabled={submitting || !selConnIds.length} className="btn-primary" style={{ padding:"11px 32px", fontSize:14 }}>
              {postNow ? "🚀 Upload & Post Now" : "📅 Upload & Schedule"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
