import { useState, useRef } from "react";
import { NAV_H, T, TRANSIT_COLORS, TRANSIT_ICONS } from "./constants.jsx";
function MomentCards({ day, activeDay, ratings, activeSlot, checkIn, checkOut, setSelectedPlace, BUCKET_COLORS, getBucket, TRANSIT_ICONS, TRANSIT_COLORS, onUpdateSlots }) {
  const [activeSlotIdx, setActiveSlotIdx] = useState(0);
  const [editingTime, setEditingTime] = useState(false);
  const [timeInput, setTimeInput] = useState("");
  const [timeValidating, setTimeValidating] = useState(false);
  const [timeMsg, setTimeMsg] = useState(null);
  const slots = day.slots || [];
  const slot = slots[activeSlotIdx];
  const slotKey = `${activeDay}-${activeSlotIdx}`;
  const isActive = activeSlot === slotKey;
  const rating = ratings[slotKey];
  const isCompleted = rating !== undefined;
  const bc = BUCKET_COLORS[getBucket(slot?.time)];

  const openTimeEdit = (e) => {
    e.stopPropagation();
    setTimeInput(slot.time || "");
    setTimeMsg(null);
    setEditingTime(true);
  };

  const validateTime = async () => {
    if (!timeInput.trim()) return;
    setTimeValidating(true);
    setTimeMsg(null);
    try {
      const res = await fetch("https://wandr-62i6.onrender.com/validate-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot: { name: slot.name, time: slot.time, end_time: slot.end_time, category: slot.category },
          newTime: timeInput.trim(),
          allSlots: slots.map(s => ({ name: s.name, time: s.time, end_time: s.end_time }))
        })
      });
      const data = await res.json();
      if (data.feasible) {
        // Apply the time change
        const updatedSlots = slots.map((s, i) =>
          i === activeSlotIdx ? { ...s, time: data.newTime || timeInput, end_time: data.newEndTime || s.end_time } : s
        );
        onUpdateSlots(updatedSlots);
        setTimeMsg({ type: "ok", text: data.message });
        setTimeout(() => { setEditingTime(false); setTimeMsg(null); }, 1500);
      } else {
        setTimeMsg({ type: "warn", text: data.message });
      }
    } catch(e) {
      setTimeMsg({ type: "warn", text: "Couldn't validate — try again." });
    }
    setTimeValidating(false);
  };

  // Touch swipe handling
  const touchStartX = useRef(null);
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && activeSlotIdx < slots.length-1) setActiveSlotIdx(i=>i+1);
      if (diff < 0 && activeSlotIdx > 0) setActiveSlotIdx(i=>i-1);
    }
    touchStartX.current = null;
  };

  // Progress dots colors by bucket
  const bucketGradients = {
    morning: "linear-gradient(135deg,#f5e6c8,#e8c97a)",
    afternoon: "linear-gradient(135deg,#c8e8d4,#4a7c59)",
    evening: "linear-gradient(135deg,#2d1a2d,#8b1a4a)"
  };
  const bucket = getBucket(slot?.time);
  const cardBg = isCompleted ? "#f0f0f0" : isActive ? T.sage : slot?.highlight ? T.ink : bucketGradients[bucket] || T.white;
  const textColor = (slot?.highlight || isActive || bucket==="evening") && !isCompleted ? "white" : T.ink;
  const subtextColor = (slot?.highlight || isActive || bucket==="evening") && !isCompleted ? "rgba(255,255,255,0.6)" : T.inkFaint;

  if (!slot) return null;

  return (
    <div style={{padding:"12px 16px 0"}}>
      {/* Main moment card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{borderRadius:24,overflow:"hidden",boxShadow:"0 12px 40px rgba(28,22,18,0.15)",marginBottom:12,minHeight:480,display:"flex",flexDirection:"column",position:"relative",background:isCompleted?"#f0f0f0":isActive?T.sage:slot.highlight?T.ink:T.white,cursor:"pointer"}}
        onClick={()=>setSelectedPlace({name:slot.name,category:slot.category})}>

        {/* Hero — photo or rich gradient */}
        {slot.photo ? (
          <div style={{position:"relative",height:280,flexShrink:0}}>
            <img src={slot.photo} alt={slot.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.parentNode.style.background=T.ink}/>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,transparent 40%,rgba(28,22,18,0.8) 100%)"}}/>
            {/* Top bar — full width */}
            <div style={{position:"absolute",top:0,left:0,right:0,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}} onClick={e=>e.stopPropagation()}>
              <div/>{/* spacer */}
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                {slot.highlight&&<span style={{background:T.gold,color:"white",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:12}}>★ Must-do</span>}
                {slot.price&&<span style={{background:"rgba(0,0,0,0.45)",backdropFilter:"blur(8px)",color:"white",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:12}}>{slot.price}</span>}
                <button onClick={openTimeEdit} style={{background:"rgba(0,0,0,0.5)",backdropFilter:"blur(8px)",border:"1.5px dashed rgba(255,255,255,0.5)",color:"white",fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:16,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                  <span>🕐</span><span>{slot.time}</span><span style={{fontSize:8,opacity:0.5}}>▾</span>
                </button>
              </div>
            </div>
            <div style={{position:"absolute",bottom:16,left:16,right:16}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,color:"white",lineHeight:1.2,marginBottom:4}}>{slot.name}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.7)",display:"flex",alignItems:"center",gap:4}}>
                <span>📍</span>{slot.neighborhood}
              </div>
            </div>
          </div>
        ) : (
          // No photo — rich time-of-day gradient hero
          <div style={{
            position:"relative",
            height:240,
            flexShrink:0,
            background: isCompleted ? "#e8e8e8" :
              slot.highlight ? `linear-gradient(145deg,${T.ink} 0%,#2d1f10 100%)` :
              bucket === "morning" ? "linear-gradient(145deg,#1a0e00 0%,#4a2c00 40%,#7a4a10 100%)" :
              bucket === "afternoon" ? "linear-gradient(145deg,#0a1f14 0%,#1a4028 40%,#2d6040 100%)" :
              "linear-gradient(145deg,#0d0514 0%,#2d0a28 40%,#4a0f3a 100%)",
            overflow:"hidden",
          }}>
            {/* Decorative ambient glow */}
            <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:"50%",background:
              bucket==="morning"?"rgba(196,154,60,0.15)":
              bucket==="afternoon"?"rgba(74,124,89,0.15)":
              "rgba(139,26,111,0.15)",
              filter:"blur(40px)"}}/>
            <div style={{position:"absolute",bottom:-60,left:-40,width:160,height:160,borderRadius:"50%",background:
              bucket==="morning"?"rgba(200,75,47,0.1)":
              bucket==="afternoon"?"rgba(196,154,60,0.1)":
              "rgba(45,32,96,0.2)",
              filter:"blur(50px)"}}/>

            {/* Top bar — full width, space between */}
            <div style={{position:"absolute",top:0,left:0,right:0,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}} onClick={e=>e.stopPropagation()}>
              {/* Left — bucket label */}
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:18}}>{bucket==="morning"?"🌅":bucket==="afternoon"?"☀️":"🌙"}</span>
                <span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:"0.12em"}}>
                  {bucket==="morning"?"Morning":bucket==="afternoon"?"Afternoon":"Evening"}
                </span>
              </div>
              {/* Right — time + badges */}
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                {slot.highlight&&<span style={{background:T.gold,color:"white",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:12}}>★ Must-do</span>}
                {slot.price&&<span style={{background:"rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.8)",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:12}}>{slot.price}</span>}
                <button onClick={openTimeEdit} style={{background:"rgba(255,255,255,0.1)",backdropFilter:"blur(8px)",border:"1px dashed rgba(255,255,255,0.3)",color:"white",fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:16,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                  <span>🕐</span><span>{slot.time}</span><span style={{fontSize:8,opacity:0.5}}>▾</span>
                </button>
              </div>
            </div>

            {/* Place name — bottom of hero */}
            <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"40px 20px 18px",background:"linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 100%)"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700,color:"white",lineHeight:1.15,marginBottom:5}}>{slot.name}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.6)",display:"flex",alignItems:"center",gap:4}}>
                <span>📍</span>{slot.neighborhood}
              </div>
            </div>
          </div>
        )}

        {/* Content area */}
        <div style={{padding:"20px 20px 16px",flex:1,display:"flex",flexDirection:"column",gap:12,background:isCompleted?"#f8f8f8":isActive?T.sage:slot.highlight?T.ink:T.white}}>
          {/* Activity */}
          <div style={{fontSize:15,color:slot.highlight||isActive?"rgba(255,255,255,0.85)":T.inkLight,lineHeight:1.65,fontStyle:"italic"}}>{slot.activity}</div>

          {/* Tip */}
          {/* Confidence signal */}
          {slot.confidence && (
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
              {slot.confidence === "verified" && (
                <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.sage,fontWeight:600}}>
                  <span>✅</span><span>Verified on Google</span>
                </div>
              )}
              {slot.confidence === "found" && (
                <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.inkFaint,fontWeight:600}}>
                  <span>📍</span><span>Found — hours not listed</span>
                </div>
              )}
              {slot.confidence === "unverified" && (
                <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#c84b2f",fontWeight:600}}>
                  <span>⚠️</span><span>Unverified — confirm before visiting</span>
                </div>
              )}
            </div>
          )}

          {slot.must_know&&(
            <div style={{background:slot.highlight||isActive?"rgba(255,255,255,0.1)":"#fdf5e6",borderRadius:12,padding:"10px 14px",fontSize:13,color:slot.highlight||isActive?"rgba(255,255,255,0.7)":"#7a5c2a",fontWeight:600,display:"flex",gap:8,alignItems:"flex-start"}}>
              <span style={{flexShrink:0}}>💡</span><span>{slot.must_know}</span>
            </div>
          )}

          {/* Hours warning */}
          {slot.hours_warning && (
            <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(200,75,47,0.08)",border:"1px solid rgba(200,75,47,0.2)",borderRadius:12,padding:"10px 12px"}}>
              <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:"#c84b2f"}}>Hours conflict</div>
                <div style={{fontSize:11,color:"#c84b2f",opacity:0.85,marginTop:1}}>{slot.hours_warning}</div>
              </div>
              <button onClick={(e)=>{e.stopPropagation();openTimeEdit(e);}}
                style={{padding:"5px 10px",borderRadius:8,background:"#c84b2f",border:"none",color:"white",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>
                Fix time
              </button>
            </div>
          )}

          {/* Transit */}
          {/* Transit to NEXT stop */}
          {activeSlotIdx < slots.length - 1 && (() => {
            const nextSlot = slots[activeSlotIdx + 1];
            const mode = nextSlot?.transit_mode || "walk";
            const modeLabel = ({walk:"On foot",subway:"Subway",taxi:"Taxi",uber:"Uber",lyft:"Lyft",bus:"Bus",tram:"Tram","tuk-tuk":"Tuk-tuk",ferry:"Ferry",bike:"Bike",drive:"By car"})[mode] || mode;
            const mins = (nextSlot?.transit_from_prev||"").match(/\d+/)?.[0];
            if (!nextSlot?.transit_from_prev) return null;
            return (
              <div style={{display:"flex",alignItems:"center",gap:10,borderRadius:12,padding:"10px 14px",background:slot.highlight||isActive?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.04)",border:`1px solid ${slot.highlight||isActive?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.06)"}`}}>
                {mode==="uber" ? (
                  <div style={{width:30,height:30,borderRadius:8,background:"#000",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:13,fontWeight:900,color:"white",fontFamily:"Arial"}}>U</span>
                  </div>
                ) : mode==="lyft" ? (
                  <div style={{width:30,height:30,borderRadius:8,background:"#ea0083",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:13,fontWeight:900,color:"white",fontFamily:"Arial"}}>L</span>
                  </div>
                ) : (
                  <span style={{fontSize:22,lineHeight:1,flexShrink:0}}>{TRANSIT_ICONS[mode]||"🚶"}</span>
                )}
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:0}}>
                    <span style={{fontSize:13,fontWeight:700,color:slot.highlight||isActive?"white":TRANSIT_COLORS[mode]||T.sage}}>{modeLabel}</span>
                    <span style={{margin:"0 8px",color:slot.highlight||isActive?"rgba(255,255,255,0.2)":"#ddd",fontSize:14}}>|</span>
                    <span style={{fontSize:13,fontWeight:600,color:slot.highlight||isActive?"rgba(255,255,255,0.7)":"#666"}}>{mins} min</span>
                  </div>
                  <div style={{fontSize:10,color:slot.highlight||isActive?"rgba(255,255,255,0.3)":"#bbb",marginTop:1}}>
                    to {nextSlot.name}
                  </div>
                </div>
                <span style={{fontSize:11,color:slot.highlight||isActive?"rgba(255,255,255,0.3)":"#bbb"}}>→</span>
              </div>
            );
          })()}

          {/* Tap hint */}
          <div style={{fontSize:11,color:slot.highlight||isActive?"rgba(255,255,255,0.25)":T.dust,textAlign:"center",fontStyle:"italic"}}>
            Tap card for Google reviews & hours
          </div>

          <div style={{flex:1}}/>

          {/* Action buttons */}
          <div style={{display:"flex",gap:8}} onClick={e=>e.stopPropagation()}>
            {isCompleted ? (
              <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"12px 0",background:"rgba(74,124,89,0.1)",borderRadius:14}}>
                {[1,2,3,4,5].map(s=><span key={s} style={{fontSize:18,color:s<=rating?T.gold:T.dust}}>★</span>)}
              </div>
            ) : isActive ? (
              <button onClick={()=>checkOut(activeDay,activeSlotIdx,slot)}
                style={{flex:1,padding:"14px 0",borderRadius:14,background:"rgba(255,255,255,0.15)",border:"1.5px solid rgba(255,255,255,0.3)",color:"white",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                Done here — rate it →
              </button>
            ) : (
              <>
                <button onClick={()=>checkIn(activeDay,activeSlotIdx)}
                  style={{flex:1,padding:"13px 0",borderRadius:14,background:slot.highlight?T.gold:T.sage,border:"none",color:"white",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                  I'm here →
                </button>
                <button onClick={(e)=>{e.stopPropagation();setSelectedPlace({name:slot.name,category:slot.category});}}
                  style={{padding:"13px 16px",borderRadius:14,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",color:slot.highlight||isActive?"white":T.inkFaint,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                  Reviews & hours
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Time edit modal */}
      {editingTime && (
        <div style={{position:"fixed",inset:0,background:"rgba(28,22,18,0.7)",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn 0.2s ease"}} onClick={()=>setEditingTime(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.white,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,padding:"24px 20px 40px",fontFamily:"'DM Sans',sans-serif",animation:"slideUp 0.3s ease"}}>
            <div style={{width:36,height:4,borderRadius:2,background:T.dust,margin:"0 auto 20px"}}/>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:T.ink,marginBottom:4}}>{slot.name}</div>
            <div style={{fontSize:13,color:T.inkFaint,marginBottom:4}}>Suggested: {slot.time} – {slot.end_time} · stay as long as you like</div>
            {slot.opening_hours?.length > 0 && (
              <div style={{fontSize:11,color:T.sage,fontWeight:600,marginBottom:16,display:"flex",alignItems:"center",gap:4}}>
                <span>🕐</span>
                <span>{slot.opening_hours[new Date().getDay() === 0 ? 6 : new Date().getDay()-1] || "Hours vary"}</span>
              </div>
            )}
            {!slot.opening_hours?.length && <div style={{marginBottom:16}}/>}

            <div style={{fontSize:13,fontWeight:600,color:T.inkLight,marginBottom:8}}>When are you arriving?</div>
            <input
              value={timeInput}
              onChange={e=>setTimeInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&validateTime()}
              placeholder="e.g. 3:00 PM or 15:00"
              style={{width:"100%",padding:"14px 16px",borderRadius:14,border:`1.5px solid ${T.dust}`,background:T.cream,color:T.ink,fontSize:16,outline:"none",marginBottom:12,textAlign:"center"}}/>

            {/* Flexible time suggestions — based on opening hours, not rigid constraints */}
            {(() => {
              const toMins = (str) => {
                if (!str) return null;
                const m = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
                if (!m) return null;
                let h = parseInt(m[1]), min = parseInt(m[2]);
                const pm = m[3].toUpperCase() === 'PM';
                if (pm && h !== 12) h += 12;
                if (!pm && h === 12) h = 0;
                return h * 60 + min;
              };
              const fromMins = (mins) => {
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                const ampm = h >= 12 ? 'PM' : 'AM';
                const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
                return `${displayH}:${String(m).padStart(2,'0')} ${ampm}`;
              };

              // Get opening hours window
              const periods = slot.hours_periods || [];
              const day = new Date().getDay();
              const todayPeriods = periods.filter(p => p.open?.day === day);
              const openMins = todayPeriods[0] ? todayPeriods[0].open.hour * 60 + (todayPeriods[0].open.minute || 0) : 7 * 60;
              const closeMins = todayPeriods[0]?.close ? todayPeriods[0].close.hour * 60 - 30 : 22 * 60;

              // Generate suggestions across full open window, every 30 min
              const suggestions = [];
              for (let t = openMins; t <= closeMins; t += 30) {
                suggestions.push(fromMins(t));
                if (suggestions.length >= 10) break;
              }

              // If no hours data, use sensible defaults
              if (suggestions.length === 0) {
                [7,8,9,10,11,12,13,14,15,16,17,18,19,20,21].forEach(h => {
                  if (suggestions.length < 10) {
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const dh = h > 12 ? h-12 : (h===0?12:h);
                    suggestions.push(`${dh}:00 ${ampm}`);
                  }
                });
              }

              const hasHours = todayPeriods.length > 0;

              return (
                <div>
                  <div style={{fontSize:11,color:T.inkFaint,marginBottom:8}}>
                    {hasHours
                      ? `Open ${fromMins(openMins)} – ${fromMins(closeMins + 30)} · pick any arrival time`
                      : "When are you planning to arrive?"}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
                    {suggestions.map((t,i)=>(
                      <button key={i} onClick={()=>setTimeInput(t)}
                        style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${timeInput===t?T.accent:T.dust}`,background:timeInput===t?T.accent:T.cream,color:timeInput===t?"white":T.inkLight,fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.1s"}}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {timeMsg && (
              <div style={{padding:"10px 14px",borderRadius:12,background:timeMsg.type==="ok"?"#eaf6f0":"#fef5e7",marginBottom:12,fontSize:13,color:timeMsg.type==="ok"?T.sage:"#7a5c2a",fontWeight:600,lineHeight:1.5}}>
                {timeMsg.type==="ok"?"✓":"⚠"} {timeMsg.text}
              </div>
            )}

            <button onClick={validateTime} disabled={!timeInput.trim()||timeValidating}
              style={{width:"100%",padding:15,borderRadius:16,background:timeInput.trim()?T.ink:T.dust,border:"none",color:"white",fontSize:15,fontWeight:700,cursor:timeInput.trim()?"pointer":"default"}}>
              {timeValidating?"Checking feasibility…":"Move to this time →"}
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 4px",marginBottom:NAV_H+60}}>
        <button onClick={()=>activeSlotIdx>0&&setActiveSlotIdx(i=>i-1)}
          style={{background:"none",border:"none",color:activeSlotIdx>0?T.inkLight:T.dust,fontSize:13,fontWeight:600,cursor:activeSlotIdx>0?"pointer":"default",padding:"8px 4px",display:"flex",alignItems:"center",gap:4}}>
          {activeSlotIdx>0&&<>← <span style={{fontSize:11,maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{slots[activeSlotIdx-1]?.name?.split(' ')[0]}</span></>}
        </button>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {slots.map((_,i)=>(
            <div key={i} onClick={()=>setActiveSlotIdx(i)}
              style={{width:i===activeSlotIdx?20:6,height:6,borderRadius:3,background:ratings[`${activeDay}-${i}`]!==undefined?T.sage:i===activeSlotIdx?T.ink:T.dust,transition:"all 0.2s",cursor:"pointer"}}/>
          ))}
        </div>
        <button onClick={()=>activeSlotIdx<slots.length-1&&setActiveSlotIdx(i=>i+1)}
          style={{background:"none",border:"none",color:activeSlotIdx<slots.length-1?T.inkLight:T.dust,fontSize:13,fontWeight:600,cursor:activeSlotIdx<slots.length-1?"pointer":"default",padding:"8px 4px",display:"flex",alignItems:"center",gap:4}}>
          {activeSlotIdx<slots.length-1&&<><span style={{fontSize:11,maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{slots[activeSlotIdx+1]?.name?.split(' ')[0]}</span> →</>}
        </button>
      </div>
    </div>
  );
}

export { MomentCards };