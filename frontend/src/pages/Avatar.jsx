import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

const TABS = ["Setup", "Generate", "History"];

export default function Avatar({ user }) {
  const [tab,          setTab]          = useState("Setup");
  const [photo,        setPhoto]        = useState(null);   // saved photo URL
  const [photoPreview, setPhotoPreview] = useState(null);   // local blob URL
  const [voices,       setVoices]       = useState([]);
  const [selectedVoice,setSelectedVoice]= useState("21m00Tcm4TlvDq8ikWAM"); // Rachel
  const [script,       setScript]       = useState("");
  const [generating,   setGenerating]   = useState(false);
  const [predictionId, setPredictionId] = useState(null);
  const [status,       setStatus]       = useState(null);   // starting|processing|succeeded|failed
  const [progress,     setProgress]     = useState(0);
  const [videoUrl,     setVideoUrl]     = useState(null);
  const [history,      setHistory]      = useState([]);
  const [error,        setError]        = useState("");
  const [uploading,    setUploading]    = useState(false);
  const [savingVoice,  setSavingVoice]  = useState(false);
  const pollRef = useRef(null);

  const isPro = ["pro","business","max","agency"].includes(user?.plan);

  // Load settings + voices on mount
  useEffect(() => {
    fetch(`${API}/api/avatar/settings`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.photo_url) setPhoto(d.photo_url);
        if (d.voice_id)  setSelectedVoice(d.voice_id);
      }).catch(() => {});

    fetch(`${API}/api/avatar/voices`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setVoices(d.voices || []))
      .catch(() => {});
  }, []);

  // Poll prediction status
  useEffect(() => {
    if (!predictionId || status === "succeeded" || status === "failed") return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/avatar/status/${predictionId}`, { headers: authHeaders() });
        const d = await r.json();
        setStatus(d.status);
        setProgress(d.progress || 0);
        if (d.status === "succeeded") {
          const url = Array.isArray(d.video_url) ? d.video_url[0] : d.video_url;
          setVideoUrl(url);
          setHistory(h => [{ id: predictionId, url, script: script.slice(0, 80), ts: new Date() }, ...h]);
          clearInterval(pollRef.current);
          setGenerating(false);
        }
        if (d.status === "failed") {
          setError("Generation failed: " + (d.error || "unknown error"));
          clearInterval(pollRef.current);
          setGenerating(false);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [predictionId, status]);

  const uploadPhoto = async (file) => {
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("photo", file);
    try {
      const r = await fetch(`${API}/api/avatar/upload-photo`, {
        method: "POST", headers: authHeaders(), body: fd,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPhoto(d.photo_url);
    } catch (e) { setError(e.message); }
    setUploading(false);
  };

  const saveVoice = async (id) => {
    setSelectedVoice(id);
    setSavingVoice(true);
    await fetch(`${API}/api/avatar/settings`, {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ voice_id: id }),
    }).catch(() => {});
    setSavingVoice(false);
  };

  const generate = async () => {
    if (!script.trim()) { setError("Enter a script first"); return; }
    if (!photo) { setError("Upload a photo first in the Setup tab"); return; }
    setError(""); setGenerating(true); setVideoUrl(null);
    setStatus("starting"); setProgress(0); setPredictionId(null);
    try {
      const r = await fetch(`${API}/api/avatar/generate`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ script }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPredictionId(d.prediction_id);
      setTab("Generate");
    } catch (e) { setError(e.message); setGenerating(false); setStatus(null); }
  };

  if (!isPro) return (
    <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
      <div>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em" }}>AI Avatar</h1>
        <p style={{ color:"#9090B8", fontSize:15, marginTop:5 }}>Create a talking AI avatar from a single photo</p>
      </div>
      <div className="card" style={{ padding:48, textAlign:"center" }}>
        <div style={{ fontSize:56, marginBottom:16 }}>◉</div>
        <div style={{ fontSize:20, fontWeight:700, color:"#E0E0F8", marginBottom:8 }}>Pro Feature</div>
        <div style={{ fontSize:14, color:"#8888B8", maxWidth:420, margin:"0 auto 24px" }}>
          AI Avatar requires a Pro plan or higher. Upgrade to generate talking avatar videos from your photo.
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center", marginBottom:28 }}>
          {["Upload your photo","Choose AI voice","Paste your script","Get a talking video"].map((s,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#9090B8" }}>
              <span style={{ width:22, height:22, borderRadius:"50%", background:"#7C5CFC22", color:"#9B79FC", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{i+1}</span>
              {s}
            </div>
          ))}
        </div>
        <button className="btn-primary" style={{ padding:"12px 32px", fontSize:14 }}>⚡ Upgrade to Pro</button>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
      <div>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em" }}>AI Avatar Studio</h1>
        <p style={{ color:"#9090B8", fontSize:15, marginTop:5 }}>Upload your photo · choose a voice · paste a script · get a talking video</p>
      </div>

      {error && (
        <div style={{ padding:"12px 16px", background:"#EF444410", border:"1px solid #EF444422", borderRadius:10, color:"#EF4444", fontSize:13, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          {error}
          <button onClick={() => setError("")} style={{ background:"none", border:"none", color:"#EF4444", cursor:"pointer", fontSize:18 }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, borderBottom:"1px solid #1E1E42", paddingBottom:0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:"10px 20px", background:"none", border:"none", borderBottom:`2px solid ${tab===t?"#7C5CFC":"transparent"}`,
            color: tab===t ? "#C4B5FD" : "#7878A8", fontWeight: tab===t ? 700 : 400,
            fontSize:14, cursor:"pointer", transition:"all .15s", marginBottom:-1,
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Setup tab ── */}
      {tab === "Setup" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Photo upload */}
          <div className="card" style={{ padding:24 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#E0E0F0", marginBottom:16 }}>Your Photo</div>
            <div style={{ display:"flex", gap:24, alignItems:"flex-start" }}>
              <div style={{ flexShrink:0 }}>
                {(photoPreview || photo) ? (
                  <img
                    src={photoPreview || (photo.startsWith("/") ? `${API}${photo}` : photo)}
                    alt="Avatar"
                    style={{ width:120, height:120, borderRadius:14, objectFit:"cover", border:"2px solid #7C5CFC44" }}
                  />
                ) : (
                  <div style={{ width:120, height:120, borderRadius:14, background:"#0C0C24", border:"2px dashed #2A2A50", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>
                    👤
                  </div>
                )}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, color:"#C0C0D8", marginBottom:12, lineHeight:1.6 }}>
                  Upload a clear, front-facing photo of yourself. The AI will animate it to speak your script.
                </div>
                <div style={{ fontSize:12, color:"#7878A8", marginBottom:14 }}>
                  Best results: good lighting, neutral background, face centered · JPG/PNG up to 10MB
                </div>
                <input type="file" accept="image/*" id="photoInput" style={{ display:"none" }}
                  onChange={e => e.target.files[0] && uploadPhoto(e.target.files[0])} />
                <button
                  className="btn-primary"
                  style={{ padding:"9px 22px", fontSize:13 }}
                  disabled={uploading}
                  onClick={() => document.getElementById("photoInput").click()}
                >
                  {uploading ? "Uploading…" : photo ? "Change Photo" : "Upload Photo"}
                </button>
                {photo && !uploading && <span style={{ marginLeft:12, fontSize:13, color:"#22C55E" }}>✓ Photo saved</span>}
              </div>
            </div>
          </div>

          {/* Voice selection */}
          <div className="card" style={{ padding:24 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#E0E0F0" }}>Voice</div>
              {savingVoice && <span style={{ fontSize:12, color:"#9090B8" }}>Saving…</span>}
            </div>
            {voices.length === 0 ? (
              <div style={{ color:"#7878A8", fontSize:13 }}>Loading voices… (requires ELEVENLABS_API_KEY)</div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
                {voices.slice(0, 12).map(v => (
                  <div
                    key={v.voice_id}
                    onClick={() => saveVoice(v.voice_id)}
                    style={{
                      padding:"12px 14px", borderRadius:10, cursor:"pointer",
                      border:`1.5px solid ${selectedVoice===v.voice_id?"#7C5CFC":"#1E1E42"}`,
                      background: selectedVoice===v.voice_id ? "#7C5CFC15" : "#0C0C1A",
                      transition:"all .15s",
                    }}
                  >
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div style={{ fontSize:13, fontWeight:600, color: selectedVoice===v.voice_id ? "#C4B5FD" : "#C0C0D8" }}>{v.name}</div>
                      {selectedVoice===v.voice_id && <span style={{ fontSize:11, color:"#7C5CFC" }}>✓</span>}
                    </div>
                    <div style={{ fontSize:11, color:"#6868A8", marginTop:3, textTransform:"capitalize" }}>{v.category || "voice"}</div>
                    {v.preview && (
                      <button
                        onClick={e => { e.stopPropagation(); new Audio(v.preview).play(); }}
                        style={{ marginTop:8, fontSize:11, color:"#9090B8", background:"none", border:"1px solid #2A2A50", borderRadius:6, padding:"3px 10px", cursor:"pointer" }}
                      >
                        ▶ Preview
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <button onClick={() => setTab("Generate")} className="btn-primary" style={{ padding:"11px 28px", fontSize:14 }} disabled={!photo}>
              Next: Write Script →
            </button>
          </div>
        </div>
      )}

      {/* ── Generate tab ── */}
      {tab === "Generate" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Video result */}
          {videoUrl && (
            <div className="card" style={{ padding:20 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#22C55E", marginBottom:12 }}>✓ Avatar video ready!</div>
              <video src={videoUrl} controls style={{ width:"100%", maxHeight:400, borderRadius:10, background:"#000" }} />
              <div style={{ display:"flex", gap:10, marginTop:12 }}>
                <a href={videoUrl} download="avatar.mp4" className="btn-primary" style={{ padding:"9px 20px", fontSize:13, textDecoration:"none", display:"inline-block" }}>
                  ⬇ Download
                </a>
                <button onClick={() => { setVideoUrl(null); setStatus(null); setPredictionId(null); }} className="btn-ghost" style={{ padding:"9px 18px", fontSize:13 }}>
                  Generate Another
                </button>
              </div>
            </div>
          )}

          {/* Generating state */}
          {generating && !videoUrl && (
            <div className="card" style={{ padding:28, textAlign:"center" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>◉</div>
              <div style={{ fontSize:16, fontWeight:700, color:"#E0E0F8", marginBottom:6 }}>
                {status === "starting"    ? "Starting generation…" :
                 status === "processing"  ? `Animating your avatar — ${progress}%` :
                 "Processing…"}
              </div>
              <div style={{ fontSize:13, color:"#7878A8", marginBottom:16 }}>This takes 2–4 minutes. You can leave this page — come back and check History.</div>
              {progress > 0 && (
                <div style={{ width:300, maxWidth:"90%", margin:"0 auto", height:6, background:"#1A1A3A", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ width:`${progress}%`, height:"100%", background:"linear-gradient(90deg,#7C5CFC,#B45AFD)", borderRadius:3, transition:"width .5s" }} />
                </div>
              )}
            </div>
          )}

          {/* Script input */}
          {!generating && (
            <div className="card" style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                {(photoPreview || photo) && (
                  <img
                    src={photoPreview || (photo.startsWith("/") ? `${API}${photo}` : photo)}
                    alt="Avatar"
                    style={{ width:44, height:44, borderRadius:10, objectFit:"cover", border:"1px solid #3A2A8A", flexShrink:0 }}
                  />
                )}
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:"#E0E0F0" }}>Script</div>
                  <div style={{ fontSize:12, color:"#7878A8", marginTop:2 }}>Max 2,500 characters · ~3 min video</div>
                </div>
              </div>
              <textarea
                value={script}
                onChange={e => setScript(e.target.value)}
                maxLength={2500}
                placeholder="Hi everyone! Today I'm going to show you…"
                className="inp"
                style={{ minHeight:160, resize:"vertical", lineHeight:1.7 }}
              />
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, color: script.length > 2300 ? "#F59E0B" : "#7878A8" }}>
                  {script.length}/2,500 chars
                </span>
                <button
                  onClick={generate}
                  disabled={!script.trim() || !photo}
                  className="btn-primary"
                  style={{ padding:"11px 28px", fontSize:14 }}
                >
                  ◉ Generate Avatar Video
                </button>
              </div>
              {!photo && (
                <div style={{ fontSize:13, color:"#F59E0B", padding:"8px 12px", background:"#F59E0B08", borderRadius:8, border:"1px solid #F59E0B22" }}>
                  ⚠ Go to Setup tab first and upload a photo
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── History tab ── */}
      {tab === "History" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {history.length === 0 ? (
            <div className="card" style={{ padding:40, textAlign:"center", color:"#7878A8", fontSize:14 }}>
              No videos generated yet. Go to the Generate tab to create your first avatar video.
            </div>
          ) : history.map((h, i) => (
            <div key={i} className="card" style={{ padding:18, display:"flex", gap:16, alignItems:"center" }}>
              <video src={h.url} style={{ width:120, height:70, borderRadius:8, objectFit:"cover", background:"#000", flexShrink:0 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, color:"#C0C0D8", marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  "{h.script}{h.script.length >= 80 ? "…" : ""}"
                </div>
                <div style={{ fontSize:12, color:"#7878A8" }}>{new Date(h.ts).toLocaleString()}</div>
              </div>
              <a href={h.url} download={`avatar-${i+1}.mp4`} className="btn-ghost" style={{ padding:"7px 16px", fontSize:12, textDecoration:"none", flexShrink:0 }}>
                ⬇ Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
