import { useState, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
function hdr() { return { Authorization: `Bearer ${localStorage.getItem("token")}` }; }
function jsonHdr() { return { ...hdr(), "Content-Type": "application/json" }; }

// ── Shared UI helpers ─────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} style={{ padding:"4px 12px", fontSize:12, background: copied ? "#22C55E18" : "transparent", border:`1px solid ${copied?"#22C55E33":"#222"}`, borderRadius:7, color: copied ? "#22C55E" : "#777", cursor:"pointer" }}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function Spinner({ label }) {
  return (
    <div style={{ textAlign:"center", padding:"48px 24px" }}>
      <div style={{ fontSize:28, color:"#40A0C0", animation:"spin 1s linear infinite", display:"inline-block", marginBottom:14 }}>◌</div>
      <div style={{ fontSize:14, color:"#6090A8" }}>{label}</div>
    </div>
  );
}

function ErrBox({ msg, onClose }) {
  if (!msg) return null;
  return (
    <div style={{ padding:"12px 16px", background:"#EF444410", border:"1px solid #EF444422", borderRadius:10, color:"#EF4444", fontSize:13, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      {msg}
      <button onClick={onClose} style={{ background:"none", border:"none", color:"#EF4444", cursor:"pointer", fontSize:18, lineHeight:1 }}>×</button>
    </div>
  );
}

// ── Hook Generator tab ────────────────────────────────────────
function HooksTab() {
  const [topic,    setTopic]    = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [tone,     setTone]     = useState("engaging");
  const [loading,  setLoading]  = useState(false);
  const [hooks,    setHooks]    = useState([]);
  const [err,      setErr]      = useState("");

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true); setErr(""); setHooks([]);
    try {
      const r = await fetch(`${API}/api/tools/hooks`, { method:"POST", headers: jsonHdr(), body: JSON.stringify({ topic, platform, tone }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setHooks(d.hooks || []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div className="card" style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ fontSize:14, color:"#9090B8" }}>Enter your video topic and get 10 viral opening hooks — the first 3 seconds that stop people from scrolling.</div>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && generate()} placeholder="e.g. How I made $10k in 30 days with no experience" className="inp" style={{ flex:2, minWidth:220 }} />
          <select value={platform} onChange={e => setPlatform(e.target.value)} className="inp" style={{ flex:"0 0 130px" }}>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube Shorts</option>
            <option value="instagram">Instagram Reels</option>
          </select>
          <select value={tone} onChange={e => setTone(e.target.value)} className="inp" style={{ flex:"0 0 140px" }}>
            <option value="engaging">Engaging</option>
            <option value="funny">Funny</option>
            <option value="educational">Educational</option>
            <option value="controversial">Controversial</option>
            <option value="inspirational">Inspirational</option>
          </select>
          <button onClick={generate} disabled={!topic.trim() || loading} className="btn-primary" style={{ padding:"0 24px", height:44, fontSize:14, flexShrink:0 }}>
            {loading ? "Generating…" : "✦ Generate Hooks"}
          </button>
        </div>
      </div>

      <ErrBox msg={err} onClose={() => setErr("")} />
      {loading && <Spinner label="Claude is writing your hooks… (a few seconds)" />}

      {hooks.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ fontSize:13, color:"#40A0C0", fontFamily:"'DM Mono',monospace", marginBottom:4 }}>// {hooks.length} hooks generated · 1 credit used</div>
          {hooks.map((h, i) => (
            <div key={i} className="card" style={{ padding:"16px 20px", display:"flex", alignItems:"flex-start", gap:14 }}>
              <div style={{ fontSize:12, fontFamily:"'DM Mono',monospace", color:"#40A0C0", minWidth:24, paddingTop:2 }}>{String(i+1).padStart(2,"0")}</div>
              <div style={{ flex:1, fontSize:14, color:"#D8D8F0", lineHeight:1.65 }}>{h}</div>
              <CopyBtn text={h} />
            </div>
          ))}
          <button onClick={() => { navigator.clipboard.writeText(hooks.join("\n\n")); }} style={{ alignSelf:"flex-end", padding:"8px 20px", fontSize:13, background:"transparent", border:"1px solid #222", borderRadius:9, color:"#777", cursor:"pointer" }}>
            Copy All
          </button>
        </div>
      )}
    </div>
  );
}

