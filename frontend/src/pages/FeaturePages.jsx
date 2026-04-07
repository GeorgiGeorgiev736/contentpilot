// ─── Video Optimizer ────────────────────────────────────────
import { useState, useEffect } from "react";
import { useAI } from "../hooks/useAI";
import { useAuth } from "../hooks/useAuth";
import { useCreditCosts } from "../hooks/useCreditCosts";
import AIPanel from "../components/AIPanel";
import CreditBadge from "../components/CreditBadge";
import { platforms as platformsApi } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
function getToken() { return localStorage.getItem("token"); }

const VIDEOS = [
  { id:1, t:"I used AI to automate my workflow",      p:"youtube", v:"284K", s:62, issues:["Weak thumbnail CTR","Missing chapters","Tags too broad"] },
  { id:2, t:"10 AI tools that replaced my team",      p:"tiktok",  v:"1.2M", s:91, issues:[] },
  { id:3, t:"Day in the life: AI developer 2025",     p:"youtube", v:"89K",  s:34, issues:["Weak title keyword","No description links","Wrong category"] },
  { id:4, t:"ChatGPT vs Claude vs Gemini review",     p:"youtube", v:"567K", s:78, issues:["Tags too specific"] },
];
const sc = s => s>=80?"#22C55E":s>=55?"#F59E0B":"#EF4444";

