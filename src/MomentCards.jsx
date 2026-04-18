import { useState, useRef, useEffect } from "react";
import { NAV_H, T, TRANSIT_COLORS, TRANSIT_ICONS, CITY_PHOTOS } from "./constants.jsx";

// Category → pool of atmospheric Unsplash photos (pick one deterministically per slot)
const u = (id) => `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`;
const CATEGORY_PHOTO_POOLS = {
  food:       ["1414235077428-338989a2e8c0","1504674900247-0877df9cc836","1476224203421-9ac39bcb3327","1540189549336-e6e99c3679fe","1546069901-ba9599a7e63c"].map(u),
  restaurant: ["1517248135467-4c7edcad34c4","1559329007-40df8a9345d8","1528605248644-14dd04022da1","1555396273-367ea4eb4db5","1551218808-94e220e084d2"].map(u),
  cafe:       ["1495474472287-4d71bcdd2085","1453614512568-c4024d13c247","1501339847302-ac426a4a7cbb","1442512595331-e89e73853f31","1559305616-3f99cd43e353"].map(u),
  coffee:     ["1495474472287-4d71bcdd2085","1453614512568-c4024d13c247","1459755486867-b55449bb39ff","1504627298434-2119d6928e93","1514432324607-a09d9b4aefdd"].map(u),
  bar:        ["1470337458703-46ad1756a187","1514933651103-005eec06c04b","1551024709-8f23befc6f87","1566417713940-fe7c737a9ef2","1541532713592-79a0317b6b77"].map(u),
  nightlife:  ["1516450360452-9312f5e86fc7","1566417713940-fe7c737a9ef2","1551024709-8f23befc6f87","1470337458703-46ad1756a187","1514933651103-005eec06c04b"].map(u),
  club:       ["1516450360452-9312f5e86fc7","1571266028243-d220bc53f27d","1429962714451-bb934ecdc4ec","1459749411175-04bf5292ceea","1514933651103-005eec06c04b"].map(u),
  museum:     ["1518998053901-5348d3961a04","1544989164-31f57b3c4b8a","1554907984-15263bfd63bd","1565060169187-5284a3fd87a3","1565060134-1c90deb7b7b7"].map(u),
  art:        ["1501594907352-04cda38ebc29","1536924940846-227afb31e2a5","1541961017774-22349e4a1262","1554907984-15263bfd63bd","1578926288207-32356af08fc1"].map(u),
  park:       ["1441974231531-c6227db76b6e","1506260408121-e353d10b87c7","1519331379826-f10be5486c6f","1472214103451-9374bd1c798e","1448375240586-882707db888b"].map(u),
  nature:     ["1506905925346-21bda4d32df4","1501785888041-af3ef285b470","1470770841072-f978cf4d019e","1447752875215-b2761acb3c5d","1472214103451-9374bd1c798e"].map(u),
  beach:      ["1507525428034-b723cf961d3e","1519046904884-53103b34b206","1506929562872-bb421503ef21","1468413253725-0d5181091126","1506953823976-52e1fdc0149a"].map(u),
  market:     ["1555396273-367ea4eb4db5","1573246123716-6b1782bfc499","1488459716781-31db52582fe9","1534723452862-4c874018d66d","1543348745-777c6ce37d20"].map(u),
  shopping:   ["1481437156560-3205f6a55735","1483985988355-763728e1935b","1472851294608-062f824d29cc","1472851294608-062f824d29cc","1441986300917-64674bd600d8"].map(u),
  hotel:      ["1566073771259-6a8506099945","1564501049412-61c2a3083791","1571896349842-33c89424de2d","1520250497591-112f2f40a3f4","1590490360182-c33d57733427"].map(u),
  spa:        ["1540555700478-4be289fbecef","1544161515-4ab6ce6db874","1519823551278-64ac92734fb1","1540555700478-4be289fbecef","1571019614242-c5c5dee9f50b"].map(u),
  temple:     ["1528360983277-13d401cdc186","1545569341-9eb8b30979d9","1478436127897-769e1538f1a2","1493780474015-ba834fd0ce2f","1580181566229-093bbf35ae18"].map(u),
  shrine:     ["1528360983277-13d401cdc186","1545569341-9eb8b30979d9","1580181566229-093bbf35ae18","1493780474015-ba834fd0ce2f","1578662996442-48f60103fc96"].map(u),
  church:     ["1519734777837-3f986da12fe4","1478436127897-769e1538f1a2","1548276145-69a9521f0499","1493780474015-ba834fd0ce2f","1548276145-69a9521f0499"].map(u),
  landmark:   ["1501594907352-04cda38ebc29","1511739001486-6bfe10ce785f","1502602898657-3e91760cbb34","1533105079780-92b9be482077","1467269204594-9661b134dd2b"].map(u),
  view:       ["1476514525535-07fb3b4ae5f1","1470071459604-3b5ec3a7fe05","1501785888041-af3ef285b470","1447752875215-b2761acb3c5d","1501785888041-af3ef285b470"].map(u),
  viewpoint:  ["1476514525535-07fb3b4ae5f1","1470071459604-3b5ec3a7fe05","1469854523086-cc02fe5d8800","1447752875215-b2761acb3c5d","1506905925346-21bda4d32df4"].map(u),
};