// ── Thumbnails tab ────────────────────────────────────────────
function ThumbnailsTab() {
  const [title,   setTitle]   = useState("");
  const [niche,   setNiche]   = useState("");
  const [loading, setLoading] = useState(false);
  const [thumbs,  setThumbs]  = useState([]);
  const [err,     setErr]     = useState("");

  const generate = async () => {
    if (!title.trim()) return;
    setLoading(true); setErr(""); setThumbs([]);
    try {
      const r = await fetch(`${API}/api/tools/thumbnails`, { method:"POST", headers: jsonHdr(), body: JSON.stringify({ title, niche }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setThumbs(d.thumbnails || []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div className="card" style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ fontSize:14, color:"#9090B8" }}>Generate 3 AI thumbnail variants in different styles. Pick your favourite, or A/B test them. 5 credits.</div>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && generate()} placeholder="Video title, e.g. 5 habits that changed my life" className="inp" style={{ flex:2, minWidth:220 }} />
          <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="Niche (optional), e.g. finance" className="inp" style={{ flex:1, minWidth:160 }} />
          <button onClick={generate} disabled={!title.trim() || loading} className="btn-primary" style={{ padding:"0 24px", height:44, fontSize:14, flexShrink:0 }}>
            {loading ? "Generating…" : "◈ Generate 3 Thumbnails"}
          </button>
        </div>
      </div>

      <ErrBox msg={err} onClose={() => setErr("")} />
      {loading && <Spinner label="Generating 3 thumbnail variants with SDXL… (~30 seconds)" />}

      {thumbs.length > 0 && (
        <div>
          <div style={{ fontSize:13, color:"#40A0C0", fontFamily:"'DM Mono',monospace", marginBottom:12 }}>// 3 variants generated · 5 credits used</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
            {thumbs.map((t, i) => (
              <div key={i} className="card" style={{ overflow:"hidden" }}>
                <img src={t.url} alt={t.label} style={{ width:"100%", aspectRatio:"16/9", objectFit:"cover", display:"block" }} onError={e => e.currentTarget.style.display="none"} />
                <div style={{ padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#D0D0E8" }}>{t.label}</div>
                  <a href={t.url} download={`thumbnail-${t.label.toLowerCase().replace(/ /g,"-")}.png`} style={{ fontSize:12, color:"#40A0C0", textDecoration:"none", border:"1px solid #1e3040", borderRadius:7, padding:"4px 12px" }}>⬇ Download</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Captions tab ──────────────────────────────────────────────
function CaptionsTab() {
  const [file,     setFile]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [srt,      setSrt]      = useState("");
  const [transcript, setTranscript] = useState("");
  const [err,      setErr]      = useState("");
  const inputRef = useRef();

  const generate = async () => {
    if (!file) return;
    setLoading(true); setErr(""); setSrt(""); setTranscript("");
    const fd = new FormData();
    fd.append("video", file);
    try {
      const r = await fetch(`${API}/api/tools/captions`, { method:"POST", headers: hdr(), body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSrt(d.srt || "");
      setTranscript(d.transcript || "");
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const downloadSrt = () => {
    const blob = new Blob([srt], { type:"text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "captions.srt"; a.click();
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div className="card" style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ fontSize:14, color:"#9090B8" }}>Upload a video and get auto-generated captions as an SRT file — ready to import into TikTok, YouTube, or Premiere. 3 credits.</div>
        <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
          <input ref={inputRef} type="file" accept="video/*,audio/*" style={{ display:"none" }} onChange={e => setFile(e.target.files[0] || null)} />
          <button onClick={() => inputRef.current.click()} className="btn-ghost" style={{ padding:"10px 22px", fontSize:14 }}>
            {file ? `✓ ${file.name}` : "Choose Video"}
          </button>
          {file && <span style={{ fontSize:12, color:"#555" }}>{(file.size / 1024 / 1024).toFixed(1)} MB</span>}
          <button onClick={generate} disabled={!file || loading} className="btn-primary" style={{ padding:"10px 24px", fontSize:14 }}>
            {loading ? "Transcribing…" : "⊙ Generate Captions"}
          </button>
        </div>
        <div style={{ fontSize:12, color:"#555" }}>Max 200 MB · supports MP4, MOV, MKV, MP3, WAV</div>
      </div>

      <ErrBox msg={err} onClose={() => setErr("")} />
      {loading && <Spinner label="Whisper AI is transcribing your video… (1–3 minutes depending on length)" />}

      {srt && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ fontSize:13, color:"#40A0C0", fontFamily:"'DM Mono',monospace" }}>// captions generated · 3 credits used</div>
          <div className="card" style={{ padding:20 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#e0e0e0" }}>SRT Captions</div>
              <div style={{ display:"flex", gap:10 }}>
                <CopyBtn text={srt} />
                <button onClick={downloadSrt} style={{ padding:"4px 14px", fontSize:12, background:"#40A0C015", border:"1px solid #40A0C033", borderRadius:7, color:"#40A0C0", cursor:"pointer" }}>⬇ Download .srt</button>
              </div>
            </div>
            <pre style={{ fontSize:12, color:"#8888B8", lineHeight:1.7, maxHeight:300, overflowY:"auto", background:"#0a0a0a", padding:16, borderRadius:10, fontFamily:"'DM Mono',monospace", whiteSpace:"pre-wrap" }}>
              {srt.slice(0, 2000)}{srt.length > 2000 ? "\n…(truncated)" : ""}
            </pre>
          </div>
          {transcript && (
            <div className="card" style={{ padding:20 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <div style={{ fontSize:15, fontWeight:700, color:"#e0e0e0" }}>Plain Transcript</div>
                <CopyBtn text={transcript} />
              </div>
              <div style={{ fontSize:14, color:"#9090B8", lineHeight:1.8, maxHeight:200, overflowY:"auto" }}>{transcript}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Repurpose tab ─────────────────────────────────────────────
function RepurposeTab() {
  const [file,    setFile]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [clips,   setClips]   = useState([]);
  const [err,     setErr]     = useState("");
  const inputRef = useRef();

  const generate = async () => {
    if (!file) return;
    setLoading(true); setErr(""); setClips([]);
    const fd = new FormData();
    fd.append("video", file);
    try {
      const r = await fetch(`${API}/api/tools/repurpose`, { method:"POST", headers: hdr(), body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setClips(d.clips || []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div className="card" style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ fontSize:14, color:"#9090B8" }}>Upload a long video — podcast, vlog, interview. AI transcribes it, picks the 5 most viral moments, and cuts them into ready-to-post clips. 10 credits.</div>
        <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
          <input ref={inputRef} type="file" accept="video/*" style={{ display:"none" }} onChange={e => setFile(e.target.files[0] || null)} />
          <button onClick={() => inputRef.current.click()} className="btn-ghost" style={{ padding:"10px 22px", fontSize:14 }}>
            {file ? `✓ ${file.name}` : "Choose Video"}
          </button>
          {file && <span style={{ fontSize:12, color:"#555" }}>{(file.size / 1024 / 1024).toFixed(1)} MB</span>}
          <button onClick={generate} disabled={!file || loading} className="btn-primary" style={{ padding:"10px 24px", fontSize:14 }}>
            {loading ? "Processing…" : "⚡ Find Best Clips"}
          </button>
        </div>
        <div style={{ fontSize:12, color:"#555" }}>Max 200 MB · best results with 5–60 min videos</div>
      </div>

      <ErrBox msg={err} onClose={() => setErr("")} />
      {loading && (
        <div style={{ textAlign:"center", padding:"48px 24px" }}>
          <div style={{ fontSize:28, color:"#40A0C0", animation:"spin 1s linear infinite", display:"inline-block", marginBottom:14 }}>◌</div>
          <div style={{ fontSize:15, fontWeight:700, color:"#D0D0E8", marginBottom:8 }}>Processing your video…</div>
          <div style={{ fontSize:13, color:"#6090A8" }}>Transcribing → AI finding best moments → Cutting clips</div>
          <div style={{ fontSize:12, color:"#555", marginTop:6 }}>This takes 3–8 minutes depending on video length. Don't close this tab.</div>
        </div>
      )}

      {clips.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ fontSize:13, color:"#40A0C0", fontFamily:"'DM Mono',monospace" }}>// {clips.length} clips extracted · 10 credits used</div>
          {clips.map((c, i) => (
            <div key={i} className="card" style={{ padding:20, display:"flex", gap:18, alignItems:"flex-start", flexWrap:"wrap" }}>
              <video src={c.url} controls style={{ width:240, height:135, borderRadius:10, background:"#000", objectFit:"cover", flexShrink:0 }} />
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ fontSize:15, fontWeight:700, color:"#E0E0F8", marginBottom:6 }}>{c.title}</div>
                <div style={{ fontSize:13, color:"#40A0C0", marginBottom:8, fontStyle:"italic" }}>"{c.hook}"</div>
                <div style={{ fontSize:12, color:"#555", marginBottom:14 }}>{c.duration}s · ready for TikTok / Reels / Shorts</div>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  <a href={c.url} download={`clip-${i+1}.mp4`} className="btn-primary" style={{ padding:"8px 20px", fontSize:13, textDecoration:"none", display:"inline-block" }}>⬇ Download</a>
                  <CopyBtn text={c.hook} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
const TABS = [
  ["hooks",      "✦", "Hook Generator",  "10 viral hooks · 1 credit"],
  ["thumbnails", "◈", "A/B Thumbnails",  "3 AI thumbnail variants · 5 credits"],
  ["captions",   "⊙", "Auto Captions",   "SRT file from any video · 3 credits"],
  ["repurpose",  "⚡", "Repurpose Video", "5 viral clips from long video · 10 credits"],
];

export default function Tools({ user }) {
  const [tab, setTab] = useState("hooks");

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
      <div>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em", fontFamily:"'DM Mono',monospace" }}>
          <span style={{ color:"#40A0C0", fontWeight:400 }}>/</span> AI_Tools
        </h1>
        <p style={{ color:"#9090B8", fontSize:15, marginTop:5 }}>Hooks · Thumbnails · Captions · Repurpose — everything to maximise reach without extra effort</p>
      </div>

      {/* Tab bar */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:8 }}>
        {TABS.map(([id, ic, label, sub]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:"14px 16px", borderRadius:12, border:`1.5px solid ${tab===id?"#40A0C0":"#1a1a1a"}`,
            background: tab===id ? "#40A0C012" : "#111",
            cursor:"pointer", textAlign:"left", transition:"none",
          }}>
            <div style={{ fontSize:18, marginBottom:6, color: tab===id?"#40A0C0":"#555" }}>{ic}</div>
            <div style={{ fontSize:14, fontWeight:700, color: tab===id?"#E0E0F8":"#888", marginBottom:3 }}>{label}</div>
            <div style={{ fontSize:11, color:"#555", fontFamily:"'DM Mono',monospace" }}>{sub}</div>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "hooks"      && <HooksTab      user={user} />}
      {tab === "thumbnails" && <ThumbnailsTab user={user} />}
      {tab === "captions"   && <CaptionsTab   user={user} />}
      {tab === "repurpose"  && <RepurposeTab  user={user} />}
    </div>
  );
}
