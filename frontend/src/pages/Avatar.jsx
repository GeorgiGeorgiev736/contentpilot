import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
function hdr() { return { Authorization: `Bearer ${localStorage.getItem("token")}` }; }
function jsonHdr() { return { ...hdr(), "Content-Type": "application/json" }; }

const PRESETS = [
  { id:"p1", label:"Pro Entrepreneur",   prompt:"confident male entrepreneur in his 30s, dark hair, business casual, warm smile" },
  { id:"p2", label:"Tech Creator",       prompt:"young female tech creator, glasses, casual smart attire, approachable look" },
  { id:"p3", label:"Fitness Coach",      prompt:"athletic fitness coach woman, 25-35 years old, sporty look, motivating expression" },
  { id:"p4", label:"Finance Expert",     prompt:"professional male finance advisor, 40s, suit, trustworthy expression" },
  { id:"p5", label:"Lifestyle Blogger",  prompt:"stylish lifestyle blogger woman, 20s, trendy fashion, bright smile" },
  { id:"p6", label:"Gaming Creator",     prompt:"young male gaming creator, hoodie, headset around neck, energetic look" },
  { id:"p7", label:"Health & Wellness",  prompt:"calm wellness coach woman, natural beauty, serene expression, soft lighting" },
  { id:"p8", label:"Business Coach",     prompt:"authoritative business coach man, 50s, suit, confident posture, direct gaze" },
];

