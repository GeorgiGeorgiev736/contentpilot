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
          title, description, hashtags, selPlatforms, scheduleTime, postNow } = draft;

  const set = (key) => (val) => patchDraft({ [key]: val });

  const [connList,        setConnList]        = useState([]);
  const [aiLoading,       setAiLoading]       = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [uploadProgress,  setUploadProgress]  = useState(0);
  const [uploadPhase,     setUploadPhase]     = useState(""); // "initiating" | "uploading" | "saving"
  const [done,            setDone]            = useState(false);
  const [error,           setError]           = useState("");

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
  const onDragOver  = e => { e.preventDefault(); if (dropRef.current) dropRef.current.style.borderColor = "#7C5CFC"; };
  const onDragLeave = ()  => { if (dropRef.current) dropRef.current.style.borderColor = "#2A2A50"; };
  const onDropEvent = e => { e.preventDefault(); onDragLeave(); handleDrop(e.dataTransfer.files[0]); };

  const goToAI = async () => {
    set("step")(2);
    if (frames.length === 0 && videoRef.current) {
      try { set("frames")(await extractFrames(videoRef.current, 6)); } catch {}
    }
  };

  const generateAI = async () => {
    setAiLoading(true);
    setError("");
    let out = "";
    await streamAI({
      feature: "video_metadata",
      context: { filename: videoFile?.name || "video", platform: selPlatforms[0] || "youtube" },
      onToken: t => { out += t; },
      onDone: () => {
        const titleMatch = out.match(/TITLE:\s*(.+)/);
        const descMatch  = out.match(/DESCRIPTION:\s*([\s\S]+?)(?=\nHASHTAGS:|$)/);
        const hashMatch  = out.match(/HASHTAGS:\s*([\s\S]+)/);
        if (titleMatch) set("title")(titleMatch[1].trim());
        if (descMatch)  set("description")(descMatch[1].trim());
        if (hashMatch)  set("hashtags")(hashMatch[1].trim());
        setAiLoading(false);
      },
      onError: (msg) => { setError(msg || "AI generation failed — check credits"); setAiLoading(false); },
    });
  };

  const togglePlatform = (id) => set("selPlatforms")(
    selPlatforms.includes(id) ? selPlatforms.filter(x => x !== id) : [...selPlatforms, id]
  );

  const submit = async () => {
    if (!selPlatforms.length) { setError("Select at least one platform"); return; }
    if (!postNow && !scheduleTime) { setError("Set a schedule time"); return; }
    if (!videoFile) { setError("No video selected"); return; }
    setError(""); setSubmitting(true);
    const token = localStorage.getItem("token");
    const hashTagArr = hashtags.split(/\s+/).filter(h => h.startsWith("#")).map(h => h.slice(1));

    try {
      let youtubeVideoId = null;
      const youtubeSelected = selPlatforms.some(p => p === "youtube" || p === "youtube_shorts");

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
        platforms:     selPlatforms,
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
      <h2 style={{ fontSize:26, fontWeight:800, color:"#F5F5FF" }}>{postNow ? "Posted to YouTube!" : "Scheduled successfully!"}</h2>
      <p style={{ color:"#9090B8", fontSize:15 }}>
        {postNow
          ? `Your video is now on YouTube (${selPlatforms.join(", ")})`
          : `Scheduled for ${new Date(scheduleTime).toLocaleString()} on ${selPlatforms.join(", ")}`}
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
      <h2 style={{ fontSize:22, fontWeight:800, color:"#F5F5FF" }}>
        {uploadPhase === "initiating" ? "Connecting to YouTube…" :
         uploadPhase === "uploading"  ? `Uploading to YouTube — ${uploadProgress}%` :
         uploadPhase === "saving"     ? "Saving schedule…" : "Working…"}
      </h2>
      <p style={{ color:"#9090B8", fontSize:14 }}>
        {uploadPhase === "uploading"
          ? "Your video is going directly to YouTube — you can leave this page"
          : uploadPhase === "initiating"
          ? "Starting secure upload session with YouTube"
          : "Almost done!"}
      </p>
      {uploadPhase === "uploading" && (
        <div style={{ width:400, maxWidth:"90vw" }}>
          <div style={{ height:8, background:"#1A1A3A", borderRadius:4, overflow:"hidden", marginBottom:8 }}>
            <div style={{ width:`${uploadProgress}%`, height:"100%", background:"linear-gradient(90deg,#7C5CFC,#B45AFD)", borderRadius:4, transition:"width .3s" }} />
          </div>
          <div style={{ fontSize:13, color:"#7878A8" }}>{videoFile?.name} · {(videoFile?.size / 1024 / 1024).toFixed(0)} MB</div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24, maxWidth:860, margin:"0 auto" }}>

      <div>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em" }}>Post Content</h1>
        <p style={{ color:"#9090B8", fontSize:15, marginTop:5 }}>Upload goes directly to YouTube — no double transfer, no file size limits</p>
      </div>

      {/* Step indicator */}
      <div style={{ display:"flex", alignItems:"center" }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display:"flex", alignItems:"center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, cursor: i < step ? "pointer" : "default" }} onClick={() => i < step && set("step")(i)}>
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

          {!videoFile ? (
            <div
              ref={dropRef}
              onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDropEvent}
              onClick={() => document.getElementById("vidInput").click()}
              style={{ border:"2px dashed #2A2A50", borderRadius:16, padding:"60px 40px", textAlign:"center", cursor:"pointer", transition:"border-color .15s" }}
            >
              <div style={{ fontSize:48, marginBottom:16 }}>🎬</div>
              <div style={{ fontSize:18, fontWeight:700, color:"#E0E0F0", marginBottom:8 }}>Drop your video here</div>
              <div style={{ fontSize:14, color:"#7878A8", marginBottom:4 }}>or click to browse · MP4, MOV, AVI</div>
              <div style={{ fontSize:12, color:"#5858A0", marginBottom:20 }}>No file size limit — uploads go directly to YouTube</div>
              <button className="btn-primary" style={{ padding:"11px 28px", fontSize:14 }} onClick={e => { e.stopPropagation(); document.getElementById("vidInput").click(); }}>
                Choose Video
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <video src={videoPreview} controls ref={videoRef} style={{ width:"100%", borderRadius:12, maxHeight:400, background:"#000" }} />
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ flex:1, fontSize:14, color:"#B0B0D0", fontWeight:600 }}>
                  ✓ {videoFile.name} · {(videoFile.size / 1024 / 1024).toFixed(0)} MB
                </div>
                <button onClick={() => document.getElementById("vidInput").click()} className="btn-ghost" style={{ padding:"8px 16px", fontSize:13 }}>Change</button>
              </div>
              <div style={{ display:"flex", gap:12, justifyContent:"flex-end", marginTop:8 }}>
                <button onClick={goToAI} className="btn-ghost" style={{ padding:"11px 22px", fontSize:14 }}>Skip Editing →</button>
                <button onClick={() => set("step")(1)} className="btn-primary" style={{ padding:"11px 28px", fontSize:14 }}>Edit & Clip →</button>
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
            <div style={{ fontSize:15, fontWeight:700, color:"#E0E0F0" }}>Clip Range <span style={{ fontSize:12, color:"#7878A8", fontWeight:400 }}>(optional)</span></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div>
                <label style={{ fontSize:12, color:"#8888B8", display:"block", marginBottom:6 }}>Start (seconds)</label>
                <input value={clipStart} onChange={e => set("clipStart")(e.target.value)} placeholder="e.g. 10" className="inp" type="number" min="0" />
              </div>
              <div>
                <label style={{ fontSize:12, color:"#8888B8", display:"block", marginBottom:6 }}>End (seconds)</label>
                <input value={clipEnd} onChange={e => set("clipEnd")(e.target.value)} placeholder="e.g. 90" className="inp" type="number" min="0" />
              </div>
            </div>
            <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:14, color:"#C0C0D8" }}>
              <input type="checkbox" checked={makeShort} onChange={e => set("makeShort")(e.target.checked)} style={{ width:16, height:16, accentColor:"#7C5CFC" }}/>
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
            <div style={{ fontSize:15, fontWeight:700, color:"#E0E0F0", marginBottom:14 }}>Thumbnail</div>
            {frames.length === 0 ? (
              <div style={{ color:"#7878A8", fontSize:13 }}>Extracting frames…</div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8 }}>
                {frames.map((f, i) => (
                  <div key={i} onClick={() => set("thumbIdx")(i)} style={{ cursor:"pointer", borderRadius:8, overflow:"hidden", border:`2px solid ${thumbIdx===i?"#7C5CFC":"transparent"}`, transition:"border-color .15s", position:"relative" }}>
                    <img src={f} alt={`Frame ${i+1}`} style={{ width:"100%", display:"block" }}/>
                    {thumbIdx===i && <div style={{ position:"absolute", inset:0, background:"#7C5CFC22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>✓</div>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize:12, color:"#7878A8", marginTop:10 }}>Click a frame to use as thumbnail</div>
          </div>

          <div className="card" style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#E0E0F0" }}>Title, Description & Hashtags</div>
              <button onClick={generateAI} disabled={aiLoading} className="btn-primary" style={{ padding:"8px 18px", fontSize:13 }}>
                {aiLoading ? "Generating…" : "✦ Generate with AI"}
              </button>
            </div>
            {aiLoading && (
              <div style={{ fontSize:13, color:"#9090B8", padding:"10px 14px", background:"#0A0A22", borderRadius:8, border:"1px solid #1E1E42" }}>
                ✦ Writing your title, description and hashtags…
              </div>
            )}
            <div>
              <label style={{ fontSize:12, color:"#8888B8", display:"block", marginBottom:6 }}>Title</label>
              <input value={title} onChange={e => set("title")(e.target.value)} placeholder="Enter title or generate with AI" className="inp" />
            </div>
            <div>
              <label style={{ fontSize:12, color:"#8888B8", display:"block", marginBottom:6 }}>Description</label>
              <textarea value={description} onChange={e => set("description")(e.target.value)} placeholder="Video description…" className="inp" style={{ minHeight:100, resize:"vertical" }} />
            </div>
            <div>
              <label style={{ fontSize:12, color:"#8888B8", display:"block", marginBottom:6 }}>Hashtags</label>
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
          <div className="card" style={{ padding:24 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#E0E0F0", marginBottom:16 }}>Select Platforms</div>
            {connList.length === 0 ? (
              <div style={{ color:"#7878A8", fontSize:14 }}>No platforms connected. Go to <strong>Platforms</strong> to connect one first.</div>
            ) : (
              <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                {connList.map(c => {
                  const sel = selPlatforms.includes(c.platform);
                  const colors = { youtube:"#FF0000", youtube_shorts:"#FF4444", tiktok:"#69C9D0", instagram:"#E1306C" };
                  const col = colors[c.platform] || "#7C5CFC";
                  return (
                    <div key={c.id || c.platform} onClick={() => togglePlatform(c.platform)} style={{ padding:"10px 18px", borderRadius:12, cursor:"pointer", border:`2px solid ${sel ? col : "#2A2A50"}`, background: sel ? `${col}18` : "#0C0C1A", color: sel ? col : "#9090B8", fontSize:14, fontWeight:600, transition:"all .15s", display:"flex", alignItems:"center", gap:8 }}>
                      <span>{sel ? "✓" : "○"}</span>
                      <span>{c.handle}</span>
                      <span style={{ fontSize:12, opacity:.7, textTransform:"capitalize" }}>({c.platform.replace("_"," ")})</span>
                    </div>
                  );
                })}
              </div>
            )}
            {selPlatforms.some(p => p !== "youtube" && p !== "youtube_shorts") && (
              <div style={{ marginTop:12, padding:"10px 14px", background:"#F59E0B08", border:"1px solid #F59E0B22", borderRadius:8, fontSize:12, color:"#D4943A" }}>
                ⚠ Direct upload is currently supported for YouTube only. Other platforms will be saved as scheduled for manual publishing.
              </div>
            )}
          </div>

          <div className="card" style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#E0E0F0" }}>When to Post</div>
            <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:14, color:"#C0C0D8" }}>
              <input type="checkbox" checked={postNow} onChange={e => set("postNow")(e.target.checked)} style={{ width:16, height:16, accentColor:"#7C5CFC" }}/>
              Post immediately
            </label>
            {!postNow && (
              <div>
                <label style={{ fontSize:12, color:"#8888B8", display:"block", marginBottom:6 }}>Schedule date & time</label>
                <input type="datetime-local" value={scheduleTime} onChange={e => set("scheduleTime")(e.target.value)} className="inp" />
              </div>
            )}
          </div>

          <div className="card" style={{ padding:20, background:"#080810", display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{ fontSize:12, color:"#7878A8", textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>Summary</div>
            <div style={{ fontSize:14, color:"#C0C0D8" }}>📹 <strong>{videoFile?.name}</strong> · {videoFile ? `${(videoFile.size/1024/1024).toFixed(0)} MB` : ""}</div>
            {title && <div style={{ fontSize:14, color:"#C0C0D8" }}>📝 {title}</div>}
            <div style={{ fontSize:14, color:"#C0C0D8" }}>📤 {selPlatforms.length ? selPlatforms.join(", ") : "No platforms selected"}</div>
            <div style={{ fontSize:14, color:"#C0C0D8" }}>🕐 {postNow ? "Post immediately" : scheduleTime ? new Date(scheduleTime).toLocaleString() : "Not set"}</div>
            {makeShort && <div style={{ fontSize:14, color:"#C0C0D8" }}>✂ Short/Reel version will be created</div>}
          </div>

          <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
            <button onClick={() => set("step")(2)} className="btn-ghost" style={{ padding:"11px 22px", fontSize:14 }}>← Back</button>
            <button onClick={submit} disabled={submitting || !selPlatforms.length} className="btn-primary" style={{ padding:"11px 32px", fontSize:14 }}>
              {postNow ? "🚀 Upload & Post Now" : "📅 Upload & Schedule"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
