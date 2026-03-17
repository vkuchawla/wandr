import { useState } from "react";
import { T, GLOBAL_CSS, NAV_H, VIBES, VIBE_CATEGORIES } from "./constants.jsx";
import { parseTripDays } from "./utils.jsx";
function getVibesFromProfile(profile, dayCount) {
  if (!profile?.answers) return Array(dayCount).fill([]);
  const a = profile.answers;
  const vibes = [];

  // Pace
  if (a.pace === "slow" || a.sleep === "late") vibes.push("slow-morning");
  if (a.pace === "slow" || a.vibe === "relax") vibes.push("chill-afternoon");

  // Food
  if (a.food === "everything") { vibes.push("splurge-dinner"); vibes.push("street-food"); }
  if (a.food === "important") vibes.push("street-food");

  // Budget
  if (a.budget === "luxury") { if (!vibes.includes("splurge-dinner")) vibes.push("splurge-dinner"); }
  if (a.budget === "budget") vibes.push("street-food");

  // Style
  if (a.style === "spontaneous" || a.vibe === "immerse") vibes.push("local-weird");
  if (a.vibe === "explore") { vibes.push("cultural"); vibes.push("adventurous"); }

  // Companions
  if (a.companions === "solo") { vibes.push("local-weird"); vibes.push("cultural"); }
  if (a.companions === "partner") vibes.push("splurge-dinner");

  // Crowd
  if (a.crowd === "love") vibes.push("nightlife");
  if (a.crowd === "hate") vibes.push("nature");

  // Deduplicate
  const unique = [...new Set(vibes)].slice(0, 4);

  // Apply same vibes to all days as starting point
  return Array(dayCount).fill(null).map(() => [...unique]);
}