export default function Avatar({ user }) {
  const [tab,           setTab]           = useState("face");     // face | generate | history
  const [faceSource,    setFaceSource]    = useState("upload");   // upload | prompt | preset
  const [photo,         setPhoto]         = useState(null);       // saved server URL
  const [photoPreview,  setPhotoPreview]  = useState(null);       // local blob or generated
  const [photoUploading,setPhotoUploading]= useState(false);
  const [facePrompt,    setFacePrompt]    = useState("");
  const [faceGenerating,setFaceGenerating]= useState(false);
  const [presetLoading, setPresetLoading] = useState(null);       // preset id being generated
  const [voices,        setVoices]        = useState([]);
  const [selectedVoice, setSelectedVoice] = useState("21m00Tcm4TlvDq8ikWAM");
  const [script,        setScript]        = useState("");
  const [generating,    setGenerating]    = useState(false);
  const [predictionId,  setPredictionId]  = useState(null);
  const [status,        setStatus]        = useState(null);
  const [progress,      setProgress]      = useState(0);
  const [videoUrl,      setVideoUrl]      = useState(null);
  const [history,       setHistory]       = useState([]);
  const [error,         setError]         = useState("");
  const pollRef = useRef(null);

  const isPro = ["pro","business","max","agency"].includes(user?.plan);

  useEffect(() => {
    fetch(`${API}/api/avatar/settings`, { headers: hdr() })
      .then(r => r.json())
      .then(d => { if (d.photo_url) setPhoto(d.photo_url); if (d.voice_id) setSelectedVoice(d.voice_id); })
      .catch(() => {});
    fetch(`${API}/api/avatar/voices`, { headers: hdr() })
      .then(r => r.json())
      .then(d => setVoices(d.voices || []))
      .catch(() => {});
  }, []);

  // Poll SadTalker status
  useEffect(() => {
    if (!predictionId || status === "succeeded" || status === "failed") return;
    pollRef.current = setInterval(async () => {
      try {
        const d = await fetch(`${API}/api/avatar/status/${predictionId}`, { headers: hdr() }).then(r => r.json());
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
    setPhotoUploading(true); setError("");
    const fd = new FormData(); fd.append("photo", file);
    try {
      const r = await fetch(`${API}/api/avatar/upload-photo`, { method:"POST", headers: hdr(), body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPhoto(d.photo_url);
    } catch (e) { setError(e.message); }
    setPhotoUploading(false);
  };

  const generateFace = async (prompt) => {
    setError(""); setFaceGenerating(true);
    try {
      const r = await fetch(`${API}/api/avatar/generate-face`, { method:"POST", headers: jsonHdr(), body: JSON.stringify({ prompt }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPhoto(d.photo_url);
      setPhotoPreview(d.image_url || `${API}${d.photo_url}`);
    } catch (e) { setError(e.message); }
    setFaceGenerating(false); setPresetLoading(null);
  };

  const selectPreset = (preset) => {
    setPresetLoading(preset.id);
    generateFace(preset.prompt);
  };

  const saveVoice = async (id) => {
    setSelectedVoice(id);
    await fetch(`${API}/api/avatar/settings`, { method:"PUT", headers: jsonHdr(), body: JSON.stringify({ voice_id: id }) }).catch(() => {});
  };

  const generate = async () => {
    if (!script.trim()) { setError("Enter a script first"); return; }
    if (!photo) { setError("Choose a face first in the Face tab"); return; }
    setError(""); setGenerating(true); setVideoUrl(null);
    setStatus("starting"); setProgress(0); setPredictionId(null);
    try {
      const r = await fetch(`${API}/api/avatar/generate`, { method:"POST", headers: jsonHdr(), body: JSON.stringify({ script }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPredictionId(d.prediction_id);
    } catch (e) { setError(e.message); setGenerating(false); setStatus(null); }
  };

  if (!isPro) return (
    <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
      <div>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em", fontFamily:"'DM Mono',monospace" }}><span style={{ color:"#40A0C0", fontWeight:400 }}>/</span> AI_Avatar_Studio</h1>
        <p style={{ color:"#9090B8", fontSize:15, marginTop:5 }}>Create talking AI presenter videos — no camera needed</p>
      </div>
      <div className="card" style={{ padding:48, textAlign:"center" }}>
        <div style={{ fontSize:56, marginBottom:16 }}>◉</div>
        <div style={{ fontSize:20, fontWeight:700, color:"#E0E0F8", marginBottom:8 }}>Pro Feature</div>
        <div style={{ fontSize:14, color:"#8888B8", maxWidth:420, margin:"0 auto 24px" }}>Requires Pro plan or higher.</div>
        <button className="btn-primary" style={{ padding:"12px 32px", fontSize:14 }}>⚡ Upgrade to Pro</button>
      </div>
    </div>
  );

  const photoSrc = photoPreview || (photo ? (photo.startsWith("/") ? `${API}${photo}` : photo) : null);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
      <div>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em", fontFamily:"'DM Mono',monospace" }}><span style={{ color:"#40A0C0", fontWeight:400 }}>/</span> AI_Avatar_Studio</h1>
        <p style={{ color:"#9090B8", fontSize:15, marginTop:5 }}>Pick or generate a face · choose a voice · paste a script · get a talking presenter video</p>
      </div>

      {error && (
        <div style={{ padding:"12px 16px", background:"#EF444410", border:"1px solid #EF444422", borderRadius:10, color:"#EF4444", fontSize:13, display:"flex", justifyContent:"space-between" }}>
          {error}
          <button onClick={() => setError("")} style={{ background:"none", border:"none", color:"#EF4444", cursor:"pointer", fontSize:18 }}>×</button>
        </div>
      )}

      {/* ── Tab bar ── */}
      <div style={{ display:"flex", gap:4, borderBottom:"1px solid #1a2830", marginBottom:-4 }}>
        {[["face","◉ Face"], ["generate","✦ Animate"], ["history","⊞ History"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:"10px 20px", background:"none", border:"none",
            borderBottom:`2px solid ${tab===id?"#40A0C0":"transparent"}`,
            color: tab===id ? "#a0d8e8" : "#777", fontWeight: tab===id ? 700 : 400,
            fontSize:14, cursor:"pointer", transition:"all .15s", marginBottom:-1,
          }}>{label}</button>
        ))}
      </div>

      {/* ── Face tab ── */}
      {tab === "face" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Face source selector */}
          <div style={{ display:"flex", gap:10 }}>
            {[["upload","📷 Upload Photo"], ["prompt","✦ Describe with AI"], ["preset","⊞ Ready-made"]].map(([id, label]) => (
              <button key={id} onClick={() => setFaceSource(id)} style={{
                flex:1, padding:"11px 0", borderRadius:11, border:`1.5px solid ${faceSource===id?"#40A0C0":"#1a2830"}`,
                background: faceSource===id ? "#40A0C015" : "#0e0e0e",
                color: faceSource===id ? "#a0d8e8" : "#777",
                fontSize:13, fontWeight: faceSource===id ? 700 : 400, cursor:"pointer", transition:"all .15s",
              }}>{label}</button>
            ))}
          </div>

          {/* Upload photo */}
          {faceSource === "upload" && (
            <div className="card" style={{ padding:24, display:"flex", gap:24, alignItems:"flex-start" }}>
              <div style={{ flexShrink:0 }}>
                {photoSrc ? (
                  <img src={photoSrc} alt="Avatar" style={{ width:120, height:120, borderRadius:14, objectFit:"cover", border:"2px solid #40A0C044" }} />
                ) : (
                  <div style={{ width:120, height:120, borderRadius:14, background:"#0e0e0e", border:"2px dashed #1e3030", display:"flex", alignItems:"center", justifyContent:"center", fontSize:40 }}>👤</div>
                )}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, color:"#d0d0d0", marginBottom:8, lineHeight:1.6 }}>Upload a clear, front-facing photo. The AI will animate it to speak your script.</div>
                <div style={{ fontSize:12, color:"#777", marginBottom:14 }}>Good lighting · neutral background · face centered · JPG/PNG up to 10 MB</div>
                <input type="file" accept="image/*" id="photoInput" style={{ display:"none" }} onChange={e => e.target.files[0] && uploadPhoto(e.target.files[0])} />
                <button className="btn-primary" style={{ padding:"9px 22px", fontSize:13 }} disabled={photoUploading} onClick={() => document.getElementById("photoInput").click()}>
                  {photoUploading ? "Uploading…" : photo ? "Change Photo" : "Upload Photo"}
                </button>
                {photo && !photoUploading && <span style={{ marginLeft:12, fontSize:13, color:"#22C55E" }}>✓ Photo saved</span>}
              </div>
            </div>
          )}

          {/* Describe with AI */}
          {faceSource === "prompt" && (
            <div className="card" style={{ padding:24, display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:"#e0e0e0", marginBottom:6 }}>Describe your avatar</div>
                <div style={{ fontSize:13, color:"#777", marginBottom:14 }}>Describe how you want the character to look. Be specific about gender, age, style, expression.</div>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <input
                  value={facePrompt}
                  onChange={e => setFacePrompt(e.target.value)}
                  placeholder="e.g. confident woman in her 30s, professional attire, warm smile"
                  className="inp"
                  style={{ flex:1 }}
                  onKeyDown={e => e.key === "Enter" && facePrompt.trim() && !faceGenerating && generateFace(facePrompt)}
                />
                <button
                  className="btn-primary"
                  style={{ padding:"0 22px", fontSize:13, flexShrink:0 }}
                  disabled={!facePrompt.trim() || faceGenerating}
                  onClick={() => generateFace(facePrompt)}
                >
                  {faceGenerating ? "Generating…" : "✦ Generate"}
                </button>
              </div>
              {faceGenerating && (
                <div style={{ fontSize:13, color:"#9090B8", display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>◌</span>
                  Creating your avatar face — takes ~20 seconds… (3 credits)
                </div>
              )}
              {photoSrc && !faceGenerating && (
                <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                  <img src={photoSrc} alt="Generated" style={{ width:100, height:100, borderRadius:12, objectFit:"cover", border:"2px solid #40A0C044" }} />
                  <div>
                    <div style={{ fontSize:13, color:"#22C55E", marginBottom:6 }}>✓ Face generated and saved</div>
                    <button className="btn-ghost" style={{ padding:"6px 14px", fontSize:12 }} onClick={() => generateFace(facePrompt)} disabled={faceGenerating}>
                      Regenerate
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ready-made presets */}
          {faceSource === "preset" && (
            <div className="card" style={{ padding:24 }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#e0e0e0", marginBottom:6 }}>Ready-made Avatar Personas</div>
              <div style={{ fontSize:13, color:"#777", marginBottom:16 }}>Click a character to generate a photorealistic face instantly. 3 credits each.</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12 }}>
                {PRESETS.map(p => {
                  const isLoading = presetLoading === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => !presetLoading && selectPreset(p)}
                      style={{
                        borderRadius:12, overflow:"hidden", cursor: presetLoading ? "wait" : "pointer",
                        border:"1.5px solid #1a2830", background:"#0e0e0e",
                        transition:"border-color .15s", opacity: presetLoading && !isLoading ? 0.4 : 1,
                      }}
                      onMouseEnter={e => { if (!presetLoading) { e.currentTarget.style.borderColor="#40A0C0"; } }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor="#1a2830"; }}
                    >
                      <div style={{ height:110, background:"linear-gradient(135deg,#0e1618,#0a1214)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, position:"relative" }}>
                        {isLoading ? (
                          <>
                            <span style={{ animation:"spin 1s linear infinite", display:"inline-block", fontSize:22, color:"#40A0C0" }}>◌</span>
                            <span style={{ fontSize:11, color:"#40A0C0", fontFamily:"'DM Mono',monospace" }}>generating…</span>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize:28, color:"#2A5060" }}>◉</div>
                            <div style={{ fontSize:10, color:"#2A5060", fontFamily:"'DM Mono',monospace", letterSpacing:".05em" }}>click to generate</div>
                          </>
                        )}
                      </div>
                      <div style={{ padding:"10px 12px" }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#D0D0E8", marginBottom:3 }}>{p.label}</div>
                        <div style={{ fontSize:11, color:"#555", lineHeight:1.4 }}>{p.prompt.slice(0, 50)}…</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {photoSrc && !presetLoading && (
                <div style={{ marginTop:16, padding:"12px 16px", background:"#22C55E10", border:"1px solid #22C55E22", borderRadius:10, display:"flex", alignItems:"center", gap:14 }}>
                  <img src={photoSrc} alt="Selected" style={{ width:52, height:52, borderRadius:10, objectFit:"cover" }} />
                  <div style={{ fontSize:13, color:"#22C55E", fontWeight:600 }}>✓ Avatar face ready — go to Animate tab to record your script</div>
                </div>
              )}
            </div>
          )}

          {/* Voice section — always visible */}
          <div className="card" style={{ padding:24 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#e0e0e0", marginBottom:14 }}>Voice</div>
            {voices.length === 0 ? (
              <div style={{ color:"#777", fontSize:13 }}>Loading voices… (requires ELEVENLABS_API_KEY)</div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:10 }}>
                {voices.slice(0, 12).map(v => (
                  <div key={v.voice_id} onClick={() => saveVoice(v.voice_id)} style={{
                    padding:"12px 14px", borderRadius:10, cursor:"pointer",
                    border:`1.5px solid ${selectedVoice===v.voice_id?"#40A0C0":"#1a2830"}`,
                    background: selectedVoice===v.voice_id ? "#40A0C015" : "#0e0e0e", transition:"all .15s",
                  }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div style={{ fontSize:13, fontWeight:600, color: selectedVoice===v.voice_id?"#a0d8e8":"#d0d0d0" }}>{v.name}</div>
                      {selectedVoice===v.voice_id && <span style={{ fontSize:11, color:"#40A0C0" }}>✓</span>}
                    </div>
                    <div style={{ fontSize:11, color:"#6868A8", marginTop:3, textTransform:"capitalize" }}>{v.category || "voice"}</div>
                    {v.preview && (
                      <button onClick={e => { e.stopPropagation(); new Audio(v.preview).play(); }}
                        style={{ marginTop:8, fontSize:11, color:"#9090B8", background:"none", border:"1px solid #1e3030", borderRadius:6, padding:"3px 10px", cursor:"pointer" }}>
                        ▶ Preview
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <button onClick={() => setTab("generate")} className="btn-primary" style={{ padding:"11px 28px", fontSize:14 }} disabled={!photo}>
              Next: Write Script →
            </button>
          </div>
        </div>
      )}

      {/* ── Animate tab ── */}
      {tab === "generate" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Result */}
          {videoUrl && (
            <div className="card" style={{ padding:20 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#22C55E", marginBottom:12 }}>✓ Avatar video ready!</div>
              <video src={videoUrl} controls style={{ width:"100%", maxHeight:400, borderRadius:10, background:"#000" }} />
              <div style={{ display:"flex", gap:10, marginTop:12 }}>
                <a href={videoUrl} download="avatar.mp4" className="btn-primary" style={{ padding:"9px 20px", fontSize:13, textDecoration:"none", display:"inline-block" }}>⬇ Download</a>
                <button onClick={() => { setVideoUrl(null); setStatus(null); setPredictionId(null); }} className="btn-ghost" style={{ padding:"9px 18px", fontSize:13 }}>Generate Another</button>
              </div>
            </div>
          )}

          {/* Generating */}
          {generating && !videoUrl && (
            <div className="card" style={{ padding:32, textAlign:"center" }}>
              <div style={{ fontSize:36, marginBottom:12, animation:"pulse 2s ease infinite" }}>◉</div>
              <div style={{ fontSize:16, fontWeight:700, color:"#E0E0F8", marginBottom:6 }}>
                {status === "starting" ? "Starting generation…" : `Animating your avatar — ${progress}%`}
              </div>
              <div style={{ fontSize:13, color:"#777", marginBottom:16 }}>Takes 2–4 minutes. You can leave this page and come back to History.</div>
              {progress > 0 && (
                <div style={{ width:320, maxWidth:"90%", margin:"0 auto", height:6, background:"#1A1A3A", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ width:`${progress}%`, height:"100%", background:"linear-gradient(90deg,#40A0C0,#60C8E0)", borderRadius:3, transition:"width .5s" }} />
                </div>
              )}
            </div>
          )}

          {/* Script input */}
          {!generating && (
            <div className="card" style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                {photoSrc && <img src={photoSrc} alt="Avatar" style={{ width:48, height:48, borderRadius:10, objectFit:"cover", border:"1px solid #3A2A8A", flexShrink:0 }} />}
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:"#e0e0e0" }}>Script</div>
                  <div style={{ fontSize:12, color:"#777", marginTop:2 }}>Max 2,500 chars · ~3 min video · 15 credits</div>
                </div>
              </div>
              <textarea value={script} onChange={e => setScript(e.target.value)} maxLength={2500}
                placeholder={"Hi everyone! Today I'm going to show you…"} className="inp"
                style={{ minHeight:160, resize:"vertical", lineHeight:1.7 }} />
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, color: script.length > 2300 ? "#F59E0B" : "#777" }}>{script.length}/2,500</span>
                <button onClick={generate} disabled={!script.trim() || !photo} className="btn-primary" style={{ padding:"11px 28px", fontSize:14 }}>
                  ◉ Generate Avatar Video
                </button>
              </div>
              {!photo && <div style={{ fontSize:13, color:"#F59E0B", padding:"8px 12px", background:"#F59E0B08", borderRadius:8, border:"1px solid #F59E0B22" }}>⚠ Go to the Face tab first and choose or generate a face</div>}
            </div>
          )}
        </div>
      )}

      {/* ── History tab ── */}
      {tab === "history" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {history.length === 0 ? (
            <div className="card" style={{ padding:40, textAlign:"center", color:"#777", fontSize:14 }}>
              No videos generated yet this session. Generated videos will appear here.
            </div>
          ) : history.map((h, i) => (
            <div key={i} className="card" style={{ padding:18, display:"flex", gap:16, alignItems:"center" }}>
              <video src={h.url} style={{ width:120, height:70, borderRadius:8, objectFit:"cover", background:"#000", flexShrink:0 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, color:"#d0d0d0", marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>"{h.script}{h.script.length >= 80 ? "…" : ""}"</div>
                <div style={{ fontSize:12, color:"#777" }}>{new Date(h.ts).toLocaleString()}</div>
              </div>
              <a href={h.url} download={`avatar-${i+1}.mp4`} className="btn-ghost" style={{ padding:"7px 16px", fontSize:12, textDecoration:"none", flexShrink:0 }}>⬇ Download</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
