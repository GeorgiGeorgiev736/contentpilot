import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { user as userApi, billing } from "../services/api";

export default function Account({ setPage }) {
  const { user, logout, refreshUser } = useAuth();
  const [name,    setName]    = useState(user?.name || "");
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [usage,   setUsage]   = useState(null);

  useEffect(() => {
    userApi.usage().then(setUsage).catch(() => {});
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await userApi.updateName(name);
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert(e.message);
    }
    setSaving(false);
  };

  const openBilling = async () => {
    try {
      const { url } = await billing.portal();
      window.location.href = url;
    } catch {
      setPage("pricing");
    }
  };

  const planColor = { free:"#F59E0B", starter:"#3B82F6", pro:"#7C5CFC", agency:"#22C55E" };
  const col = planColor[user?.plan || "free"] || "#F59E0B";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:22, maxWidth:700 }}>
      <div>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#F5F5FF", letterSpacing:"-.04em" }}>Account Settings</h1>
        <p style={{ color:"#9090B8", fontSize:15, marginTop:5 }}>Manage your profile, billing, and usage</p>
      </div>

      {/* Profile */}
      <div className="card" style={{ padding:24 }}>
        <div style={{ fontSize:15, fontWeight:700, color:"#D0D0F0", marginBottom:18 }}>Profile</div>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:22 }}>
          <div style={{ width:56, height:56, borderRadius:"50%", background:"linear-gradient(135deg,#7C5CFC,#B45AFD)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:700, color:"#fff", flexShrink:0 }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:600, color:"#E0E0F0" }}>{user?.name}</div>
            <div style={{ fontSize:13, color:"#8888B8", marginTop:2 }}>{user?.email}</div>
          </div>
          <div style={{ marginLeft:"auto" }}>
            <span style={{ fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:20, background:`${col}18`, color:col, textTransform:"uppercase", letterSpacing:".05em", border:`1px solid ${col}33` }}>
              {user?.plan || "free"} plan
            </span>
          </div>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, color:"#8888B8", display:"block", marginBottom:6 }}>Display Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} className="inp"/>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:12, color:"#8888B8", display:"block", marginBottom:6 }}>Email Address</label>
          <input value={user?.email || ""} readOnly className="inp" style={{ opacity:.5, cursor:"not-allowed" }}/>
        </div>
        <button onClick={saveProfile} disabled={saving||!name} className="btn-primary" style={{ padding:"10px 24px", fontSize:13 }}>
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Plan & billing */}
      <div className="card" style={{ padding:24 }}>
        <div style={{ fontSize:15, fontWeight:700, color:"#D0D0F0", marginBottom:18 }}>Plan & Billing</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:20 }}>
          <div style={{ background:"#080810", borderRadius:10, padding:16, border:"1px solid #10102A" }}>
            <div style={{ fontSize:13, color:"#8888B8", marginBottom:4 }}>Current Plan</div>
            <div style={{ fontSize:18, fontWeight:700, color:col, textTransform:"capitalize" }}>{user?.plan || "free"}</div>
          </div>
          <div style={{ background:"#080810", borderRadius:10, padding:16, border:"1px solid #10102A" }}>
            <div style={{ fontSize:13, color:"#8888B8", marginBottom:4 }}>AI Credits Left</div>
            <div style={{ fontSize:18, fontWeight:700, color:"#E0E0F0" }}>
              {user?.credits || 0}
            </div>
          </div>
          <div style={{ background:"#080810", borderRadius:10, padding:16, border:"1px solid #10102A" }}>
            <div style={{ fontSize:13, color:"#8888B8", marginBottom:4 }}>Status</div>
            <div style={{ fontSize:18, fontWeight:700, color: user?.subscription_status === "active" ? "#22C55E" : "#F59E0B", textTransform:"capitalize" }}>
              {user?.subscription_status || "Free"}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {user?.plan === "free"
            ? <button onClick={()=>setPage("pricing")} className="btn-primary" style={{ padding:"10px 22px", fontSize:13 }}>⚡ Upgrade Plan</button>
            : <button onClick={openBilling} className="btn-ghost" style={{ padding:"10px 22px", fontSize:13 }}>Manage Billing →</button>
          }
          {user?.plan !== "free" && (
            <button onClick={()=>setPage("pricing")} className="btn-ghost" style={{ padding:"10px 22px", fontSize:13 }}>View Plans</button>
          )}
        </div>
      </div>

      {/* Usage */}
      {usage && (
        <div className="card" style={{ padding:24 }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#D0D0F0", marginBottom:18 }}>AI Usage This Month</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            <div style={{ background:"#080810", borderRadius:10, padding:16, border:"1px solid #10102A" }}>
              <div style={{ fontSize:13, color:"#8888B8", marginBottom:4 }}>Total Requests</div>
              <div style={{ fontSize:22, fontWeight:700, color:"#E0E0F0" }}>{usage.total?.total_requests || 0}</div>
            </div>
            <div style={{ background:"#080810", borderRadius:10, padding:16, border:"1px solid #10102A" }}>
              <div style={{ fontSize:13, color:"#8888B8", marginBottom:4 }}>Total Tokens</div>
              <div style={{ fontSize:22, fontWeight:700, color:"#E0E0F0" }}>{parseInt(usage.total?.total_tokens || 0).toLocaleString()}</div>
            </div>
          </div>
          {usage.usage?.length > 0 && (
            <div>
              <div style={{ fontSize:12, color:"#7878A8", textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>By Feature</div>
              {usage.usage.map(u => (
                <div key={u.feature} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #0A0A18" }}>
                  <span style={{ fontSize:13, color:"#B0B0CC", textTransform:"capitalize" }}>{u.feature.replace(/_/g," ")}</span>
                  <span style={{ fontSize:13, color:"#9898C0" }}>{u.count} requests</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Danger zone */}
      <div className="card" style={{ padding:24, borderColor:"#EF444422" }}>
        <div style={{ fontSize:15, fontWeight:700, color:"#D0D0F0", marginBottom:14 }}>Account Actions</div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button
            onClick={() => { localStorage.removeItem("autopilot_tutorial_v1"); window.location.reload(); }}
            style={{ padding:"10px 20px", background:"#7C5CFC08", border:"1px solid #7C5CFC22", borderRadius:10, color:"#B09FFF", cursor:"pointer", fontSize:13, fontWeight:600 }}
          >
            ◎ Replay Tutorial
          </button>
          <button onClick={logout} style={{ padding:"10px 20px", background:"#EF444408", border:"1px solid #EF444422", borderRadius:10, color:"#EF4444", cursor:"pointer", fontSize:13, fontWeight:600 }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