// Simple deterministic hash → index so the same slot always gets the same fallback photo
const hashToIdx = (str, max) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % Math.max(1, max);
};

// Haversine distance between two lat/lng points, returned in miles
const haversineMiles = (lat1, lng1, lat2, lng2) => {
  if (![lat1,lng1,lat2,lng2].every(n => typeof n === "number" && Number.isFinite(n))) return null;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8; // earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const pickFallbackPhoto = (slot, city) => {
  const cat = (slot?.category || "").toLowerCase();
  const pool =
    CATEGORY_PHOTO_POOLS[cat] ||
    Object.entries(CATEGORY_PHOTO_POOLS).find(([k]) => cat.includes(k))?.[1];
  if (pool) {
    const key = (slot?.name || "") + (slot?.neighborhood || "") + (city || "");
    return pool[hashToIdx(key, pool.length)];
  }
  return CITY_PHOTOS[city?.split(",")[0]?.trim()] || null;
};

function MomentCards({ day, activeDay, ratings, activeSlot, checkIn, checkOut, setSelectedPlace, BUCKET_COLORS, getBucket, TRANSIT_ICONS, TRANSIT_COLORS, city, onUpdateSlots }) {
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

  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0); // which slot.photos[i] is showing
  const [lightbox, setLightbox] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(() => {
    return !localStorage.getItem("wandr-seen-swipe") && slots.length > 1;
  });

  // Reset photo load state when slot changes
  useEffect(() => { setPhotoLoaded(false); setTipOpen(false); setPhotoIdx(0); }, [activeSlotIdx]);
  // Clamp active slot when switching days so we never render a blank slot
  useEffect(() => { setActiveSlotIdx(0); }, [activeDay]);
  const touchStartX = useRef(null);
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 30) {
      setShowSwipeHint(false);
      localStorage.setItem("wandr-seen-swipe", "1");
    }
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
  // Stable card backgrounds — never change mid-render to prevent flicker
  const STABLE_BG = {
    morning:   "linear-gradient(145deg,#1a0e00 0%,#4a2c00 40%,#7a4a10 100%)",
    afternoon: "linear-gradient(145deg,#0a1f14 0%,#1a4028 40%,#2d6040 100%)",
    evening:   "linear-gradient(145deg,#0d0514 0%,#2d0a28 40%,#4a0f3a 100%)"
  };
  const cardBg = isCompleted ? "#f0f0f0" : STABLE_BG[bucket] || STABLE_BG.morning;
  const textColor = isCompleted ? T.inkFaint : "white";
  const subtextColor = isCompleted ? T.inkFaint : "rgba(255,255,255,0.6)";

  if (!slot) return null;

  return (
    <div style={{padding:"12px 16px 0",position:"relative"}}>
      {/* Main moment card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{borderRadius:24,overflow:"hidden",boxShadow:"0 12px 40px rgba(28,22,18,0.15)",marginBottom:12,minHeight:480,display:"flex",flexDirection:"column",position:"relative",background:cardBg,cursor:"pointer"}}
        onClick={()=>setSelectedPlace({name:slot.name,category:slot.category})}>

        {/* Hero — unified: photo if available, category/city fallback otherwise */}
        {(() => {
          // Build photo candidate list: real photos[] → legacy single .photo → deterministic fallback
          const realPhotos = (Array.isArray(slot.photos) && slot.photos.length > 0)
            ? slot.photos
            : (slot.photo ? [slot.photo] : []);
          const fallback = pickFallbackPhoto(slot, city);
          const photos = realPhotos.length > 0 ? realPhotos : (fallback ? [fallback] : []);
          const isReal = realPhotos.length > 0 && photoIdx < realPhotos.length;
          const currentPhoto = photos[Math.min(photoIdx, photos.length - 1)];
          const handleErr = () => {
            // Rotate to the next URL, else drop photoIdx to the fallback slot
            setPhotoIdx(i => Math.min(i + 1, photos.length));
            setPhotoLoaded(true);
          };
          return (
            <div style={{position:"relative",height:280,flexShrink:0,overflow:"hidden",background:isCompleted?"#e8e8e8":cardBg}}
              onClick={(e)=>{ if (currentPhoto) { e.stopPropagation(); setLightbox(true); } }}>

              {/* Shimmer while loading */}
              {currentPhoto && !photoLoaded && (
                <div style={{
                  position:"absolute",inset:0,
                  background:`linear-gradient(90deg,${cardBg} 0%,rgba(255,255,255,0.05) 50%,${cardBg} 100%)`,
                  backgroundSize:"200% 100%",
                  animation:"shimmer 1.5s ease infinite"
                }}/>
              )}

              {currentPhoto && (
                <img
                  key={currentPhoto}
                  src={currentPhoto}
                  alt={slot.name}
                  onLoad={() => setPhotoLoaded(true)}
                  onError={handleErr}
                  style={{
                    position:"absolute",inset:0,
                    width:"100%",height:"100%",objectFit:"cover",
                    opacity: photoLoaded ? (isReal ? 1 : (isCompleted?0.08:0.55)) : 0,
                    transition:"opacity 0.5s ease",
                    animation: photoLoaded && !isCompleted ? "kenburns 22s ease-in-out infinite alternate" : "none",
                    transformOrigin:"center",
                  }}
                />
              )}

              {/* Readability gradient */}
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.32) 0%,transparent 35%,rgba(0,0,0,0.82) 100%)",pointerEvents:"none"}}/>

              {/* Top bar */}
              <div style={{position:"absolute",top:0,left:0,right:0,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",zIndex:2}} onClick={e=>e.stopPropagation()}>
                <button onClick={openTimeEdit} aria-label={`Change time — currently ${slot.time}`} style={{background:"rgba(0,0,0,0.55)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.22)",color:"white",fontSize:12,fontWeight:700,padding:"6px 12px",borderRadius:18,cursor:"pointer",display:"flex",alignItems:"center",gap:6,letterSpacing:"0.01em"}}>
                  <span>{slot.time}</span><span style={{fontSize:9,opacity:0.7}}>▾</span>
                </button>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  {slot.rating && (
                    <span style={{background:"rgba(0,0,0,0.55)",backdropFilter:"blur(8px)",color:"white",fontSize:11,fontWeight:700,padding:"4px 9px",borderRadius:12,display:"flex",alignItems:"center",gap:3}}>
                      <span style={{color:T.gold}}>★</span>{Number(slot.rating).toFixed(1)}
                    </span>
                  )}
                  {slot.highlight && (
                    <span style={{background:T.gold,color:"white",fontSize:10,fontWeight:700,padding:"4px 10px",borderRadius:12,letterSpacing:"0.02em",boxShadow:"0 2px 8px rgba(196,154,60,0.4)"}}>★ Must-do</span>
                  )}
                </div>
              </div>

              {/* Photo dot indicator (only when real photos rotate) */}
              {realPhotos.length > 1 && (
                <div style={{position:"absolute",top:62,right:16,display:"flex",gap:4,zIndex:2}} onClick={e=>e.stopPropagation()}>
                  {realPhotos.slice(0,5).map((_, i) => (
                    <div key={i} style={{width:5,height:5,borderRadius:"50%",background: i === Math.min(photoIdx, realPhotos.length-1) ? "white" : "rgba(255,255,255,0.45)",transition:"all 0.2s"}}/>
                  ))}
                </div>
              )}

              {/* Place name + neighborhood · price */}
              <div style={{position:"absolute",bottom:18,left:18,right:18,zIndex:2}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700,color:"white",lineHeight:1.15,marginBottom:6,textShadow:"0 2px 10px rgba(0,0,0,0.5)"}}>{slot.name}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.82)",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <span>📍 {slot.neighborhood}</span>
                  {slot.price && <><span style={{opacity:0.45}}>·</span><span style={{fontWeight:600}}>{slot.price}</span></>}
                  {slot.rating_count && <><span style={{opacity:0.45}}>·</span><span style={{opacity:0.75}}>{slot.rating_count.toLocaleString()} reviews</span></>}
                </div>
              </div>

              {/* Photo source hint — only if we're on the fallback */}
              {!isReal && photos.length > 0 && (
                <div style={{position:"absolute",bottom:6,right:10,fontSize:9,color:"rgba(255,255,255,0.35)",zIndex:2,letterSpacing:"0.05em"}}>stock photo</div>
              )}
            </div>
          );
        })()}

        {/* Content area */}
        <div style={{padding:"18px 20px 18px",flex:1,display:"flex",flexDirection:"column",gap:12,background:isCompleted?"#f8f8f8":"transparent"}}>
          {/* Activity — capped at 2 lines */}
          {slot.activity && (
            <div style={{fontSize:14.5,color:isCompleted?T.inkLight:"rgba(255,255,255,0.82)",lineHeight:1.55,fontStyle:"italic",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{slot.activity}</div>
          )}

          {/* Only show warnings — hide success states (verified/found) */}
          {slot.confidence === "unverified" && !slot.hours_warning && (
            <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#ffb4a6",fontWeight:600}}>
              <span>⚠</span><span>Unverified — confirm before visiting</span>
            </div>
          )}

          {/* Hours warning — the only auto-action banner */}
          {slot.hours_warning && (
            <div style={{display:"flex",alignItems:"center",gap:10,background:"rgba(200,75,47,0.18)",border:"1px solid rgba(200,75,47,0.35)",borderRadius:12,padding:"9px 12px"}}>
              <span style={{fontSize:14,flexShrink:0}}>⚠</span>
              <div style={{flex:1,fontSize:12,color:"#ffcfc2",fontWeight:600}}>{slot.hours_warning}</div>
              <button onClick={(e)=>{e.stopPropagation();openTimeEdit(e);}}
                style={{padding:"5px 10px",borderRadius:8,background:"#c84b2f",border:"none",color:"white",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>
                Fix
              </button>
            </div>
          )}

          {/* Collapsible local tip */}
          {slot.must_know && (
            <button onClick={(e)=>{e.stopPropagation();setTipOpen(o=>!o);}}
              style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,padding:"10px 12px",display:"flex",alignItems:"flex-start",gap:8,textAlign:"left",cursor:"pointer",width:"100%"}}>
              <span style={{fontSize:14,flexShrink:0,marginTop:1}}>💡</span>
              <div style={{flex:1,fontSize:12.5,color:"rgba(255,255,255,0.88)",lineHeight:1.45,fontWeight:500,display:tipOpen?"block":"-webkit-box",WebkitLineClamp:tipOpen?"unset":1,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
                {tipOpen ? slot.must_know : <><span style={{fontWeight:700,color:"rgba(255,255,255,0.65)",letterSpacing:"0.02em",marginRight:6}}>Local tip</span>{slot.must_know}</>}
              </div>
              <span style={{fontSize:10,color:"rgba(255,255,255,0.5)",flexShrink:0,marginTop:2}}>{tipOpen?"▴":"▾"}</span>
            </button>
          )}

          {/* Transit to NEXT stop — compact single line */}
          {activeSlotIdx < slots.length - 1 && (() => {
            const nextSlot = slots[activeSlotIdx + 1];
            const mode = nextSlot?.transit_mode || "walk";
            const mins = (nextSlot?.transit_from_prev||"").match(/\d+/)?.[0];
            if (!nextSlot?.transit_from_prev) return null;
            const distMi = haversineMiles(slot?.lat, slot?.lng, nextSlot?.lat, nextSlot?.lng);
            const distLabel = distMi != null
              ? (distMi < 0.1 ? `${Math.round(distMi * 5280)} ft` : `${distMi.toFixed(distMi < 10 ? 1 : 0)} mi`)
              : null;
            return (
              <div style={{display:"flex",alignItems:"center",gap:10,borderRadius:10,padding:"8px 12px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)"}}>
                {mode==="uber" ? (
                  <div style={{width:22,height:22,borderRadius:6,background:"#000",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:10,fontWeight:900,color:"white"}}>U</span>
                  </div>
                ) : mode==="lyft" ? (
                  <div style={{width:22,height:22,borderRadius:6,background:"#ea0083",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:10,fontWeight:900,color:"white"}}>L</span>
                  </div>
                ) : (
                  <span style={{fontSize:16,lineHeight:1,flexShrink:0}}>{TRANSIT_ICONS[mode]||"🚶"}</span>
                )}
                <div style={{flex:1,minWidth:0,fontSize:12,color:"rgba(255,255,255,0.75)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  <span style={{fontWeight:700,color:"white"}}>{mins} min</span>
                  {distLabel && <span style={{opacity:0.55}}> · {distLabel}</span>}
                  <span style={{opacity:0.6}}> to </span>
                  <span style={{fontWeight:600}}>{nextSlot.name}</span>
                </div>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.4)",flexShrink:0}}>→</span>
              </div>
            );
          })()}

          <div style={{flex:1}}/>

          {/* Action row — primary CTA + two icon buttons */}
          <div style={{display:"flex",gap:8,alignItems:"stretch"}} onClick={e=>e.stopPropagation()}>
            {isCompleted ? (
              (() => {
                const c = rating>=9?"#22c55e":rating>=7?"#84cc16":rating>=5?"#eab308":rating>=3?"#f97316":"#ef4444";
                const lbl = [,"Avoid","Regret it","Disappointing","Underwhelming","It was alright","Worth a visit","Solid pick","Really loved it","Exceptional","One of a kind"][rating]||"";
                return (
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"10px 0",background:`${c}18`,borderRadius:14}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:c,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 2px 10px ${c}55`}}>
                      <span style={{fontSize:16,fontWeight:900,color:"white"}}>{rating}</span>
                    </div>
                    <span style={{fontSize:13,fontWeight:700,color:c}}>{lbl}</span>
                  </div>
                );
              })()
            ) : isActive ? (
              <button onClick={()=>checkOut(activeDay,activeSlotIdx,slot)}
                style={{flex:1,padding:"13px 0",borderRadius:14,background:"rgba(255,255,255,0.18)",border:"1.5px solid rgba(255,255,255,0.35)",color:"white",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                Done — rate it →
              </button>
            ) : (
              <>
                <button onClick={()=>checkIn(activeDay,activeSlotIdx)}
                  style={{flex:1,padding:"13px 0",borderRadius:14,background:slot.highlight?T.gold:T.sage,border:"none",color:"white",fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:"0.01em"}}>
                  I'm here →
                </button>
                {(() => {
                  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
                  const q = encodeURIComponent([slot.name, slot.neighborhood, city].filter(Boolean).join(" "));
                  const mapsHref = isIOS
                    ? `https://maps.apple.com/?q=${q}`
                    : `https://www.google.com/maps/search/?api=1&query=${q}`;
                  return (
                    <a
                      href={mapsHref}
                      target="_blank" rel="noopener noreferrer"
                      onClick={e=>e.stopPropagation()}
                      aria-label="Open in maps"
                      style={{width:46,borderRadius:14,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.18)",color:"white",fontSize:17,cursor:"pointer",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      🗺
                    </a>
                  );
                })()}
                <button onClick={(e)=>{e.stopPropagation();setSelectedPlace({name:slot.name,category:slot.category});}}
                  aria-label="Reviews and details"
                  style={{width:46,borderRadius:14,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.18)",color:"white",fontSize:15,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  ⓘ
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Swipe hint — shown once */}
      {showSwipeHint && (
        <div onClick={()=>{ setShowSwipeHint(false); localStorage.setItem("wandr-seen-swipe","1"); }}
          style={{position:"absolute",inset:0,background:"rgba(28,22,18,0.55)",zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:24,cursor:"pointer",backdropFilter:"blur(2px)"}}>
          <div style={{fontSize:36,marginBottom:12,animation:"pulse 1.5s ease infinite"}}>👈 👉</div>
          <div style={{fontSize:15,fontWeight:700,color:"white",marginBottom:6}}>Swipe to explore stops</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.6)"}}>Tap to dismiss</div>
        </div>
      )}

      {/* Lightbox — full-screen photo gallery */}
      {lightbox && (() => {
        const realPhotos = (Array.isArray(slot.photos) && slot.photos.length > 0) ? slot.photos : (slot.photo ? [slot.photo] : []);
        const fallback = pickFallbackPhoto(slot, city);
        const photos = realPhotos.length > 0 ? realPhotos : (fallback ? [fallback] : []);
        if (photos.length === 0) return null;
        const idx = Math.min(photoIdx, photos.length - 1);
        const prev = () => setPhotoIdx((idx - 1 + photos.length) % photos.length);
        const next = () => setPhotoIdx((idx + 1) % photos.length);
        return (
          <div
            onClick={()=>setLightbox(false)}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.96)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn 0.2s ease"}}>
            <button
              onClick={(e)=>{e.stopPropagation();setLightbox(false);}}
              aria-label="Close"
              style={{position:"absolute",top:"env(safe-area-inset-top,16px)",right:16,width:40,height:40,borderRadius:"50%",background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.18)",color:"white",fontSize:20,cursor:"pointer",zIndex:2,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            <img
              src={photos[idx]}
              alt={slot.name}
              onClick={e=>e.stopPropagation()}
              style={{maxWidth:"100%",maxHeight:"90vh",objectFit:"contain",animation:"fadeIn 0.2s ease"}}
            />
            {photos.length > 1 && (
              <>
                <button onClick={(e)=>{e.stopPropagation();prev();}} aria-label="Previous photo"
                  style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",width:44,height:44,borderRadius:"50%",background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.18)",color:"white",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
                <button onClick={(e)=>{e.stopPropagation();next();}} aria-label="Next photo"
                  style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",width:44,height:44,borderRadius:"50%",background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.18)",color:"white",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
                <div style={{position:"absolute",bottom:"calc(env(safe-area-inset-bottom,16px) + 20px)",left:0,right:0,display:"flex",gap:6,justifyContent:"center"}}>
                  {photos.map((_,i)=>(
                    <div key={i} style={{width:i===idx?18:6,height:6,borderRadius:3,background:i===idx?"white":"rgba(255,255,255,0.4)",transition:"all 0.2s"}}/>
                  ))}
                </div>
              </>
            )}
            <div style={{position:"absolute",bottom:"calc(env(safe-area-inset-bottom,16px) + 48px)",left:0,right:0,textAlign:"center",color:"rgba(255,255,255,0.85)",fontSize:13,fontWeight:600,padding:"0 20px",textShadow:"0 1px 6px rgba(0,0,0,0.6)"}}>{slot.name}</div>
          </div>
        );
      })()}

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
          {activeSlotIdx>0&&<>← <span style={{fontSize:11,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{slots[activeSlotIdx-1]?.name}</span></>}
        </button>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {slots.map((_,i)=>(
            <div key={i} onClick={()=>setActiveSlotIdx(i)}
              style={{width:i===activeSlotIdx?20:6,height:6,borderRadius:3,background:ratings[`${activeDay}-${i}`]!==undefined?T.sage:i===activeSlotIdx?T.ink:T.dust,transition:"all 0.2s",cursor:"pointer"}}/>
          ))}
        </div>
        <button onClick={()=>activeSlotIdx<slots.length-1&&setActiveSlotIdx(i=>i+1)}
          style={{background:"none",border:"none",color:activeSlotIdx<slots.length-1?T.inkLight:T.dust,fontSize:13,fontWeight:600,cursor:activeSlotIdx<slots.length-1?"pointer":"default",padding:"8px 4px",display:"flex",alignItems:"center",gap:4}}>
          {activeSlotIdx<slots.length-1&&<><span style={{fontSize:11,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{slots[activeSlotIdx+1]?.name}</span> →</>}
        </button>
      </div>
    </div>
  );
}

export { MomentCards };