export function Optimizer() {
  const { run, loading, streaming, output, reset } = useAI();
  const { getCost } = useCreditCosts();
  const [title,    setTitle]    = useState("");
  const [platform, setPlatform] = useState("youtube");
  const [desc,     setDesc]     = useState("");
  const [selected, setSelected] = useState(null);

  const optimize = (t, p, v, issues) => {
    reset();
    run({ feature:"optimize_video", context:{ title:t, platform:p, views:v, issues } });
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
      <div>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#fff", letterSpacing:"-.04em", fontFamily:"'DM Mono',monospace" }}><span style={{ color:"#40A0C0", fontWeight:400 }}>/</span> Video_Optimizer</h1>
        <p style={{ color:"#888", fontSize:15, marginTop:5 }}>AI-powered SEO, tags, titles, descriptions for maximum reach</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:20, alignItems:"start" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div className="card" style={{ padding:18 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#C0C0E0", marginBottom:12 }}>Analyze New Video</div>
            <div style={{ display:"flex", gap:6, marginBottom:10 }}>
              {["youtube","tiktok","instagram"].map(p=>(
                <button key={p} onClick={()=>setPlatform(p)} style={{ flex:1, padding:"7px 4px", borderRadius:8, border:`1px solid ${platform===p?"#40A0C0":"#1a1a1a"}`, background:platform===p?"#40A0C022":"transparent", color:platform===p?"#40A0C0":"#777", cursor:"pointer", fontSize:11, fontWeight:600 }}>{p}</button>
              ))}
            </div>
            <input value={title} onChange={e=>setTitle(e.target.value)} className="inp" placeholder="Video title…" style={{ marginBottom:8 }}/>
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} className="inp" placeholder="Description (optional)…" rows={3} style={{ marginBottom:10, resize:"none" }}/>
            <button onClick={()=>{ if(title){ setSelected(null); optimize(title,platform,null,[]); }}} disabled={!title||loading} className="btn-primary" style={{ width:"100%", padding:"10px", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              Optimize → <CreditBadge cost={getCost("optimize_video")}/>
            </button>
          </div>
          <div style={{ fontSize:12, color:"#888", textTransform:"uppercase", letterSpacing:".08em", paddingLeft:4 }}>Your Videos</div>
          {VIDEOS.map(v=>(
            <div key={v.id} onClick={()=>{ setSelected(v); reset(); optimize(v.t,v.p,v.v,v.issues); }} className="card" style={{ padding:14, cursor:"pointer", borderLeft:`3px solid ${sc(v.s)}44`, transition:"all .15s", background:selected?.id===v.id?"#40A0C008":"#0e0e0e" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="#2a2a2a"} onMouseLeave={e=>e.currentTarget.style.borderColor="#161616"}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:13, fontWeight:500, color:"#e0e0e0", flex:1, lineHeight:1.4 }}>{v.t}</span>
                <span style={{ fontSize:13, fontWeight:700, color:sc(v.s), background:`${sc(v.s)}18`, padding:"2px 8px", borderRadius:6, flexShrink:0, height:"fit-content" }}>{v.s}</span>
              </div>
              <div style={{ fontSize:13, color:"#888" }}>{v.v} views · {v.p}</div>
              {v.issues.length>0 && <div style={{ marginTop:8, display:"flex", flexWrap:"wrap", gap:4 }}>
                {v.issues.slice(0,2).map(iss=><span key={iss} style={{ background:"#EF444408", color:"#EF4444", border:"1px solid #EF444418", fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20 }}>⚠ {iss}</span>)}
                {v.issues.length>2 && <span style={{ background:"#111", color:"#888", fontSize:10, padding:"2px 8px", borderRadius:20 }}>+{v.issues.length-2}</span>}
              </div>}
            </div>
          ))}
        </div>
        <div className="card" style={{ padding:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
            <div style={{ fontSize:15, fontWeight:600, color:"#e0e0e0" }}>Optimization Report</div>
            <div style={{ display:"flex", gap:8 }}>
              {(loading||streaming) && <div style={{ fontSize:12, color:"#40A0C0" }}>Analyzing…</div>}
              {!loading&&output&&<>
                <button onClick={()=>navigator.clipboard?.writeText(output)} className="btn-ghost" style={{ padding:"6px 14px", fontSize:12 }}>Copy</button>
                <button className="btn-primary" style={{ padding:"6px 16px", fontSize:12 }}>Apply All</button>
              </>}
            </div>
          </div>
          <AIPanel output={output} loading={loading} streaming={streaming} placeholder="⚡ Select a video or enter a title" minHeight={440}/>
        </div>
      </div>
    </div>
  );
}

// ─── Thumbnails ───────────────────────────────────────────────
export function Thumbnails() {
  const { run, loading, streaming, output, reset } = useAI();
  const { getCost } = useCreditCosts();
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState("bold");
  const styles = [["bold","Bold Text","High contrast, large text"],["curiosity","Curiosity Gap","Blurred reveal, question"],["list","Number List","Numbered, scannable"],["minimal","Minimal","Clean, typographic"],["reaction","Reaction Face","Exaggerated expression"],["before_after","Before/After","Split screen"]];
  const examples = [
    { t:"AI Workflow Automation", s:"bold",    ctr:"8.4%", score:91, e:"🤖", bg:"#FF2200" },
    { t:"10 AI Tools",            s:"list",    ctr:"6.1%", score:78, e:"⚡", bg:"#1A1A2E" },
    { t:"Day in Life Dev",        s:"minimal", ctr:"3.2%", score:44, e:"👨‍💻", bg:"#0A0A0A" },
  ];
  const sc = s => s>=80?"#22C55E":s>=55?"#F59E0B":"#EF4444";
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
      <div>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#fff", letterSpacing:"-.04em", fontFamily:"'DM Mono',monospace" }}><span style={{ color:"#40A0C0", fontWeight:400 }}>/</span> Thumbnail_Designer</h1>
        <p style={{ color:"#888", fontSize:15, marginTop:5 }}>AI thumbnail concepts, CTR analysis and A/B testing</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:20 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div className="card" style={{ padding:18 }}>
            <input value={title} onChange={e=>setTitle(e.target.value)} className="inp" placeholder="Video title…" style={{ marginBottom:12 }}/>
            <div style={{ fontSize:12, color:"#888", marginBottom:8 }}>Style</div>
            {styles.map(([id,lb,ds])=>(
              <div key={id} onClick={()=>setStyle(id)} style={{ padding:"9px 11px", borderRadius:8, cursor:"pointer", marginBottom:4, background:style===id?"#40A0C018":"#080810", border:`1px solid ${style===id?"#40A0C044":"#1a1a1a"}` }}>
                <div style={{ fontSize:12, color:style===id?"#40A0C0":"#aaa", fontWeight:style===id?600:400 }}>{lb}</div>
                <div style={{ fontSize:12, color:"#888" }}>{ds}</div>
              </div>
            ))}
            <button onClick={()=>{ reset(); run({ feature:"generate_thumbnail", context:{ title, style } }); }} disabled={!title||loading} className="btn-primary" style={{ width:"100%", padding:"11px", fontSize:13, marginTop:8, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              ◈ Generate 4 Concepts <CreditBadge cost={getCost("generate_thumbnail")}/>
            </button>
          </div>
          <div className="card" style={{ padding:14 }}>
            <div style={{ fontSize:12, color:"#888", textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>Analyze Existing</div>
            {examples.map(ex=>(
              <div key={ex.t} onClick={()=>{ reset(); run({ feature:"analyze_thumbnail", context:{ title:ex.t, style:ex.s, ctr:ex.ctr, score:ex.score } }); }} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 8px", borderRadius:9, cursor:"pointer", marginBottom:4, transition:"background .15s" }}
                onMouseEnter={e=>e.currentTarget.style.background="#111"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ width:52, height:34, borderRadius:6, background:ex.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, border:"1px solid #2a2a2a", flexShrink:0 }}>{ex.e}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, color:"#bbb" }}>{ex.t}</div>
                  <div style={{ fontSize:11, color:sc(ex.score), marginTop:2 }}>CTR {ex.ctr} · Score {ex.score}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
            <div style={{ fontSize:15, fontWeight:600, color:"#e0e0e0" }}>AI Thumbnail Concepts</div>
            {(loading||streaming)&&<div style={{ fontSize:12, color:"#C060A0" }}>Designing…</div>}
          </div>
          <AIPanel output={output} loading={loading} streaming={streaming} placeholder="◈ Enter a title and click Generate" minHeight={440}/>
        </div>
      </div>
    </div>
  );
}

// ─── Script Writer ────────────────────────────────────────────
export function Scripts({ setPage, prefillTopic, onNavigate }) {
  const { run, loading, streaming, output, reset } = useAI();
  const { user } = useAuth();
  const { getCost } = useCreditCosts();
  const [topic,      setTopic]      = useState("");
  const [format,     setFormat]     = useState("TikTok 60s");
  const [tone,       setTone]       = useState("conversational");
  const [audience,   setAudience]   = useState("developers and tech founders");
  const [copied,     setCopied]     = useState(false);
  const [avatarTab,  setAvatarTab]  = useState("generate"); // generate | settings
  const [avatarVoice,setAvatarVoice]= useState("Rachel");
  const [avatarVoices,setAvatarVoices] = useState([]);
  const [avatarPhoto, setAvatarPhoto] = useState(null);  // saved photo_url from server
  const [photoFile,  setPhotoFile]  = useState(null);    // local File for upload
  const [photoPreview,setPhotoPreview] = useState(null); // local blob URL
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarJob,  setAvatarJob]  = useState(null); // { id, status, video_url, progress }
  const [avatarErr,  setAvatarErr]  = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);

  const isPro = ["pro","business","max","agency"].includes(user?.plan);
  const formats = ["TikTok 60s","YouTube 8-12 min","Deep Dive 20-30 min","Podcast Clip 2-5 min"];
  const hot = ["AI replacing software engineers in 2025","I built a full app with AI — zero code","Why I quit $200k job to vibe code","Claude vs GPT-4: honest 30-day test","How I automate 80% of my content pipeline"];

  // Pre-fill topic from Trend Radar navigation
  useEffect(() => { if (prefillTopic) setTopic(prefillTopic); }, [prefillTopic]);

  // Load avatar settings + voices when the avatar section mounts
  const loadAvatarData = async () => {
    if (!isPro) return;
    try {
      const [settingsRes, voicesRes] = await Promise.all([
        fetch(`${API}/api/avatar/settings`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API}/api/avatar/voices`,   { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        if (s.photo_url) setAvatarPhoto(s.photo_url);
        if (s.voice_id)  setAvatarVoice(s.voice_id);
      }
      if (voicesRes.ok) {
        const v = await voicesRes.json();
        setAvatarVoices(v.voices || []);
      }
    } catch { /* silent — fallback to static list */ }
  };

  // Called once when component mounts
  useEffect(() => { loadAvatarData(); }, []);

  const uploadPhoto = async () => {
    if (!photoFile) return;
    const fd = new FormData();
    fd.append("photo", photoFile);
    const res = await fetch(`${API}/api/avatar/upload-photo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Photo upload failed");
    setAvatarPhoto(data.photo_url);
    return data.photo_url;
  };

  const saveSettings = async () => {
    setAvatarBusy(true); setAvatarErr("");
    try {
      if (photoFile) await uploadPhoto();
      await fetch(`${API}/api/avatar/settings`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: avatarVoice }),
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch (err) { setAvatarErr(err.message); }
    finally { setAvatarBusy(false); }
  };

  const generateAvatar = async () => {
    if (!output) { setAvatarErr("Generate a script first"); return; }
    if (!avatarPhoto && !photoFile) { setAvatarErr("Upload a photo in the Settings tab first"); return; }
    setAvatarBusy(true); setAvatarErr(""); setAvatarJob(null);
    try {
      // If there's a new unsaved photo, upload it first
      if (photoFile && !avatarPhoto) await uploadPhoto();

      const res = await fetch(`${API}/api/avatar/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ script: output }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Avatar generation failed");

      const predId = data.prediction_id;
      setAvatarJob({ id: predId, status: "processing", video_url: null, progress: 0 });

      // Poll for completion (up to 10 min, every 4s)
      for (let i = 0; i < 150; i++) {
        await new Promise(r => setTimeout(r, 4000));
        const pollRes = await fetch(`${API}/api/avatar/status/${predId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const poll = await pollRes.json();
        if (poll.status === "succeeded") {
          const videoUrl = Array.isArray(poll.video_url) ? poll.video_url[0] : poll.video_url;
          setAvatarJob({ id: predId, status: "done", video_url: videoUrl, progress: 100 });
          break;
        }
        if (poll.status === "failed") throw new Error("Avatar rendering failed: " + (poll.error || "unknown"));
        setAvatarJob(prev => ({ ...prev, progress: poll.progress || prev?.progress || 0 }));
      }
    } catch (err) { setAvatarErr(err.message); }
    finally { setAvatarBusy(false); }
  };

  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
      <div>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#fff", letterSpacing:"-.04em", fontFamily:"'DM Mono',monospace" }}><span style={{ color:"#40A0C0", fontWeight:400 }}>/</span> Script_Writer</h1>
        <p style={{ color:"#888", fontSize:15, marginTop:5 }}>AI scripts with visual cues, b-roll notes, and editing markers</p>
      </div>
      {prefillTopic && (
        <div style={{ padding:"11px 16px", background:"#F59E0B08", border:"1px solid #F59E0B33", borderRadius:11, fontSize:13, color:"#D4A540", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:15 }}>✦</span>
          <span>Topic pre-filled from Trend Radar — generate your script below</span>
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:20 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div className="card" style={{ padding:18 }}>
            <textarea value={topic} onChange={e=>setTopic(e.target.value)} className="inp" placeholder="Topic or title idea…" rows={3} style={{ marginBottom:12, resize:"none", lineHeight:1.5 }}/>
            <div style={{ fontSize:12, color:"#888", marginBottom:7 }}>Format</div>
            {formats.map(f=>(
              <div key={f} onClick={()=>setFormat(f)} style={{ padding:"9px 11px", borderRadius:8, cursor:"pointer", marginBottom:4, background:format===f?"#40A0C018":"#080810", border:`1px solid ${format===f?"#40A0C044":"#1a1a1a"}`, fontSize:12, color:format===f?"#40A0C0":"#aaa", fontWeight:format===f?600:400 }}>{f}</div>
            ))}
            <div style={{ marginTop:12, marginBottom:8 }}>
              <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>Tone</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                {["conversational","educational","entertaining","controversial"].map(t=>(
                  <button key={t} onClick={()=>setTone(t)} style={{ padding:"4px 10px", borderRadius:20, border:`1px solid ${tone===t?"#40A0C0":"#1a1a1a"}`, background:tone===t?"#40A0C022":"transparent", color:tone===t?"#40A0C0":"#888", cursor:"pointer", fontSize:11, fontWeight:tone===t?600:400 }}>{t}</button>
                ))}
              </div>
            </div>
            <input value={audience} onChange={e=>setAudience(e.target.value)} className="inp" placeholder="Target audience…" style={{ marginBottom:12 }}/>
            <button onClick={()=>{ reset(); run({ feature:"generate_script", context:{ topic, format, tone, audience } }); }} disabled={!topic||loading} className="btn-primary" style={{ width:"100%", padding:"11px", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              ✦ Generate Script <CreditBadge cost={getCost("generate_script")}/>
            </button>
          </div>
          <div className="card" style={{ padding:14 }}>
            <div style={{ fontSize:12, color:"#888", textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>🔥 Hot Topics</div>
            {hot.map(t=>(
              <div key={t} onClick={()=>setTopic(t)} style={{ padding:"9px 8px", borderRadius:8, cursor:"pointer", fontSize:13, color:"#A8A8C8", transition:"all .15s", marginBottom:2 }}
                onMouseEnter={e=>{ e.currentTarget.style.background="#111"; e.currentTarget.style.color="#e0e0e0"; }}
                onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#A8A8C8"; }}>{t}</div>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="card" style={{ padding:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <div style={{ fontSize:15, fontWeight:600, color:"#e0e0e0" }}>Generated Script</div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {(loading||streaming) && <div style={{ fontSize:12, color:"#22C55E" }}>Writing…</div>}
                {!loading&&output&&<>
                  <button onClick={()=>{ navigator.clipboard?.writeText(output); setCopied(true); setTimeout(()=>setCopied(false),2000); }} className="btn-ghost" style={{ padding:"6px 14px", fontSize:12 }}>{copied?"✓ Copied":"Copy"}</button>
                  <button className="btn-primary" style={{ padding:"6px 16px", fontSize:12 }}>→ Pipeline</button>
                </>}
              </div>
            </div>
            <AIPanel output={output} loading={loading} streaming={streaming} placeholder="✦ Enter a topic and generate your script" minHeight={300}/>
          </div>

          {/* AI Avatar section */}
          <div className="card" style={{ padding:24, border:`1px solid ${isPro?"#40A0C022":"#161616"}`, background:isPro?"#0E0E1A":"#0e0e0e" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ fontSize:22 }}>🤖</div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>AI Avatar Video</div>
                  <div style={{ fontSize:13, color:"#888" }}>Turn this script into a talking-head video — no camera needed</div>
                </div>
              </div>
              {isPro ? (
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <CreditBadge cost={getCost("avatar_generate") || 15}/>
                  <div style={{ display:"flex", background:"#080810", border:"1px solid #1a1a1a", borderRadius:8, overflow:"hidden" }}>
                    {["generate","settings"].map(tab=>(
                      <button key={tab} onClick={()=>setAvatarTab(tab)} style={{ padding:"6px 14px", border:"none", background:avatarTab===tab?"#40A0C022":"transparent", color:avatarTab===tab?"#40A0C0":"#888", cursor:"pointer", fontSize:12, fontFamily:"inherit", textTransform:"capitalize" }}>{tab}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <span style={{ background:"#40A0C018", color:"#40A0C0", fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20 }}>PRO+</span>
              )}
            </div>

            {!isPro ? (
              <div style={{ padding:"20px", background:"#080810", borderRadius:12, textAlign:"center", border:"1px dashed #40A0C022" }}>
                <div style={{ fontSize:13, color:"#9898C0", marginBottom:12, lineHeight:1.6 }}>
                  Generate realistic talking-head videos with your own AI avatar.<br/>
                  Upload your photo once, pick a voice, post forever.
                </div>
                <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap", marginBottom:16 }}>
                  {["No camera required","ElevenLabs voices","Vertical 9:16","Direct to scheduler"].map(f=>(
                    <span key={f} style={{ background:"#40A0C010", border:"1px solid #40A0C022", color:"#40A0C0", fontSize:11, padding:"3px 10px", borderRadius:20 }}>{f}</span>
                  ))}
                </div>
                {setPage && <button onClick={()=>setPage("pricing")} className="btn-primary" style={{ padding:"10px 24px", fontSize:13 }}>Upgrade to Pro →</button>}
              </div>
            ) : avatarTab === "settings" ? (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {/* Photo upload */}
                <div>
                  <div style={{ fontSize:12, color:"#888", marginBottom:8 }}>Your Photo</div>
                  <div style={{ display:"flex", gap:14, alignItems:"center" }}>
                    <div style={{ width:72, height:72, borderRadius:12, border:"2px dashed #2a2a2a", overflow:"hidden", background:"#080810", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {(photoPreview || avatarPhoto) ? (
                        <img src={photoPreview || `${API}${avatarPhoto}`} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      ) : (
                        <span style={{ fontSize:24 }}>👤</span>
                      )}
                    </div>
                    <div style={{ flex:1 }}>
                      <label style={{ display:"block", padding:"9px 14px", borderRadius:8, border:"1px solid #2a2a2a", background:"#080810", color:"#9898C0", cursor:"pointer", fontSize:12, textAlign:"center" }}>
                        {photoPreview || avatarPhoto ? "Change Photo" : "Upload Photo"}
                        <input type="file" accept="image/*" onChange={onPhotoChange} style={{ display:"none" }}/>
                      </label>
                      <div style={{ fontSize:11, color:"#777", marginTop:5 }}>JPG/PNG, up to 10 MB. Face should be clearly visible.</div>
                    </div>
                  </div>
                </div>
                {/* Voice selection */}
                <div>
                  <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>Voice</div>
                  <select value={avatarVoice} onChange={e=>setAvatarVoice(e.target.value)} className="inp">
                    {avatarVoices.length > 0 ? (
                      avatarVoices.map(v => <option key={v.voice_id} value={v.voice_id}>{v.name}{v.category ? ` (${v.category})` : ""}</option>)
                    ) : (
                      <>
                        <option value="21m00Tcm4TlvDq8ikWAM">Rachel (US Female)</option>
                        <option value="AZnzlk1XvdvUeBnXmlld">Domi (US Female, strong)</option>
                        <option value="EXAVITQu4vr4xnSDxMaL">Bella (US Female, soft)</option>
                        <option value="ErXwobaYiN019PkySvjV">Antoni (US Male)</option>
                        <option value="MF3mGyEYCl7XYWbV9V6O">Elli (US Female, young)</option>
                        <option value="TxGEqnHWrfWFTfGW9XjX">Josh (US Male, deep)</option>
                        <option value="VR6AewLTigWG4xSOukaG">Arnold (US Male, crisp)</option>
                        <option value="pNInz6obpgDQGcFmaJgB">Adam (US Male, narration)</option>
                        <option value="yoZ06aMxZJJ28mfd3POQ">Sam (US Male, raspy)</option>
                      </>
                    )}
                  </select>
                </div>
                {avatarErr && <div style={{ color:"#EF4444", fontSize:13, padding:"10px 13px", background:"#EF444410", borderRadius:8 }}>{avatarErr}</div>}
                <button onClick={saveSettings} disabled={avatarBusy} className="btn-primary" style={{ padding:"10px", fontSize:13 }}>
                  {avatarBusy ? "Saving…" : settingsSaved ? "✓ Saved!" : "Save Settings"}
                </button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {avatarErr && <div style={{ color:"#EF4444", fontSize:13, padding:"10px 13px", background:"#EF444410", borderRadius:8 }}>{avatarErr}</div>}
                {/* Status */}
                {avatarJob && (
                  <div style={{ padding:"14px", background:"#40A0C008", border:"1px solid #40A0C022", borderRadius:10 }}>
                    {avatarJob.status === "done" ? (
                      <div>
                        <div style={{ fontSize:13, color:"#22C55E", fontWeight:600, marginBottom:10 }}>✓ Avatar video ready!</div>
                        <video src={avatarJob.video_url} controls style={{ width:"100%", borderRadius:8, maxHeight:360 }}/>
                        <a href={avatarJob.video_url} target="_blank" rel="noreferrer" style={{ textDecoration:"none" }}>
                          <button className="btn-ghost" style={{ width:"100%", marginTop:10, padding:"9px", fontSize:13 }}>⬇ Download Video</button>
                        </a>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                          <div style={{ width:16, height:16, border:"2px solid #40A0C044", borderTopColor:"#40A0C0", borderRadius:"50%", animation:"spin 1s linear infinite", flexShrink:0 }}/>
                          <span style={{ fontSize:13, color:"#40A0C0" }}>
                            Rendering{avatarJob.progress > 0 ? ` — ${avatarJob.progress}%` : "…"}
                          </span>
                        </div>
                        {avatarJob.progress > 0 && (
                          <div style={{ height:4, background:"#111", borderRadius:2 }}>
                            <div style={{ width:`${avatarJob.progress}%`, height:"100%", background:"linear-gradient(90deg,#40A0C0,#B45AFD)", borderRadius:2, transition:"width .5s" }}/>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {/* Setup hint */}
                {!avatarPhoto && !photoFile && (
                  <div style={{ fontSize:12, color:"#F59E0B", padding:"8px 12px", background:"#F59E0B08", borderRadius:8 }}>
                    ⚠ Upload your photo in the Settings tab first
                  </div>
                )}
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <button onClick={generateAvatar} disabled={avatarBusy || !output} className="btn-primary" style={{ flex:1, padding:"11px", fontSize:13 }}>
                    {avatarBusy ? "Rendering…" : "🤖 Generate Avatar Video"}
                  </button>
                  <button onClick={()=>setAvatarTab("settings")} className="btn-ghost" style={{ padding:"11px 14px", fontSize:13 }}>⚙</button>
                </div>
                <div style={{ fontSize:11, color:"#777" }}>
                  Powered by ElevenLabs + SadTalker · ~2-4 min render time
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics ────────────────────────────────────────────────
const PLATFORM_CFG = {
  youtube:   { name:"YouTube",   color:"#FF0000", icon:"▶" },
  tiktok:    { name:"TikTok",    color:"#69C9D0", icon:"♪" },
  instagram: { name:"Instagram", color:"#E1306C", icon:"◈" },
};

export function Analytics() {
  const { run, loading, streaming, output, reset } = useAI();
  const [active,      setActive]      = useState(null);
  const [connections, setConnections] = useState({});
  const [stats,       setStats]       = useState({});
  const [videos,      setVideos]      = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    platformsApi.list()
      .then(({ connections: list }) => {
        const map = {};
        list.forEach(c => { if (c.connected) map[c.platform] = c; });
        setConnections(map);
        return Promise.all(
          Object.keys(map).map(p =>
            platformsApi.stats(p)
              .then(({ stats: s }) => setStats(prev => ({ ...prev, [p]: s })))
              .catch(() => {})
          )
        );
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));

    // Top YouTube videos
    fetch(`${API}/api/platforms/youtube/top-videos`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(r => r.json()).then(({ videos: v }) => setVideos(v || [])).catch(() => {});
  }, []);

  const connectedPlatforms = Object.keys(connections);
  const aiCtx = {
    platforms:           connectedPlatforms.join(", ") || "none connected",
    youtubeSubscribers:  connections.youtube?.followers  || stats.youtube?.subscribers  || "N/A",
    tiktokFollowers:     connections.tiktok?.followers   || stats.tiktok?.followers     || "N/A",
    instagramFollowers:  connections.instagram?.followers|| stats.instagram?.followers  || "N/A",
    youtubeViews30d:     stats.youtube?.views30d         || "N/A",
    tiktokLikes:         stats.tiktok?.totalLikes        || "N/A",
    youtubeNewSubs30d:   stats.youtube?.newSubs30d       || "N/A",
  };

  const analyses = [
    { id:"analyze_growth",   icon:"▦", label:"Growth Analysis",   ctx:{ ...aiCtx } },
    { id:"analyze_growth",   icon:"◎", label:"Content Patterns",  ctx:{ ...aiCtx } },
    { id:"revenue_strategy", icon:"⚡", label:"Revenue Strategy",  ctx:{ ...aiCtx } },
    { id:"analyze_growth",   icon:"◈", label:"Audience Insights", ctx:{ ...aiCtx } },
  ];

  if (dataLoading) return <div style={{ color:"#888", padding:40, textAlign:"center" }}>Loading analytics…</div>;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
      <div>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#fff", letterSpacing:"-.04em", fontFamily:"'DM Mono',monospace" }}><span style={{ color:"#40A0C0", fontWeight:400 }}>/</span> Analytics</h1>
        <p style={{ color:"#888", fontSize:15, marginTop:5 }}>Performance insights across all connected platforms</p>
      </div>

      {connectedPlatforms.length === 0 && (
        <div style={{ padding:"22px", background:"#F59E0B08", border:"1px solid #F59E0B22", borderRadius:14, textAlign:"center", color:"#C0943A", fontSize:14 }}>
          No platforms connected yet — go to <strong>Platforms</strong> to connect your accounts and see real data here.
        </div>
      )}

      {/* Platform stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
        {Object.entries(PLATFORM_CFG).map(([id, cfg]) => {
          const conn = connections[id];
          const s    = stats[id];
          if (!conn) return null;
          const statEntries = s ? Object.entries(s) : [
            ["Followers", conn.followers?.toLocaleString() || "0"],
            ["Videos",    conn.video_count?.toLocaleString() || "0"],
          ];
          return (
            <div key={id} className="card" style={{ padding:22, borderLeft:`3px solid ${cfg.color}66` }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:18, color:cfg.color }}>{cfg.icon}</span>
                  <span style={{ fontSize:15, fontWeight:600, color:"#e0e0e0" }}>{cfg.name}</span>
                </div>
                <span style={{ background:`${cfg.color}18`, color:cfg.color, fontSize:11, fontWeight:600, padding:"2px 9px", borderRadius:20 }}>● Live</span>
              </div>
              <div style={{ fontSize:12, color:"#6868A0", marginBottom:12 }}>{conn.handle}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {statEntries.map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize:11, color:"#888", marginBottom:3, textTransform:"capitalize" }}>{k.replace(/([A-Z])/g," $1").toLowerCase()}</div>
                    <div style={{ fontSize:17, fontWeight:700, color:"#e0e0e0" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Deep Analysis */}
      <div className="card" style={{ padding:22 }}>
        <div style={{ fontSize:15, fontWeight:700, color:"#C0C0E0", marginBottom:14 }}>AI Deep Analysis</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
          {analyses.map((a, i) => (
            <button key={i} onClick={() => { setActive(i); reset(); run({ feature:a.id, context:a.ctx }); }}
              style={{ padding:16, borderRadius:12, cursor:"pointer", textAlign:"left", border:`1px solid ${active===i?"#40A0C044":"#161616"}`, background:active===i?"#40A0C008":"#0e0e0e" }}>
              <div style={{ fontSize:20, color:"#40A0C0", marginBottom:8 }}>{a.icon}</div>
              <div style={{ fontSize:13, fontWeight:600, color:"#e0e0e0" }}>{a.label}</div>
            </button>
          ))}
        </div>
        {(output || loading) && <AIPanel output={output} loading={loading} streaming={streaming} minHeight={200}/>}
      </div>

      {/* Top YouTube videos */}
      <div className="card" style={{ padding:22 }}>
        <div style={{ fontSize:15, fontWeight:600, color:"#e0e0e0", marginBottom:18 }}>Top Performing Videos</div>
        {!connections.youtube ? (
          <div style={{ color:"#888", fontSize:13, padding:"14px 0" }}>Connect YouTube to see your top performing videos.</div>
        ) : videos.length === 0 ? (
          <div style={{ color:"#888", fontSize:13, padding:"14px 0" }}>No videos found or YouTube Analytics API not enabled in your Google Cloud project.</div>
        ) : (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 80px 80px 80px", gap:14, paddingBottom:10, borderBottom:"1px solid #111", marginBottom:4 }}>
              {["Video","Views","Duration","Likes","Comments"].map(h => (
                <div key={h} style={{ fontSize:11, color:"#777", textTransform:"uppercase", letterSpacing:".06em" }}>{h}</div>
              ))}
            </div>
            {videos.map((v, i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 80px 80px 80px 80px", gap:14, padding:"12px 0", borderBottom:i<videos.length-1?"1px solid #0A0A18":"none", alignItems:"center" }}>
                <div style={{ fontSize:13, fontWeight:500, color:"#e0e0e0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.title}</div>
                <div style={{ fontSize:13, color:"#bbb" }}>{v.views}</div>
                <div style={{ fontSize:13, color:"#bbb" }}>{v.duration}</div>
                <div style={{ fontSize:13, color:"#bbb" }}>{v.likes}</div>
                <div style={{ fontSize:13, color:"#bbb" }}>{v.comments}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── AI Pipeline ─────────────────────────────────────────────
export function Pipeline() {
  const { run, loading, streaming, output, reset } = useAI();
  const [niche,   setNiche]   = useState("AI tools and developer productivity");
  const [topic,   setTopic]   = useState("");
  const [running, setRunning] = useState(null);
  const [done,    setDone]    = useState([]);
  const [outputs, setOutputs] = useState({});
  const [active,  setActive]  = useState(null);
  const [isAll,   setIsAll]   = useState(false);

  const STAGES = [
    { id:"trend",     label:"Detect Trend",    icon:"◎", color:"#40A0C0" },
    { id:"virality",  label:"Predict Virality",icon:"⚡", color:"#F59E0B" },
    { id:"idea",      label:"Generate Idea",   icon:"✦", color:"#22C55E" },
    { id:"script",    label:"Write Script",    icon:"⊡", color:"#3B82F6" },
    { id:"thumbnail", label:"Design Thumbnail",icon:"◈", color:"#C060A0" },
    { id:"tags",      label:"Optimize Tags",   icon:"⬡", color:"#69C9D0" },
    { id:"schedule",  label:"Schedule Post",   icon:"◷", color:"#8B5CF6" },
  ];

  const runStage = async (id) => {
    setRunning(id); setActive(id); reset();
    const ctx = { niche, topic:topic||niche, platforms:"TikTok and YouTube", idea:outputs["idea"]?.slice(0,200)||topic||niche };
    await run({
      feature: id,
      context: ctx,
      onComplete: (full) => {
        setOutputs(p => ({ ...p, [id]:full }));
        setDone(p => [...new Set([...p, id])]);
        setRunning(null);
      },
    });
  };

  const runAll = async () => {
    setIsAll(true); setDone([]); setOutputs({}); reset();
    for (const s of STAGES) {
      await runStage(s.id);
      await new Promise(r => setTimeout(r, 300));
    }
    setIsAll(false);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:800, color:"#fff", letterSpacing:"-.04em", fontFamily:"'DM Mono',monospace" }}><span style={{ color:"#40A0C0", fontWeight:400 }}>/</span> AI_Pipeline</h1>
          <p style={{ color:"#888", fontSize:15, marginTop:5 }}>Full autopilot — trend → script → thumbnail → scheduled post</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {done.length>0 && <button onClick={()=>{ setDone([]); setOutputs({}); setRunning(null); setActive(null); reset(); }} className="btn-ghost" style={{ padding:"10px 18px", fontSize:13 }}>Reset</button>}
          <button onClick={runAll} disabled={isAll} className="btn-primary" style={{ padding:"10px 24px", fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
            {isAll ? <><span style={{ width:13,height:13,border:"2px solid #fff4",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin 1s linear infinite" }}/>Running…</> : "▶ Run Full Autopilot"}
          </button>
        </div>
      </div>
      <div className="card" style={{ padding:18 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div>
            <label style={{ fontSize:12, color:"#888", display:"block", marginBottom:5 }}>Channel Niche</label>
            <input value={niche} onChange={e=>setNiche(e.target.value)} className="inp"/>
          </div>
          <div>
            <label style={{ fontSize:12, color:"#888", display:"block", marginBottom:5 }}>Seed Topic (optional — leave blank for AI to find trends)</label>
            <input value={topic} onChange={e=>setTopic(e.target.value)} className="inp" placeholder="e.g. AI productivity tools"/>
          </div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:20, alignItems:"start" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {STAGES.map(s => {
            const isDone=done.includes(s.id); const isRun=running===s.id;
            return (
              <div key={s.id} onClick={()=>{ if(!isAll){ if(outputs[s.id]) setActive(s.id); else runStage(s.id); }}}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 14px", borderRadius:12, cursor:isAll?"default":"pointer", background:active===s.id?`${s.color}0A`:"#0e0e0e", border:`1px solid ${active===s.id?s.color+"33":"#161616"}`, transition:"all .15s" }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:isDone?`${s.color}22`:"#080810", border:`2px solid ${isRun?s.color:isDone?s.color+"66":"#1A1A2E"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, color:isDone?s.color:"#777", boxShadow:isRun?`0 0 14px ${s.color}44`:"none", flexShrink:0, transition:"all .3s" }}>
                  {isRun ? <span style={{ width:12,height:12,border:`2px solid ${s.color}44`,borderTopColor:s.color,borderRadius:"50%",display:"inline-block",animation:"spin 1s linear infinite" }}/> : isDone?"✓":s.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:isDone?600:400, color:isDone?"#E8E8FC":"#888" }}>{s.label}</div>
                  <div style={{ fontSize:11, color:isRun?s.color:isDone?"#888":"#5A5A80", marginTop:2 }}>{isRun?"Processing…":isDone?"Done — click to view":"Pending"}</div>
                </div>
                {isDone && <div style={{ width:6,height:6,borderRadius:"50%",background:"#22C55E" }}/>}
              </div>
            );
          })}
          {done.length>0 && (
            <div className="card" style={{ padding:"13px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
                <span style={{ fontSize:12, color:"#888" }}>Progress</span>
                <span style={{ fontSize:12, color:"#40A0C0", fontWeight:600 }}>{done.length}/{STAGES.length}</span>
              </div>
              <div style={{ height:4, background:"#111", borderRadius:2 }}>
                <div style={{ width:`${(done.length/STAGES.length)*100}%`,height:"100%",background:"linear-gradient(90deg,#40A0C0,#B45AFD)",borderRadius:2,transition:"width .5s" }}/>
              </div>
            </div>
          )}
        </div>
        <div className="card" style={{ padding:24 }}>
          {active ? (
            <>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:600, color:"#e0e0e0" }}>{STAGES.find(s=>s.id===active)?.label}</div>
                  <div style={{ fontSize:12, color:"#888", marginTop:2 }}>{running===active?"Generating…":"Complete"}</div>
                </div>
                {streaming&&running===active && <div style={{ fontSize:12, color:STAGES.find(s=>s.id===active)?.color }}>AI Writing</div>}
              </div>
              <AIPanel output={running===active?output:(outputs[active]||"")} loading={loading&&running===active} streaming={streaming&&running===active} minHeight={420}/>
            </>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:420, color:"#777", gap:14 }}>
              <span style={{ fontSize:52 }}>⊙</span>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:15, fontWeight:500, color:"#d0d0d0", marginBottom:6 }}>Set your niche and launch the autopilot</div>
                <div style={{ fontSize:13 }}>Or click any stage to run individually</div>
              </div>
              <button onClick={runAll} className="btn-primary" style={{ padding:"12px 28px", fontSize:14, marginTop:8 }}>▶ Start Full Pipeline</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
