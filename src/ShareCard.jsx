import { useState } from "react";
import { T } from "./constants.jsx";

function ShareCard({ city, dates, days, moodContext, onClose }) {
  const [copied, setCopied] = useState(false);

  // Clean city name — strip country/state suffixes for display
  const displayCity = city.split(',')[0].trim();

  // Pull top highlights across all days
  const highlights = (days||[]).flatMap(d =>
    (d.slots||[]).filter(s => s.highlight).slice(0,1).map(s => ({ ...s, day: d.day, theme: d.theme }))
  ).slice(0, 3);

  // Mood vibes from context
  const vibes = (moodContext||"").split("\n")
    .flatMap(l => l.split(":")[1]?.split(",").map(v => v.trim()) || [])
    .filter(Boolean).slice(0, 4);

  const dayCount = (days||[]).length;

  // Time-of-day gradient per day
  const gradients = [
    "linear-gradient(145deg,#1a0e00 0%,#4a2c00 50%,#7a4a10 100%)",
    "linear-gradient(145deg,#0a1f14 0%,#1a4028 50%,#2d6040 100%)",
    "linear-gradient(145deg,#0d0514 0%,#2d0a28 50%,#4a0f3a 100%)",
  ];

  const copyText = `✦ WANDR — ${city}\n${dates||""}\n\n` +
    (days||[]).map(d => `Day ${d.day}: ${d.theme}\n${(d.slots||[]).slice(0,3).map(s => `  • ${s.name}`).join("\n")}`).join("\n\n") +
    "\n\nwandr.app ✦";

  const copy = () => {
    navigator.clipboard?.writeText(copyText)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200); })
      .catch(() => {});
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(28,22,18,0.85)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn 0.2s ease"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.cream,borderRadius:"28px 28px 0 0",padding:"16px 16px 40px",width:"100%",maxWidth:480,animation:"slideUp 0.3s ease",fontFamily:"'DM Sans',sans-serif"}}>
        <div style={{width:36,height:4,borderRadius:2,background:T.dust,margin:"0 auto 16px"}}/>

        {/* Travel poster card */}
        <div style={{background:`linear-gradient(160deg,#0d0a06 0%,#1c1206 40%,#2d1f08 100%)`,borderRadius:22,overflow:"hidden",marginBottom:14,position:"relative"}}>

          {/* Ambient glows */}
          <div style={{position:"absolute",top:-40,right:-40,width:220,height:220,borderRadius:"50%",background:"rgba(196,154,60,0.12)",filter:"blur(50px)",pointerEvents:"none"}}/>
          <div style={{position:"absolute",bottom:-60,left:-40,width:180,height:180,borderRadius:"50%",background:"rgba(200,75,47,0.08)",filter:"blur(60px)",pointerEvents:"none"}}/>

          {/* Header */}
          <div style={{padding:"22px 22px 0",position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.22em",color:"rgba(196,154,60,0.8)"}}>✦ WANDR</div>
              {dates && <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontWeight:600}}>{dates}</div>}
            </div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:displayCity.length > 12 ? 32 : 40,fontWeight:900,color:"white",lineHeight:1,marginBottom:6}}>{displayCity}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginBottom:16}}>{dayCount} day{dayCount!==1?"s":""} · AI-planned itinerary</div>

            {/* Vibe pills — single row scroll */}
            {vibes.length > 0 && (
              <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:20,paddingBottom:2}}>
                {vibes.map(v => (
                  <span key={v} style={{flexShrink:0,padding:"3px 10px",borderRadius:20,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600}}>{v}</span>
                ))}
              </div>
            )}
          </div>

          {/* Day cards — fill width for 1-2 days, scroll for 3+ */}
          <div style={{display:"flex",gap:8,padding:"0 16px 20px",overflowX:(days||[]).length > 2 ? "auto" : "visible"}}>
            {(days||[]).slice(0,3).map((d, di) => (
              <div key={d.day} style={{flex:(days||[]).length <= 2 ? 1 : "0 0 150px",minWidth:0,borderRadius:14,overflow:"hidden",background:gradients[di % gradients.length],position:"relative"}}>
                <div style={{padding:"12px 12px 10px"}}>
                  <div style={{fontSize:9,fontWeight:800,letterSpacing:"0.14em",color:T.gold,marginBottom:5}}>DAY {d.day}</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:"white",lineHeight:1.3,marginBottom:8}}>{d.theme}</div>
                  {(d.slots||[]).filter(s=>s.highlight)[0] && (
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",display:"flex",alignItems:"center",gap:4}}>
                      <span style={{color:T.gold,fontSize:9}}>★</span>
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(d.slots||[]).filter(s=>s.highlight)[0]?.name}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",padding:"12px 22px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.2)",fontWeight:600,letterSpacing:"0.1em"}}>PLANNED WITH AI</div>
            <div style={{fontSize:10,color:"rgba(196,154,60,0.5)",fontWeight:700,letterSpacing:"0.1em"}}>WANDR.APP ✦</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{display:"flex",gap:10}}>
          <button onClick={copy}
            style={{flex:1,padding:15,borderRadius:16,background:copied?T.sage:T.ink,border:"none",color:"white",fontSize:14,fontWeight:700,cursor:"pointer",transition:"background 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            {copied ? "✓ Copied!" : "📋 Copy itinerary"}
          </button>
          <button onClick={onClose}
            style={{padding:"15px 18px",borderRadius:16,background:T.paper,border:`1px solid ${T.dust}`,color:T.inkLight,fontSize:14,fontWeight:700,cursor:"pointer"}}>
            Done
          </button>
        </div>
        <div style={{textAlign:"center",marginTop:10,fontSize:11,color:T.inkFaint}}>
          Screenshot this card to share with friends ✦
        </div>
      </div>
    </div>
  );
}

export { ShareCard };