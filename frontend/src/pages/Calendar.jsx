import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
function getToken() { return localStorage.getItem("token"); }

const PLATFORM_COLORS = { youtube:"#FF4444", youtube_shorts:"#FF4444", tiktok:"#00E5CC", instagram:"#E040FB" };
const DAYS = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function Calendar() {
  const [today] = useState(new Date());
  const [cur, setCur] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [posts, setPosts] = useState([]);
  const [selected, setSelected] = useState(null);
  useEffect(() => { fetchPosts(); }, [cur.month, cur.year]);

  const fetchPosts = async () => {
    try {
      const r = await fetch(`${API}/api/schedule/calendar?month=${cur.month+1}&year=${cur.year}`, { headers:{ Authorization:`Bearer ${getToken()}` } });
      const d = await r.json();
      setPosts(d.posts || []);
    } catch {}
  };

  const nav = (dir) => setCur(c => {
    let m = c.month + dir, y = c.year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    return { month: m, year: y };
  });

  const firstDay = new Date(cur.year, cur.month, 1).getDay();
  const daysInMonth = new Date(cur.year, cur.month+1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];

  const forDay = (day) => !day ? [] : posts.filter(p => {
    const d = new Date(p.scheduled_for);
    return d.getDate()===day && d.getMonth()===cur.month && d.getFullYear()===cur.year;
  });

  const isToday = (day) => day && today.getDate()===day && today.getMonth()===cur.month && today.getFullYear()===cur.year;
  const selPosts = selected ? forDay(selected) : [];

  const published = posts.filter(p=>p.status==="published").length;
  const scheduled = posts.filter(p=>p.status==="scheduled").length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
      <style>{`
        .cal-cell:hover { border-color: rgba(64,160,192,0.25) !important; background: #111 !important; }
        .cal-cell.sel { border-color: rgba(64,160,192,0.15) !important; background: rgba(64,160,192,0.04) !important; border-left: 2px solid #40A0C0 !important; }
        .cal-nav-btn:hover { border-color: rgba(64,160,192,0.5) !important; color:#40A0C0 !important; }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:16 }}>
        <div>
          <div style={{ fontSize:11, color:"#444", letterSpacing:".2em", textTransform:"uppercase", marginBottom:6 }}>Content Planning</div>
          <h1 style={{ fontSize:36, fontWeight:900, color:"#fff", letterSpacing:"-.04em", lineHeight:1 }}>Calendar</h1>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={()=>nav(-1)} className="cal-nav-btn" style={{ width:40,height:40,background:"#0e0e0e",border:"1px solid #222",borderRadius:8,color:"#666",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",transition:"none" }}>←</button>
          <div style={{ fontSize:20,fontWeight:800,color:"#fff",minWidth:220,textAlign:"center",letterSpacing:"-.02em" }}>
            {MONTHS[cur.month]} {cur.year}
          </div>
          <button onClick={()=>nav(1)} className="cal-nav-btn" style={{ width:40,height:40,background:"#0e0e0e",border:"1px solid #222",borderRadius:8,color:"#666",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",transition:"none" }}>→</button>
        </div>

        <div style={{ display:"flex", gap:24 }}>
          {[["Total", posts.length, "#fff"], ["Published", published, "#22C55E"], ["Scheduled", scheduled, "#aaa"]].map(([label, val, color]) => (
            <div key={label} style={{ textAlign:"center" }}>
              <div style={{ fontSize:26, fontWeight:900, color, lineHeight:1 }}>{val}</div>
              <div style={{ fontSize:10, color:"#444", textTransform:"uppercase", letterSpacing:".1em", marginTop:3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:16, alignItems:"start" }}>
        <div>
          {/* Day headers */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:3 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:700, color:"#333", letterSpacing:".15em", padding:"10px 0" }}>{d}</div>
            ))}
          </div>
          {/* Cells */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
            {cells.map((day, i) => {
              const dp = forDay(day);
              const tod = isToday(day);
              const isSel = selected === day;
              return (
                <div key={i}
                  className={day ? `cal-cell${isSel?" sel":""}` : ""}
                  onClick={() => day && setSelected(isSel ? null : day)}
                  style={{
                    minHeight: 88,
                    background: day ? "#0e0e0e" : "transparent",
                    border: `1px solid ${day ? (tod ? "rgba(255,255,255,0.2)" : "#1a1a1a") : "transparent"}`,
                    borderRadius: 8,
                    padding: 8,
                    cursor: day ? "pointer" : "default",
                    transition: "none",
                    boxShadow: tod ? "0 0 0 1px rgba(255,255,255,0.1), inset 0 0 20px rgba(255,255,255,0.02)" : "none",
                  }}
                >
                  {day && <>
                    <div style={{ fontSize:12, fontWeight: tod?800:400, color: tod?"#fff":"#444", marginBottom:5 }}>
                      {tod ? <span style={{ background:"#fff",color:"#000",borderRadius:4,padding:"1px 5px",fontSize:11,fontWeight:900 }}>{day}</span> : day}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      {dp.slice(0,3).map((p,j) => (
                        <div key={j} style={{ fontSize:9,fontWeight:700,color:"#fff",background:`${PLATFORM_COLORS[p.platform]||"#333"}18`,border:`1px solid ${PLATFORM_COLORS[p.platform]||"#333"}33`,borderRadius:3,padding:"2px 5px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                          <span style={{ color:PLATFORM_COLORS[p.platform]||"#666",marginRight:3 }}>■</span>{p.title}
                        </div>
                      ))}
                      {dp.length>3 && <div style={{ fontSize:9,color:"#444",paddingLeft:2 }}>+{dp.length-3} more</div>}
                    </div>
                  </>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel — always in grid, fades in/out smoothly */}
        <div style={{
          opacity: selected ? 1 : 0,
          transform: selected ? "translateX(0)" : "translateX(14px)",
          transition: "opacity .22s ease, transform .22s ease",
          pointerEvents: selected ? "auto" : "none",
          background:"#0e0e0e", border:"1px solid #1e1e1e", borderRadius:12, padding:18, position:"sticky", top:20,
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>{MONTHS[cur.month].slice(0,3)} {selected}</div>
              <div style={{ fontSize:11, color:"#555", marginTop:2, textTransform:"uppercase", letterSpacing:".1em" }}>{selPosts.length} post{selPosts.length!==1?"s":""}</div>
            </div>
            <button onClick={()=>setSelected(null)} style={{ background:"none",border:"1px solid #222",borderRadius:6,color:"#555",cursor:"pointer",padding:"3px 9px",fontSize:14 }}>×</button>
          </div>
          {selPosts.length===0 ? (
            <div style={{ textAlign:"center",padding:"28px 0",color:"#444",fontSize:13 }}>No posts scheduled</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {selPosts.map((p,i) => (
                <div key={i} style={{ background:"#161616",border:"1px solid #222",borderRadius:8,padding:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:7 }}>
                    <span style={{ fontSize:11,fontWeight:800,color:PLATFORM_COLORS[p.platform]||"#888",background:`${PLATFORM_COLORS[p.platform]||"#333"}18`,padding:"2px 7px",borderRadius:20,textTransform:"uppercase",letterSpacing:".1em" }}>{p.platform}</span>
                    <span style={{ marginLeft:"auto",fontSize:11,color:p.status==="published"?"#22C55E":p.status==="failed"?"#EF4444":"#666" }}>● {p.status}</span>
                  </div>
                  <div style={{ fontSize:14,fontWeight:600,color:"#e0e0e0",marginBottom:4,lineHeight:1.4 }}>{p.title}</div>
                  <div style={{ fontSize:12,color:"#555" }}>{new Date(p.scheduled_for).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
