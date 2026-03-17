import { DAYS, GLOBAL_CSS, NAV_H, T, VIBE_COLORS_MAP } from "./constants.jsx";
function SavedTripsScreen({ savedTrips, onOpenTrip, onPlanNew }) {
  const VIBE_C = VIBE_COLORS_MAP;

  const getVibes = (moodCtx) => {
    if (!moodCtx) return [];
    const all = [];
    (moodCtx || "").split("\n").forEach(line => {
      line.split(":")[1]?.split(",").map(v=>v.trim()).filter(Boolean).forEach(v => { if(!all.includes(v)) all.push(v); });
    });
    return all.slice(0, 5);
  };

  if (savedTrips.length === 0) return (
    <div style={{minHeight:"100vh",background:T.cream,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:32,fontFamily:"'DM Sans',sans-serif",paddingBottom:NAV_H}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:56,color:T.dust,lineHeight:1}}>✦</div>
      <div style={{fontSize:18,fontWeight:700,color:T.ink}}>No trips yet</div>
      <div style={{fontSize:14,color:T.inkFaint,textAlign:"center",lineHeight:1.6,maxWidth:240}}>Build your first itinerary and save it — it'll live here.</div>
      <button onClick={onPlanNew}
        style={{padding:"14px 28px",borderRadius:16,background:`linear-gradient(135deg,${T.accent},#9b2020)`,border:"none",color:T.white,fontSize:14,fontWeight:700,cursor:"pointer",marginTop:8,boxShadow:"0 6px 20px rgba(200,75,47,0.25)"}}>
        Plan a trip ✦
      </button>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:T.cream,fontFamily:"'DM Sans',sans-serif",paddingBottom:NAV_H+20}}>
      <style>{GLOBAL_CSS}</style>

      {/* Header */}
      <div style={{background:`linear-gradient(160deg,${T.ink} 0%,#2d1f10 100%)`,padding:"52px 20px 24px"}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(196,154,60,0.7)",marginBottom:10}}>✦ YOUR TRIPS</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:700,color:T.white,marginBottom:4}}>{savedTrips.length} trip{savedTrips.length!==1?"s":""} planned.</h1>
        <p style={{fontSize:13,color:"rgba(255,255,255,0.35)"}}>Tap a trip to view or continue planning.</p>
      </div>

      {/* Trip cards */}
      <div style={{padding:"16px 16px 0"}}>
        {savedTrips.map((trip, i) => {
          const vibes = getVibes(trip.moodContext || trip.mood_context);
          const days = trip.days || [];
          const savedDate = trip.savedAt ? new Date(trip.savedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "";

          return (
            <div key={i} style={{background:T.white,borderRadius:22,overflow:"hidden",marginBottom:14,boxShadow:"0 4px 20px rgba(28,22,18,0.08)",animation:`fadeUp 0.4s ease ${i*0.06}s both`,border:`1px solid ${T.dust}`}}>

              {/* Card header */}
              <div style={{background:`linear-gradient(135deg,${T.ink},#2d1f10)`,padding:"20px 20px 16px",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:-10,right:-10,fontSize:80,opacity:0.05}}>✦</div>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:T.white,lineHeight:1.2}}>{trip.city}</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:4}}>{trip.dates || "No dates set"}</div>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.08)",borderRadius:12,padding:"6px 12px",textAlign:"center"}}>
                    <div style={{fontSize:18,fontWeight:800,color:T.white,lineHeight:1}}>{days.length}</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",fontWeight:700,letterSpacing:"0.06em"}}>DAYS</div>
                  </div>
                </div>

                {/* Day themes preview */}
                {days.length > 0 && (
                  <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:4}}>
                    {days.slice(0,2).map((day,j)=>(
                      <div key={j} style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:10,fontWeight:700,color:T.gold,minWidth:36}}>Day {day.day}</span>
                        <span style={{fontSize:12,fontStyle:"italic",color:"rgba(255,255,255,0.6)",fontFamily:"'Playfair Display',serif"}}>{day.theme}</span>
                      </div>
                    ))}
                    {days.length > 2 && (
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.25)",marginTop:2}}>+{days.length-2} more days</div>
                    )}
                  </div>
                )}
              </div>

              {/* Vibes */}
              {vibes.length > 0 && (
                <div style={{padding:"12px 18px 0",display:"flex",flexWrap:"wrap",gap:6}}>
                  {vibes.map(v => {
                    const key = v.toLowerCase().replace(/ /g,"-");
                    const color = VIBE_C[key] || T.inkFaint;
                    return (
                      <span key={v} style={{padding:"4px 10px",borderRadius:10,background:`${color}15`,fontSize:11,fontWeight:700,color}}>
                        {v}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Actions */}
              <div style={{padding:"12px 18px 16px",display:"flex",gap:8,alignItems:"center"}}>
                <button onClick={()=>onOpenTrip(trip)}
                  style={{flex:1,padding:"11px 0",borderRadius:13,background:`linear-gradient(135deg,${T.accent},#9b2020)`,border:"none",color:T.white,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 14px rgba(200,75,47,0.2)"}}>
                  View itinerary →
                </button>
                {savedDate && <div style={{fontSize:11,color:T.inkFaint,flexShrink:0}}>{savedDate}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// AUTH SCREEN — Magic link login
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// TRIP CARD — used in social feed
// ─────────────────────────────────────────────


export { SavedTripsScreen };