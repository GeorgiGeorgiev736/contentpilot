export default function AIPanel({ output, loading, streaming, placeholder = "Run AI analysis to see results", minHeight = 300 }) {
  return (
    <div className="ai-out" style={{ minHeight, maxHeight: 560, overflowY: "auto" }}>
      {!output && loading && (
        <div style={{ display:"flex", alignItems:"center", gap:10, color:"#2A2A4A", padding:"20px 0" }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:"#7C5CFC", animation:"shimmer 1s ease infinite", display:"inline-block", flexShrink:0 }} />
          Analyzing…
        </div>
      )}
      {!output && !loading && (
        <div style={{ color:"#1E1E32", textAlign:"center", padding:"40px 0" }}>{placeholder}</div>
      )}
      {output && output}
      {streaming && <span className="cursor">▋</span>}
    </div>
  );
}