function MoodBoard({ city, dates, onBuild, onBack, profile, remixContext }) {
  const tripDays  = parseTripDays(dates);

  const initBoard = () => {
    // If remixing, parse vibes from the remixed trip's mood context
    if (remixContext) {
      const lines = remixContext.split("\n").filter(Boolean);
      return tripDays.map((_, i) => {
        const line = lines[i] || "";
        const vibeLabels = line.split(":")[1]?.split(",").map(v=>v.trim()).filter(Boolean) || [];
        return vibeLabels.map(label => {
          const found = VIBES.find(v => v.label.toLowerCase() === label.toLowerCase());
          return found?.id;
        }).filter(Boolean);
      });
    }
    return getVibesFromProfile(profile, tripDays.length);
  };

  const [board, setBoard] = useState(initBoard);
  const [activeDay, setActiveDay] = useState(0);
  const [justAdded, setJustAdded] = useState(null);

  const toggleVibe = (vibeId) => {
    setBoard(prev=>{
      const next=prev.map(d=>[...d]);
      next[activeDay]=next[activeDay].includes(vibeId)
        ? next[activeDay].filter(v=>v!==vibeId)
        : [...next[activeDay], vibeId];
      return next;
    });
    setJustAdded(vibeId);
    setTimeout(()=>setJustAdded(null),350);
  };

  const removeVibe = (dayIdx, vibeId) => {
    setBoard(prev=>{const next=prev.map(d=>[...d]);next[dayIdx]=next[dayIdx].filter(v=>v!==vibeId);return next;});
  };

  const totalVibes = board.reduce((s,d)=>s+d.length,0);
  const buildContext = () => tripDays.map((day,i)=>{
    const vibes=board[i].map(id=>VIBES.find(v=>v.id===id)?.label).filter(Boolean);
    return `${day}: ${vibes.length?vibes.join(", "):"open / flexible"}`;
  }).join("\n");

  return (
    <div style={{minHeight:"100vh",background:T.cream,fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{GLOBAL_CSS}</style>

      {/* Header */}
      <div style={{padding:"50px 22px 16px",background:T.cream}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:T.inkFaint,fontSize:13,fontWeight:600,cursor:"pointer",marginBottom:18,padding:0,display:"flex",alignItems:"center",gap:4}}>
          ← {city}
        </button>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",color:T.gold,marginBottom:8}}>✦ MOOD BOARD</div>
        {remixContext && (
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(200,75,47,0.1)",border:`1px solid ${T.accent}40`,borderRadius:20,padding:"5px 12px",marginBottom:8}}>
            <span style={{fontSize:12}}>✦</span>
            <span style={{fontSize:12,color:T.accent,fontWeight:700}}>Remixing a trip — vibes pre-filled</span>
          </div>
        )}
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:700,color:T.ink,lineHeight:1.15,marginBottom:6}}>
          Set the <em style={{fontWeight:400,color:T.accent}}>mood.</em>
        </h1>
        <p style={{fontSize:13,color:T.inkFaint,lineHeight:1.6}}>Pick a day tab, then tap vibes to add them.</p>
        {profile?.answers && (
          <div style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:8,background:T.paper,border:`1px solid ${T.dust}`,borderRadius:20,padding:"5px 12px"}}>
            <span style={{fontSize:12}}>✦</span>
            <span style={{fontSize:12,color:T.inkLight,fontWeight:600}}>Pre-filled from your travel style</span>
          </div>
        )}
      </div>

      {/* Day tabs */}
      <div style={{padding:"0 20px 4px",display:"flex",gap:8,overflowX:"auto"}}>
        {tripDays.map((day,i)=>{
          const count=board[i].length, active=activeDay===i;
          return (
            <button key={day} onClick={()=>setActiveDay(i)}
              style={{flexShrink:0,padding:"8px 14px",borderRadius:24,border:`2px solid ${active?T.ink:T.dust}`,background:active?T.ink:T.white,color:active?T.white:T.inkLight,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all 0.15s"}}>
              {day}
              {count>0&&<span style={{background:active?"rgba(255,255,255,0.2)":T.accent,color:T.white,borderRadius:10,padding:"1px 7px",fontSize:11}}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Selected vibes for active day */}
      <div style={{padding:"12px 22px 8px",minHeight:52}}>
        {board[activeDay].length===0
          ? <div style={{color:T.inkFaint,fontSize:13,fontStyle:"italic",padding:"8px 0"}}>Tap vibes below ↓</div>
          : <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
              {board[activeDay].map(id=>{
                const v=VIBES.find(x=>x.id===id); if(!v) return null;
                return (
                  <div key={id} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",borderRadius:20,background:v.bg,border:`1.5px solid ${v.color}50`,animation:"fadeUp 0.2s ease"}}>
                    <span style={{fontSize:14}}>{v.emoji}</span>
                    <span style={{fontSize:12,fontWeight:700,color:v.color}}>{v.label}</span>
                    <button onClick={()=>removeVibe(activeDay,id)} style={{background:"none",border:"none",cursor:"pointer",color:v.color,fontSize:14,padding:"0 0 0 2px",lineHeight:1,fontWeight:700}}>×</button>
                  </div>
                );
              })}
            </div>
        }
      </div>

      <div style={{height:1,background:T.dust,margin:"0 22px 14px"}}/>

      {/* Vibe grid — categorized */}
      <div style={{padding:"0 20px",flex:1,paddingBottom:8}}>
        {VIBE_CATEGORIES.map(cat=>{
          const vibes = cat.ids.map(id=>VIBES.find(v=>v.id===id)).filter(Boolean);
          return (
            <div key={cat.label} style={{marginBottom:18}}>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.inkFaint,marginBottom:9}}>{cat.label}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {vibes.map(vibe=>{
                  const selected=board[activeDay].includes(vibe.id);
                  const popping=justAdded===vibe.id;
                  return (
                    <button key={vibe.id} onClick={()=>toggleVibe(vibe.id)}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"11px 13px",borderRadius:14,border:`2px solid ${selected?vibe.color:vibe.color+"22"}`,background:selected?vibe.color:vibe.bg,cursor:"pointer",textAlign:"left",animation:popping?"pop 0.35s ease":undefined,transition:"border-color 0.15s, background 0.15s"}}>
                      <span style={{fontSize:20,lineHeight:1}}>{vibe.emoji}</span>
                      <span style={{fontSize:12,fontWeight:700,color:selected?T.white:vibe.color,flex:1,lineHeight:1.3}}>{vibe.label}</span>
                      {selected&&<span style={{color:"rgba(255,255,255,0.8)",fontSize:13,fontWeight:700}}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Build bar */}
      <div style={{position:"sticky",bottom:0,padding:"14px 22px 28px",background:`linear-gradient(to top,${T.cream} 70%,transparent)`,paddingBottom:NAV_H+8}}>
        {totalVibes>0&&<div style={{textAlign:"center",fontSize:12,color:T.inkFaint,marginBottom:8,fontStyle:"italic"}}>{totalVibes} vibe{totalVibes!==1?"s":""} across {board.filter(d=>d.length>0).length} day{board.filter(d=>d.length>0).length!==1?"s":""}</div>}
        <button onClick={()=>totalVibes>0&&onBuild(buildContext())} disabled={totalVibes===0}
          style={{width:"100%",padding:17,borderRadius:16,background:totalVibes>0?`linear-gradient(135deg,${T.ink},#2d1f10)`:T.dust,border:"none",color:totalVibes>0?T.cream:T.inkFaint,fontSize:15,fontWeight:800,cursor:totalVibes>0?"pointer":"default",boxShadow:totalVibes>0?"0 8px 28px rgba(28,22,18,0.2)":"none",transition:"all 0.2s",letterSpacing:"0.02em"}}>
          {totalVibes===0?"Add some vibes to build →":"Build my itinerary ✦"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AI ITINERARY
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// MOMENT CARDS — Stories-style swipeable slots
// ─────────────────────────────────────────────
export { MoodBoard };