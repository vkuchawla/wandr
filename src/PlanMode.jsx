import { useState, useEffect } from "react";
import { NAV_H, T } from "./constants.jsx";

// ─────────────────────────────────────────────
// PlanMode — compact day-schedule view with swap/move/time-edit
// Extracted from ItineraryView.jsx so the parent can stay under 1000 lines
// ─────────────────────────────────────────────
function PlanMode({ day, activeDay, ratings, BUCKET_COLORS, getBucket, TRANSIT_ICONS, TRANSIT_COLORS, setSelectedPlace, onUpdateSlots }) {
  const slots = day?.slots || [];
  const [localSlots, setLocalSlots] = useState(slots);
  const [editingTimeIdx, setEditingTimeIdx] = useState(null);
  const [swapIdx, setSwapIdx] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { setLocalSlots(slots); }, [day]);

  // Time helpers
  const toMins = (str) => {
    const m = str?.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!m) return null;
    let h = parseInt(m[1]), min = parseInt(m[2]);
    const pm = m[3].toUpperCase() === 'PM';
    if (pm && h !== 12) h += 12;
    if (!pm && h === 12) h = 0;
    return h * 60 + min;
  };
  const fromMins = (mins) => {
    mins = Math.round(mins / 15) * 15;
    mins = Math.max(0, Math.min(mins, 23 * 60 + 45));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const dh = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${dh}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // Check hours — only uses real Google data
  const isClosedAt = (slot, timeStr) => {
    const periods = slot.hours_periods || [];
    if (!periods.length) return false; // no real data, allow
    const slotMins = toMins(timeStr);
    if (slotMins === null) return false;
    const day = new Date().getDay();
    const todayPeriods = periods.filter(p => p.open?.day === day);
    if (!todayPeriods.length) return false;
    return !todayPeriods.some(p => {
      const open = p.open.hour * 60 + (p.open.minute || 0);
      const close = p.close ? p.close.hour * 60 + (p.close.minute || 0) : 24 * 60;
      return slotMins >= open && slotMins < close;
    });
  };

  const getOpenHours = (slot) => {
    const periods = slot.hours_periods || [];
    const day = new Date().getDay();
    const p = periods.find(pd => pd.open?.day === day);
    if (!p) return null;
    const oh = p.open.hour, om = p.open.minute || 0;
    const ch = p.close?.hour, cm = p.close?.minute || 0;
    const fmt = (h, m) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const dh = h > 12 ? h-12 : (h===0?12:h);
      return `${dh}:${String(m).padStart(2,'0')} ${ampm}`;
    };
    return ch ? `${fmt(oh,om)} – ${fmt(ch,cm)}` : `Opens ${fmt(oh,om)}`;
  };

  const commit = (updated) => {
    setLocalSlots(updated);
    onUpdateSlots(updated);
  };

  // SWAP — exchange two cards' time slots
  const handleSwap = (i) => {
    setError(null);
    setEditingTimeIdx(null);
    if (swapIdx === null) {
      setSwapIdx(i);
      return;
    }
    if (swapIdx === i) { setSwapIdx(null); return; }

    const a = localSlots[swapIdx];
    const b = localSlots[i];

    // Validate hours with real data only
    if (isClosedAt(a, b.time)) {
      const hrs = getOpenHours(a);
      setError(`${a.name} is closed at ${b.time}${hrs ? ` (open ${hrs})` : ''}`);
      setSwapIdx(null);
      return;
    }
    if (isClosedAt(b, a.time)) {
      const hrs = getOpenHours(b);
      setError(`${b.name} is closed at ${a.time}${hrs ? ` (open ${hrs})` : ''}`);
      setSwapIdx(null);
      return;
    }

    const updated = localSlots.map((s, idx) => {
      if (idx === swapIdx) return { ...b, time: a.time, end_time: a.end_time };
      if (idx === i) return { ...a, time: b.time, end_time: b.end_time };
      return s;
    });
    commit(updated);
    setSwapIdx(null);
  };

  // MOVE — shift one position up or down
  const moveCard = (i, dir) => {
    setError(null);
    const j = i + dir;
    if (j < 0 || j >= localSlots.length) return;

    const a = localSlots[i];
    const b = localSlots[j];

    if (isClosedAt(a, b.time)) {
      const hrs = getOpenHours(a);
      setError(`${a.name} is closed at ${b.time}${hrs ? ` (open ${hrs})` : ''}`);
      return;
    }
    if (isClosedAt(b, a.time)) {
      const hrs = getOpenHours(b);
      setError(`${b.name} is closed at ${a.time}${hrs ? ` (open ${hrs})` : ''}`);
      return;
    }

    const updated = localSlots.map((s, idx) => {
      if (idx === i) return { ...b, time: a.time, end_time: a.end_time };
      if (idx === j) return { ...a, time: b.time, end_time: b.end_time };
      return s;
    });
    commit(updated);
  };

  // ADJUST TIME — +/- 15 min
  const adjustTime = (i, field, delta) => {
    const updated = localSlots.map((s, idx) => {
      if (idx !== i) return s;
      const cur = toMins(s[field]) || 0;
      const snapped = Math.round((cur + delta) / 15) * 15;
      if (field === 'time') {
        const dur = Math.max((toMins(s.end_time) - toMins(s.time)) || 90, 30);
        return { ...s, time: fromMins(snapped), end_time: fromMins(snapped + dur) };
      }
      return { ...s, end_time: fromMins(Math.max(snapped, (toMins(s.time)||0) + 15)) };
    });
    setLocalSlots(updated);
    onUpdateSlots(updated);
  };

  const CATEGORY_ICONS = {
    cafe:"☕", coffee:"☕", breakfast:"🥐", restaurant:"🍽", food:"🍜", bar:"🍸",
    museum:"🏛", gallery:"🎨", park:"🌿", market:"🛒", shop:"🛍", hotel:"🏨",
    activity:"⚡", landmark:"📸", beach:"🏖", nightlife:"🌙", entertainment:"🎭"
  };
  const getCategoryIcon = (slot) => {
    if (!slot) return "📍";
    const cat = (slot.category || "").toLowerCase();
    return Object.entries(CATEGORY_ICONS).find(([k]) => cat.includes(k))?.[1] ||
      (slot.is_meal ? "🍽" : slot.highlight ? "★" : "📍");
  };

  // Format time compactly: "9:00 AM" → "9:00a", "2:30 PM" → "2:30p"
  const compactTime = (t) => {
    if (!t) return "";
    const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!m) return t;
    return `${m[1]}:${m[2]}${m[3].toUpperCase()==="AM"?"a":"p"}`;
  };

  // Count issues for the day header
  const issueCount = localSlots.filter(s => s.hours_warning || s.confidence === "unverified").length;

  // Build a lightweight SVG route visualizer — plots normalized coords as dots with a connecting line
  const miniMap = (() => {
    const pts = localSlots
      .map((s, idx) => ({ idx, lat: s.lat, lng: s.lng, name: s.name, highlight: s.highlight }))
      .filter(p => typeof p.lat === "number" && typeof p.lng === "number" && Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (pts.length < 2) return null;
    const W = 640, H = 160, pad = 28;
    const lats = pts.map(p => p.lat), lngs = pts.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const spanLat = Math.max(maxLat - minLat, 0.001);
    const spanLng = Math.max(maxLng - minLng, 0.001);
    const sx = (lng) => pad + ((lng - minLng) / spanLng) * (W - pad * 2);
    const sy = (lat) => pad + ((maxLat - lat) / spanLat) * (H - pad * 2);
    return { W, H, pts: pts.map(p => ({ ...p, x: sx(p.lng), y: sy(p.lat) })) };
  })();

  const BUCKET_LABELS = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };
  const BUCKET_ICONS  = { morning: "🌅", afternoon: "☀️", evening: "🌙" };

  return (
    <div style={{padding:"14px 16px",paddingBottom:NAV_H+80}}>
      {/* Day header strip */}
      <div style={{marginBottom:18,padding:"14px 16px",borderRadius:16,background:T.white,border:`1px solid ${T.dust}`,boxShadow:"0 2px 8px rgba(28,22,18,0.04)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:6}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{fontSize:10,fontWeight:800,color:T.gold,textTransform:"uppercase",letterSpacing:"0.14em"}}>Day {day?.day}</div>
            <span style={{fontSize:10,color:T.inkFaint}}>·</span>
            <div style={{fontSize:11,color:T.inkLight,fontWeight:600}}>{localSlots.length} stop{localSlots.length===1?"":"s"}</div>
          </div>
          {issueCount > 0 && (
            <div style={{display:"flex",alignItems:"center",gap:4,background:"rgba(200,75,47,0.1)",border:"1px solid rgba(200,75,47,0.2)",borderRadius:999,padding:"3px 9px",fontSize:10,color:"#c84b2f",fontWeight:700}}>
              <span>⚠</span><span>{issueCount} to confirm</span>
            </div>
          )}
        </div>
        {day?.theme && <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontStyle:"italic",color:T.ink,lineHeight:1.3}}>{day.theme}</div>}
        {swapIdx !== null && (
          <div style={{marginTop:10,background:`${T.sage}12`,borderRadius:10,padding:"7px 10px",fontSize:11,color:T.sage,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
            <span>↕</span><span>Tap another stop to swap times</span>
            <button onClick={(e)=>{e.stopPropagation();setSwapIdx(null);}} style={{marginLeft:"auto",background:"none",border:"none",color:T.sage,fontSize:11,fontWeight:700,cursor:"pointer"}}>Cancel</button>
          </div>
        )}
        {error && (
          <div style={{marginTop:8,background:"rgba(200,75,47,0.08)",border:"1px solid rgba(200,75,47,0.22)",borderRadius:10,padding:"8px 12px",fontSize:11,color:"#c84b2f",display:"flex",gap:6,alignItems:"flex-start"}}>
            <span>🚫</span><span style={{flex:1}}>{error}</span>
            <button onClick={()=>setError(null)} style={{background:"none",border:"none",color:"#c84b2f",cursor:"pointer",fontSize:12,opacity:0.7}}>×</button>
          </div>
        )}
      </div>

      {/* Mini route map */}
      {miniMap && (
        <div style={{marginBottom:16,padding:12,borderRadius:16,background:T.white,border:`1px solid ${T.dust}`,boxShadow:"0 2px 8px rgba(28,22,18,0.04)"}}>
          <div style={{fontSize:10,fontWeight:800,color:T.inkFaint,textTransform:"uppercase",letterSpacing:"0.14em",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
            <span>🗺</span><span>Route</span>
          </div>
          <svg viewBox={`0 0 ${miniMap.W} ${miniMap.H}`} style={{width:"100%",height:"auto",display:"block",background:T.cream,borderRadius:12}}>
            {/* Route polyline */}
            <polyline
              points={miniMap.pts.map(p => `${p.x},${p.y}`).join(" ")}
              fill="none" stroke={T.accent} strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0" />
            {/* Stop markers */}
            {miniMap.pts.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="12" fill={p.highlight ? T.gold : T.accent} stroke={T.cream} strokeWidth="3" />
                <text x={p.x} y={p.y + 4} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="800" fontFamily="'DM Sans',sans-serif">{p.idx + 1}</text>
              </g>
            ))}
          </svg>
        </div>
      )}

      {/* Compact schedule */}
      <div style={{position:"relative"}}>
        {/* Vertical rail */}
        <div style={{position:"absolute",left:52,top:8,bottom:8,width:2,background:T.dust,borderRadius:1,zIndex:0}}/>

        {localSlots.map((slot, i) => {
          const bc = BUCKET_COLORS[getBucket(slot.time)] || T.gold;
          const rating = ratings[`${activeDay}-${i}`];
          const isCompleted = rating !== undefined;
          const isSwapSelected = swapIdx === i;
          const isSwapTarget = swapIdx !== null && swapIdx !== i;
          const isEditingTime = editingTimeIdx === i;
          const nextSlot = localSlots[i + 1];
          const mode = nextSlot?.transit_mode || "walk";
          const mins = nextSlot?.transit_from_prev?.match(/\d+/)?.[0];
          const catIcon = getCategoryIcon(slot);
          const ratingColor = isCompleted ? (rating>=9?"#22c55e":rating>=7?"#84cc16":rating>=5?"#eab308":rating>=3?"#f97316":"#ef4444") : null;

          const curBucket = getBucket(slot.time);
          const prevBucket = i > 0 ? getBucket(localSlots[i - 1].time) : null;
          const showDivider = curBucket && curBucket !== prevBucket;

          return (
            <div key={`${slot.name}-${i}`} style={{position:"relative"}}>
              {/* Time-of-day divider */}
              {showDivider && (
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0 8px",marginTop:i===0?0:6}}>
                  <div style={{flexShrink:0,display:"flex",alignItems:"center",gap:6,paddingLeft:34}}>
                    <span style={{fontSize:13,lineHeight:1}}>{BUCKET_ICONS[curBucket]}</span>
                    <span style={{fontSize:10,fontWeight:800,color:T.inkLight,textTransform:"uppercase",letterSpacing:"0.14em"}}>{BUCKET_LABELS[curBucket]}</span>
                  </div>
                  <div style={{flex:1,height:1,background:T.dust}}/>
                </div>
              )}
              {/* Row */}
              <div style={{display:"flex",alignItems:"stretch",gap:0,marginBottom:isEditingTime?0:2}}>
                {/* Time rail */}
                <div style={{width:48,flexShrink:0,paddingTop:14,paddingRight:6,textAlign:"right",position:"relative",zIndex:1}}>
                  <button
                    onClick={(e)=>{e.stopPropagation();setSwapIdx(null);setEditingTimeIdx(isEditingTime?null:i);}}
                    aria-label={`Edit time for ${slot.name}`}
                    style={{background:"none",border:"none",padding:0,cursor:"pointer",display:"inline-block",fontSize:12,fontWeight:800,color:isEditingTime?T.accent:bc,lineHeight:1.1,fontVariantNumeric:"tabular-nums"}}>
                    {compactTime(slot.time)}
                  </button>
                </div>

                {/* Dot on rail */}
                <div style={{width:14,flexShrink:0,display:"flex",justifyContent:"center",paddingTop:15,position:"relative",zIndex:1}}>
                  <div style={{
                    width:12,height:12,borderRadius:"50%",
                    background: ratingColor || (isSwapSelected ? T.sage : slot.highlight ? T.gold : bc),
                    border:`2px solid ${T.cream}`,
                    boxShadow:`0 0 0 2px ${(ratingColor||(isSwapSelected?T.sage:slot.highlight?T.gold:bc))}30`,
                    transition:"all 0.15s"
                  }}/>
                </div>

                {/* Card */}
                <div style={{flex:1,minWidth:0,marginLeft:10,marginBottom:6}}>
                  <div
                    onClick={()=>handleSwap(i)}
                    style={{
                      background: isSwapSelected ? `${T.sage}12` : isSwapTarget ? `${T.gold}08` : isCompleted ? "#f8f6f3" : T.white,
                      borderRadius:14,
                      padding:"11px 12px",
                      border:`1.5px solid ${isSwapSelected ? T.sage : isSwapTarget ? `${T.gold}60` : isEditingTime ? bc : T.dust}`,
                      boxShadow: isSwapSelected ? `0 0 0 3px ${T.sage}22` : "0 2px 6px rgba(28,22,18,0.04)",
                      cursor:"pointer",
                      transition:"all 0.15s",
                      minHeight:52,
                    }}>
                    <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                      {/* Category icon */}
                      <div style={{fontSize:18,lineHeight:1,flexShrink:0,opacity:isCompleted?0.5:1,width:22,textAlign:"center"}}>{catIcon}</div>

                      {/* Content */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:700,color:isCompleted?T.inkFaint:T.ink,lineHeight:1.25,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:isCompleted?"line-through":"none",textDecorationColor:T.inkFaint}}>
                          {slot.name}
                        </div>
                        <div style={{fontSize:11,color:T.inkFaint,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {slot.neighborhood}
                          {slot.category && <> · <span style={{textTransform:"capitalize"}}>{slot.category}</span></>}
                          {slot.highlight && <> · <span style={{color:T.gold,fontWeight:700}}>★ Must-do</span></>}
                        </div>
                      </div>

                      {/* Right trailing — rating or reorder */}
                      {isCompleted && ratingColor ? (
                        <div style={{width:28,height:28,borderRadius:"50%",background:ratingColor,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 2px 6px ${ratingColor}55`}}>
                          <span style={{fontSize:12,fontWeight:900,color:"white"}}>{rating}</span>
                        </div>
                      ) : (
                        <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
                          <button onClick={(e)=>{e.stopPropagation();setSwapIdx(null);moveCard(i,-1);}} disabled={i===0}
                            aria-label="Move earlier"
                            style={{width:22,height:20,borderRadius:6,border:`1px solid ${T.dust}`,background:T.white,color:i===0?T.dust:T.inkLight,fontSize:11,cursor:i===0?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
                          <button onClick={(e)=>{e.stopPropagation();setSwapIdx(null);moveCard(i,1);}} disabled={i===localSlots.length-1}
                            aria-label="Move later"
                            style={{width:22,height:20,borderRadius:6,border:`1px solid ${T.dust}`,background:T.white,color:i===localSlots.length-1?T.dust:T.inkLight,fontSize:11,cursor:i===localSlots.length-1?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>↓</button>
                        </div>
                      )}
                    </div>

                    {/* Inline warning (only for issues) */}
                    {(slot.hours_warning || slot.confidence === "unverified") && !isCompleted && (
                      <div style={{marginTop:8,paddingTop:8,borderTop:"1px dashed rgba(200,75,47,0.25)",fontSize:11,color:"#c84b2f",display:"flex",gap:6,alignItems:"flex-start"}}>
                        <span style={{flexShrink:0}}>⚠</span>
                        <span style={{flex:1,minWidth:0,lineHeight:1.4}}>{slot.hours_warning || "Confirm before visiting"}</span>
                      </div>
                    )}
                  </div>

                  {/* Time editor */}
                  {isEditingTime && (
                    <div style={{background:T.paper,borderRadius:12,padding:"12px 13px",marginTop:6,marginBottom:8,border:`1px solid ${bc}40`,animation:"fadeUp 0.15s ease"}}>
                      {slot.opening_hours?.length > 0 && (
                        <div style={{fontSize:10,color:T.sage,marginBottom:8,display:"flex",gap:4,fontWeight:600}}>
                          <span>🕐</span><span>{slot.opening_hours[new Date().getDay()===0?6:new Date().getDay()-1]}</span>
                        </div>
                      )}
                      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                        <div>
                          <div style={{fontSize:10,color:T.inkFaint,marginBottom:5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Start</div>
                          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                            {[-60,-30,-15,15,30,60].map(d=>(
                              <button key={d} onClick={(e)=>{e.stopPropagation();adjustTime(i,'time',d);}}
                                style={{padding:"5px 8px",borderRadius:8,background:d<0?"#fef2f2":"#f0faf5",border:`1px solid ${d<0?"#fcc":"#b8e0c8"}`,color:d<0?"#c84b2f":T.sage,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                                {d>0?`+${d}`:`${d}`}m
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div style={{fontSize:10,color:T.inkFaint,marginBottom:5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Duration</div>
                          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                            {[-30,-15,15,30,60].map(d=>(
                              <button key={d} onClick={(e)=>{e.stopPropagation();adjustTime(i,'end_time',d);}}
                                style={{padding:"5px 8px",borderRadius:8,background:d<0?"#fef2f2":"#f0faf5",border:`1px solid ${d<0?"#fcc":"#b8e0c8"}`,color:d<0?"#c84b2f":T.sage,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                                {d>0?`+${d}`:`${d}`}m
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button onClick={(e)=>{e.stopPropagation();setEditingTimeIdx(null);}}
                        style={{marginTop:10,padding:"6px 14px",borderRadius:8,background:T.ink,border:"none",color:"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                        Done
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Transit connector — minimal */}
              {nextSlot && !isEditingTime && (
                <div style={{display:"flex",alignItems:"center",gap:6,paddingLeft:74,marginBottom:4,marginTop:-2}}>
                  <span style={{fontSize:12,opacity:0.65}}>{TRANSIT_ICONS[mode]||"🚶"}</span>
                  <span style={{fontSize:10,color:T.inkFaint,fontWeight:600}}>
                    {mins ? `${mins} min` : (nextSlot.transit_from_prev||"")}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { PlanMode };
