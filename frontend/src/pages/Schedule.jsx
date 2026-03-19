import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useCreditCosts } from "../hooks/useCreditCosts";
import CreditBadge from "../components/CreditBadge";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const PC  = { youtube:"#FF0000", tiktok:"#69C9D0", instagram:"#E1306C" };
const PI  = { youtube:"▶", tiktok:"♪", instagram:"◈" };

function getToken() { return localStorage.getItem("token"); }

async function apiFetch(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${getToken()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error || "Request failed"); }
  return res.json();
}

// Stream AI response — calls onToken with each text chunk, returns full text
async function streamAI(feature, context, onToken) {
  const res = await fetch(`${API}/api/ai/stream`, {
    method:  "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${getToken()}` },
    body:    JSON.stringify({ feature, context }),
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({}));
    throw new Error(e.error || "AI request failed");
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split("\n");
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      try {
        const parsed = JSON.parse(line.slice(5).trim());
        if (parsed.text) { full += parsed.text; onToken(full); }
      } catch {}
    }
  }
  return full;
}

const STATUS_COLOR = { scheduled:"#7C5CFC", publishing:"#F59E0B", published:"#22C55E", failed:"#EF4444", cancelled:"#888" };

export default function Schedule() {
  const [posts,    setPosts]    = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [view,     setView]     = useState("list");

  // Form state
  const [title,        setTitle]        = useState("");
  const [description,  setDescription]  = useState("");
  const [hashtags,     setHashtags]      = useState("");
  const [platforms,    setPlatforms_]    = useState([]);
  const [scheduledFor, setScheduledFor] = useState("");

  // File upload state
  const [videoFile,      setVideoFile]      = useState(null);
  const [thumbnailFile,  setThumbnailFile]  = useState(null);
  const [videoPreview,   setVideoPreview]   = useState(null);
  const [thumbPreview,   setThumbPreview]   = useState(null);
  const [uploading,      setUploading]      = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // AI state
  const [aiLoading, setAiLoading] = useState(null); // field name being generated
  const { getCost } = useCreditCosts();

  const videoInputRef = useRef();
  const thumbInputRef = useRef();

  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calYear,  setCalYear]  = useState(now.getFullYear());

  useEffect(() => { loadPosts(); }, []);
  useEffect(() => { if (view === "calendar") loadCalendar(); }, [view, calMonth, calYear]);

  const loadPosts = async () => {
    setLoading(true);
    try { const { posts } = await apiFetch("GET", "/api/schedule"); setPosts(posts); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadCalendar = async () => {
    try {
      const { posts } = await apiFetch("GET", `/api/schedule/calendar?month=${calMonth}&year=${calYear}`);
      setCalendar(posts);
    } catch {}
  };

  const togglePlatform = (p) =>
    setPlatforms_(prev => prev.includes(p) ? prev.filter(x=>x!==p) : [...prev, p]);

  const onVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const onThumbChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    setThumbPreview(URL.createObjectURL(file));
  };

  const generateField = async (field) => {
    if (aiLoading) return;
    setAiLoading(field);
    setError("");
    try {
      const context = { title, description, hashtags, platforms };
      await streamAI(`schedule_${field}`, context, (text) => {
        if (field === "title")       setTitle(text);
        if (field === "description") setDescription(text);
        if (field === "hashtags")    setHashtags(text);
      });
    } catch (e) { setError(e.message); }
    finally { setAiLoading(null); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!platforms.length) { setError("Select at least one platform"); return; }
    if (!videoFile)        { setError("Please attach a video file"); return; }
    setSaving(true); setError("");

    try {
      // 1 — upload files
      setUploading(true);
      const formData = new FormData();
      formData.append("video", videoFile);
      if (thumbnailFile) formData.append("thumbnail", thumbnailFile);

      const uploadRes = await fetch(`${API}/api/schedule/upload`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body:    formData,
      });
      if (!uploadRes.ok) {
        const e = await uploadRes.json().catch(()=>({}));
        throw new Error(e.error || "File upload failed");
      }
      const { video_url, thumbnail_url } = await uploadRes.json();
      setUploading(false);
      setUploadProgress(100);

      // 2 — schedule the post
      const hashArr = hashtags.split(/[\s,]+/).filter(h=>h).map(h=>h.startsWith("#")?h:`#${h}`);
      await apiFetch("POST", "/api/schedule", {
        title, description,
        hashtags:      hashArr,
        platforms,
        scheduled_for: scheduledFor,
        video_url,
        thumbnail_url: thumbnail_url || null,
      });

      closeForm();
      loadPosts();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); setUploading(false); }
  };

  const closeForm = () => {
    setShowForm(false);
    setTitle(""); setDescription(""); setHashtags(""); setPlatforms_([]); setScheduledFor("");
    setVideoFile(null); setThumbnailFile(null);
    setVideoPreview(null); setThumbPreview(null);
    setUploadProgress(0); setError("");
  };

  const cancel = async (id) => {
    await apiFetch("DELETE", `/api/schedule/${id}`).catch(()=>{});
    loadPosts();
  };

  const daysInMonth     = new Date(calYear, calMonth, 0).getDate();
  const firstDayOfMonth = new Date(calYear, calMonth - 1, 1).getDay();
  const monthNames      = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const postsByDay = {};
  calendar.forEach(p => {
    const day = new Date(p.scheduled_for).getDate();
    if (!postsByDay[day]) postsByDay[day] = [];
    postsByDay[day].push(p);
  });

  // ── styles ────────────────────────────────────────────────────
  const inp = { width:"100%", boxSizing:"border-box", background:"#080810", border:"1px solid #20203A", borderRadius:9, color:"#D8D8F0", padding:"10px 13px", fontSize:14, outline:"none", fontFamily:"inherit" };
  const aiBtn = (field) => ({
    padding:"5px 12px", borderRadius:7, border:"1px solid #7C5CFC44", background:"#7C5CFC12",
    color: aiLoading === field ? "#7C5CFC" : "#A090FF",
    cursor: aiLoading ? "default" : "pointer", fontSize:12, fontFamily:"inherit",
    opacity: aiLoading && aiLoading !== field ? 0.4 : 1,
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:22 }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em" }}>Content Scheduler</h1>
          <p style={{ color:"#9090B8", fontSize:15, marginTop:5 }}>Upload a video, optimize with AI, and post to all platforms at once</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <div style={{ display:"flex", background:"#0C0C1A", border:"1px solid #16162A", borderRadius:10, overflow:"hidden" }}>
            {["list","calendar"].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{ padding:"9px 16px", border:"none", background:view===v?"#7C5CFC":"transparent", color:view===v?"#fff":"#8888B8", cursor:"pointer", fontSize:13, fontWeight:view===v?600:400, textTransform:"capitalize", fontFamily:"inherit" }}>{v}</button>
            ))}
          </div>
          <button onClick={()=>setShowForm(true)} className="btn-primary" style={{ padding:"10px 20px", fontSize:13 }}>
            + Schedule Post
          </button>
        </div>
      </div>

      {/* ── Schedule form modal ── */}
      {showForm && createPortal(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(6px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ width:"100%", maxWidth:900, height:"calc(100vh - 48px)", background:"#0C0C1A", border:"1px solid #7C5CFC33", borderRadius:20, boxShadow:"0 0 80px #7C5CFC22", display:"flex", flexDirection:"column", overflow:"hidden" }}>

            {/* Fixed header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 28px 16px", borderBottom:"1px solid #16162A", flexShrink:0 }}>
              <div style={{ fontSize:20, fontWeight:800, color:"#F5F5FF" }}>Schedule New Post</div>
              <button onClick={closeForm} style={{ background:"none", border:"1px solid #1E1E32", color:"#B0B0CC", width:30, height:30, borderRadius:"50%", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" }}>×</button>
            </div>

            <div style={{ padding:"20px 28px", overflowY:"auto", flex:1 }}>
              <form onSubmit={submit} id="schedule-form">

                {/* Row 1: platforms + datetime side by side */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:11, color:"#8888B8", marginBottom:8, textTransform:"uppercase", letterSpacing:".06em" }}>Post to</div>
                    <div style={{ display:"flex", gap:8 }}>
                      {["youtube","tiktok","instagram"].map(p=>(
                        <button type="button" key={p} onClick={()=>togglePlatform(p)} style={{ flex:1, padding:"9px 6px", borderRadius:9, border:`2px solid ${platforms.includes(p)?PC[p]:PC[p]+"33"}`, background:platforms.includes(p)?`${PC[p]}18`:"#080810", color:platforms.includes(p)?PC[p]:"#8888B8", cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}>
                          <div style={{ fontSize:16, marginBottom:2 }}>{PI[p]}</div>
                          <div style={{ fontSize:11, fontWeight:600, textTransform:"capitalize" }}>{p}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:"#8888B8", marginBottom:8, textTransform:"uppercase", letterSpacing:".06em" }}>Date & Time <span style={{ color:"#EF4444" }}>*</span></div>
                    <input type="datetime-local" value={scheduledFor} onChange={e=>setScheduledFor(e.target.value)} required style={{ ...inp, colorScheme:"dark", height:76, display:"flex", alignItems:"center" }}/>
                  </div>
                </div>

                {/* Row 2: video + thumbnail side by side */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:11, color:"#8888B8", marginBottom:8, textTransform:"uppercase", letterSpacing:".06em" }}>Video File <span style={{ color:"#EF4444" }}>*</span></div>
                    <input ref={videoInputRef} type="file" accept="video/*" onChange={onVideoChange} style={{ display:"none" }}/>
                    {!videoFile ? (
                      <div onClick={()=>videoInputRef.current.click()} style={{ border:"2px dashed #7C5CFC44", borderRadius:10, padding:"20px 12px", textAlign:"center", cursor:"pointer", background:"#080810", transition:"border-color .15s", height:76, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", boxSizing:"border-box" }}
                        onMouseEnter={e=>e.currentTarget.style.borderColor="#7C5CFC88"}
                        onMouseLeave={e=>e.currentTarget.style.borderColor="#7C5CFC44"}>
                        <div style={{ fontSize:20, marginBottom:4 }}>🎬</div>
                        <div style={{ fontSize:12, color:"#C4B5FD", fontWeight:600 }}>Click to choose a video</div>
                        <div style={{ fontSize:11, color:"#8888B8" }}>MP4, MOV, WebM — up to 500 MB</div>
                      </div>
                    ) : (
                      <div style={{ background:"#080810", border:"1px solid #7C5CFC44", borderRadius:10, padding:10, display:"flex", alignItems:"center", gap:10, height:76, boxSizing:"border-box" }}>
                        <video src={videoPreview} style={{ width:64, height:44, objectFit:"cover", borderRadius:6, background:"#000", flexShrink:0 }} muted/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, color:"#D8D8F0", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{videoFile.name}</div>
                          <div style={{ fontSize:11, color:"#8888B8", marginTop:2 }}>{(videoFile.size/1024/1024).toFixed(1)} MB</div>
                        </div>
                        <button type="button" onClick={()=>{ setVideoFile(null); setVideoPreview(null); }} style={{ background:"none", border:"none", color:"#EF4444", cursor:"pointer", fontSize:18, padding:2, flexShrink:0 }}>×</button>
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize:11, color:"#8888B8", marginBottom:8, textTransform:"uppercase", letterSpacing:".06em" }}>Thumbnail <span style={{ color:"#8888B8", fontWeight:400, textTransform:"none", letterSpacing:0, fontSize:11 }}>(optional)</span></div>
                    <input ref={thumbInputRef} type="file" accept="image/*" onChange={onThumbChange} style={{ display:"none" }}/>
                    {!thumbnailFile ? (
                      <div onClick={()=>thumbInputRef.current.click()} style={{ border:"2px dashed #20203A", borderRadius:10, padding:"12px", textAlign:"center", cursor:"pointer", background:"#080810", transition:"border-color .15s", height:76, display:"flex", alignItems:"center", justifyContent:"center", boxSizing:"border-box" }}
                        onMouseEnter={e=>e.currentTarget.style.borderColor="#7C5CFC44"}
                        onMouseLeave={e=>e.currentTarget.style.borderColor="#20203A"}>
                        <div style={{ fontSize:12, color:"#8888B8" }}>🖼 Add custom thumbnail (JPG, PNG)</div>
                      </div>
                    ) : (
                      <div style={{ background:"#080810", border:"1px solid #20203A", borderRadius:10, padding:10, display:"flex", alignItems:"center", gap:10, height:76, boxSizing:"border-box" }}>
                        <img src={thumbPreview} style={{ width:64, height:44, objectFit:"cover", borderRadius:6, flexShrink:0 }}/>
                        <div style={{ flex:1, fontSize:12, color:"#D8D8F0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{thumbnailFile.name}</div>
                        <button type="button" onClick={()=>{ setThumbnailFile(null); setThumbPreview(null); }} style={{ background:"none", border:"none", color:"#EF4444", cursor:"pointer", fontSize:18, padding:2, flexShrink:0 }}>×</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
                    <div style={{ fontSize:11, color:"#8888B8", textTransform:"uppercase", letterSpacing:".06em" }}>Title / Caption <span style={{ color:"#EF4444" }}>*</span></div>
                    <button type="button" onClick={()=>generateField("title")} style={aiBtn("title")} disabled={!!aiLoading}>
                      {aiLoading === "title" ? "✦ Generating…" : <span style={{display:"flex",alignItems:"center",gap:5}}>✦ Generate with AI <CreditBadge cost={getCost("schedule_title")}/></span>}
                    </button>
                  </div>
                  <input value={title} onChange={e=>setTitle(e.target.value)} required style={inp} placeholder="Your video title or caption…"/>
                </div>

                {/* Description + Hashtags side by side */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:12 }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
                      <div style={{ fontSize:11, color:"#8888B8", textTransform:"uppercase", letterSpacing:".06em" }}>Description</div>
                      <button type="button" onClick={()=>generateField("description")} style={aiBtn("description")} disabled={!!aiLoading}>
                        {aiLoading === "description" ? "✦ Generating…" : <span style={{display:"flex",alignItems:"center",gap:5}}>✦ AI <CreditBadge cost={getCost("schedule_description")}/></span>}
                      </button>
                    </div>
                    <textarea value={description} onChange={e=>setDescription(e.target.value)} style={{ ...inp, resize:"vertical" }} placeholder="Full description…" rows={4}/>
                  </div>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
                      <div style={{ fontSize:11, color:"#8888B8", textTransform:"uppercase", letterSpacing:".06em" }}>Hashtags</div>
                      <button type="button" onClick={()=>generateField("hashtags")} style={aiBtn("hashtags")} disabled={!!aiLoading}>
                        {aiLoading === "hashtags" ? "✦ Generating…" : <span style={{display:"flex",alignItems:"center",gap:5}}>✦ AI <CreditBadge cost={getCost("schedule_hashtags")}/></span>}
                      </button>
                    </div>
                    <textarea value={hashtags} onChange={e=>setHashtags(e.target.value)} style={{ ...inp, resize:"vertical" }} placeholder="#productivity #aitools #workflow (space separated)" rows={4}/>
                  </div>
                </div>

                {error && <div style={{ background:"#EF444410", border:"1px solid #EF444422", borderRadius:8, padding:"9px 13px", color:"#EF4444", fontSize:13, marginBottom:12 }}>{error}</div>}

                {uploading && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:12, color:"#8888B8", marginBottom:5 }}>Uploading video…</div>
                    <div style={{ height:4, background:"#10102A", borderRadius:2 }}>
                      <div style={{ width:`${uploadProgress || 30}%`, height:"100%", background:"linear-gradient(90deg,#7C5CFC,#B45AFD)", borderRadius:2 }}/>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Fixed footer */}
            <div style={{ padding:"14px 28px", borderTop:"1px solid #16162A", display:"flex", gap:10, flexShrink:0 }}>
              <button type="button" onClick={closeForm} className="btn-ghost" style={{ flex:1, padding:"11px" }}>Cancel</button>
              <button type="submit" form="schedule-form" disabled={saving || !!aiLoading} className="btn-primary" style={{ flex:2, padding:"11px", fontSize:14, opacity: saving||aiLoading ? 0.7 : 1 }}>
                {uploading ? "Uploading video…" : saving ? "Scheduling…" : `Schedule for ${platforms.length || 0} platform${platforms.length !== 1 ? "s" : ""} →`}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── List view ── */}
      {view === "list" && (
        <div className="card" style={{ padding:22 }}>
          {loading ? (
            <div style={{ color:"#7878A8", padding:30, textAlign:"center" }}>Loading…</div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign:"center", padding:"50px 20px", color:"#7878A8" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>◷</div>
              <div style={{ fontSize:15, color:"#A8A8C8", marginBottom:6 }}>No scheduled posts yet</div>
              <div style={{ fontSize:13, marginBottom:20 }}>Upload a video and schedule it across all platforms in one click</div>
              <button onClick={()=>setShowForm(true)} className="btn-primary" style={{ padding:"10px 24px", fontSize:13 }}>+ Schedule First Post</button>
            </div>
          ) : (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 100px 130px 140px 80px", gap:16, paddingBottom:10, borderBottom:"1px solid #10102A", marginBottom:4 }}>
                {["Post","Platform","Scheduled For","Status",""].map(h=>(
                  <div key={h} style={{ fontSize:11, color:"#7878A8", textTransform:"uppercase", letterSpacing:".08em" }}>{h}</div>
                ))}
              </div>
              {posts.map((p,i)=>(
                <div key={p.id} style={{ display:"grid", gridTemplateColumns:"1fr 100px 130px 140px 80px", gap:16, padding:"13px 0", borderBottom:i<posts.length-1?"1px solid #0A0A18":"none", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:"#D8D8F0" }}>{p.title}</div>
                    {p.hashtags?.length>0 && <div style={{ fontSize:12, color:"#8888B8", marginTop:2 }}>{p.hashtags.slice(0,3).join(" ")}</div>}
                    {p.error_message && <div style={{ fontSize:11, color:"#EF4444", marginTop:2 }}>✕ {p.error_message}</div>}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ color:PC[p.platform], fontSize:14 }}>{PI[p.platform]}</span>
                    <span style={{ fontSize:12, color:"#9898C0", textTransform:"capitalize" }}>{p.platform}</span>
                  </div>
                  <div style={{ fontSize:12, color:"#B0B0CC" }}>
                    {new Date(p.scheduled_for).toLocaleDateString("en-US",{month:"short",day:"numeric"})}<br/>
                    <span style={{ color:"#9898C0" }}>{new Date(p.scheduled_for).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</span>
                  </div>
                  <div>
                    <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:`${STATUS_COLOR[p.status]}18`, color:STATUS_COLOR[p.status], textTransform:"capitalize" }}>
                      {p.status}
                    </span>
                  </div>
                  <div>
                    {p.status === "scheduled" && (
                      <button onClick={()=>cancel(p.id)} style={{ padding:"5px 12px", background:"transparent", border:"1px solid #EF444422", borderRadius:8, color:"#EF4444", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>Cancel</button>
                    )}
                    {p.status === "published" && <span style={{ fontSize:11, color:"#22C55E" }}>✓ Live</span>}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Calendar view ── */}
      {view === "calendar" && (
        <div className="card" style={{ padding:22 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
            <button onClick={()=>{ const d=new Date(calYear,calMonth-2); setCalMonth(d.getMonth()+1); setCalYear(d.getFullYear()); }} style={{ background:"#10102A", border:"1px solid #1A1A2E", borderRadius:8, color:"#B0B0CC", cursor:"pointer", padding:"6px 14px", fontFamily:"inherit" }}>←</button>
            <div style={{ fontSize:16, fontWeight:600, color:"#E0E0F0" }}>{monthNames[calMonth-1]} {calYear}</div>
            <button onClick={()=>{ const d=new Date(calYear,calMonth); setCalMonth(d.getMonth()+1); setCalYear(d.getFullYear()); }} style={{ background:"#10102A", border:"1px solid #1A1A2E", borderRadius:8, color:"#B0B0CC", cursor:"pointer", padding:"6px 14px", fontFamily:"inherit" }}>→</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:4 }}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(
              <div key={d} style={{ textAlign:"center", fontSize:12, color:"#7878A8", padding:"6px 0" }}>{d}</div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
            {Array.from({ length: firstDayOfMonth }).map((_,i)=>(
              <div key={`e-${i}`} style={{ aspectRatio:"1", background:"transparent" }}/>
            ))}
            {Array.from({ length: daysInMonth }).map((_,i)=>{
              const day      = i + 1;
              const dayPosts = postsByDay[day] || [];
              const isToday  = day===now.getDate() && calMonth===now.getMonth()+1 && calYear===now.getFullYear();
              return (
                <div key={day} style={{ aspectRatio:"1", borderRadius:8, background:isToday?"#7C5CFC18":dayPosts.length?"#0F0F1E":"#0A0A16", border:`1px solid ${isToday?"#7C5CFC33":dayPosts.length?"#1A1A2E":"#0F0F1E"}`, padding:"6px", display:"flex", flexDirection:"column" }}>
                  <div style={{ fontSize:12, color:isToday?"#B09FFF":dayPosts.length?"#CCC":"#555", fontWeight:isToday?700:400, marginBottom:3 }}>{day}</div>
                  {dayPosts.slice(0,2).map(p=>(
                    <div key={p.id} style={{ fontSize:9, color:PC[p.platform], background:`${PC[p.platform]}18`, borderRadius:3, padding:"1px 4px", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {PI[p.platform]} {p.title}
                    </div>
                  ))}
                  {dayPosts.length>2 && <div style={{ fontSize:9, color:"#8888B8" }}>+{dayPosts.length-2} more</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        {[
          ["Scheduled",  posts.filter(p=>p.status==="scheduled").length,  "#7C5CFC"],
          ["Published",  posts.filter(p=>p.status==="published").length,  "#22C55E"],
          ["Failed",     posts.filter(p=>p.status==="failed").length,     "#EF4444"],
          ["Total Posts",posts.length,                                    "#F59E0B"],
        ].map(([label, value, color])=>(
          <div key={label} className="card" style={{ padding:"18px 20px", borderLeft:`3px solid ${color}33` }}>
            <div style={{ fontSize:12, color:"#8888B8", textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>{label}</div>
            <div style={{ fontSize:28, fontWeight:800, color:"#F5F5FF" }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
