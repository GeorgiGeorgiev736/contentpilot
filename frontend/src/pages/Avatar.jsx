export default function Avatar() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
      <div>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em" }}>AI Avatar</h1>
        <p style={{ color:"#9090B8", fontSize:15, marginTop:5 }}>Generate a realistic AI avatar for your brand</p>
      </div>

      <div className="card" style={{ padding:48, textAlign:"center" }}>
        <div style={{ fontSize:64, marginBottom:16 }}>◉</div>
        <div style={{ fontSize:20, fontWeight:700, color:"#E0E0F8", marginBottom:8 }}>AI Avatar Studio</div>
        <div style={{ fontSize:14, color:"#8888B8", maxWidth:480, margin:"0 auto", lineHeight:1.7 }}>
          Create a photorealistic AI avatar that speaks your scripts, presents your content, and represents your brand — no camera needed.
        </div>
        <div style={{ marginTop:28, display:"flex", flexWrap:"wrap", gap:12, justifyContent:"center" }}>
          {["Custom face generation","Script-to-video","Multi-language support","Brand voice cloning"].map(f => (
            <span key={f} style={{ background:"#7C5CFC15", color:"#B09FFF", border:"1px solid #7C5CFC33", fontSize:12, fontWeight:600, padding:"5px 14px", borderRadius:20 }}>{f}</span>
          ))}
        </div>
        <div style={{ marginTop:32, padding:"14px 22px", background:"#F59E0B10", border:"1px solid #F59E0B30", borderRadius:12, display:"inline-block" }}>
          <span style={{ fontSize:13, color:"#D4943A", fontWeight:600 }}>⚡ Coming soon — upgrading to a Pro plan will give you early access</span>
        </div>
      </div>
    </div>
  );
}
