import { useState, useEffect, useRef } from "react";
import { GLOBAL_CSS, NAV_H, T, TRANSIT_COLORS, TRANSIT_ICONS } from "./constants.jsx";
import { MomentCards } from "./MomentCards.jsx";
import { PlaceSheet } from "./PlaceSheet.jsx";
import { ShareCard } from "./ShareCard.jsx";
import { parseTripDays, countDays } from "./utils.jsx";
function ItineraryView({ city, dates, moodContext, profile, onBack, onSave, preloadedDays, supabase, user }) {
  const [daysData, setDaysData]   = useState(preloadedDays || []);
  const [status, setStatus]       = useState(preloadedDays?.length > 0 ? "done" : "loading");
  const [statusMsg, setStatusMsg] = useState("");
  const [activeDay, setActiveDay] = useState(0);
  const [loadingDay, setLoadingDay] = useState(1);
  const [showShare, setShowShare] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showChat, setShowChat]   = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [tripSaved, setTripSaved] = useState(false);
  const [savedTripId, setSavedTripId] = useState(preloadedDays?.length ? "preloaded" : null);
  const [activeSlot, setActiveSlot] = useState(null); // index of slot user is currently at
  const [ratings, setRatings]     = useState({}); // { "dayIdx-slotIdx": 1-5 }
  const [showRating, setShowRating] = useState(null); // { dayIdx, slotIdx, slot }
  const [showDaySummary, setShowDaySummary] = useState(null); // day data after completion
  const [viewMode, setViewMode] = useState("story"); // "story" | "plan"
  const savedRef = useRef(false);

  const totalDays = countDays(dates);
  const dayVibes  = moodContext.split("\n").filter(Boolean);

  const BACKEND = "http://192.168.12.108:3001";

  const generate = async () => {
    setStatus("loading"); setDaysData([]); setActiveDay(0); savedRef.current=false;
    setStatusMsg(`Building your ${totalDays}-day trip…`);

    // Generate all days in parallel — much faster than sequential
    const dayPromises = Array.from({ length: totalDays }, (_, i) => {
      const d = i + 1;
      return fetch(`${BACKEND}/itinerary/day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, dates, dayNum: d, dayVibe: dayVibes[d-1] || "open / flexible", totalDays, travelProfile: profile?.answers || null })
      })
        .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e.error || "Error")))
        .then(dayData => {
          // Add each day as it completes so UI updates progressively
          setDaysData(prev => {
            const next = [...prev];
            next[i] = dayData;
            const filled = next.filter(Boolean);
            if (filled.length === 1) { setStatus("partial"); setActiveDay(0); }
            setLoadingDay(filled.length + 1);
            return next;
          });
          return dayData;
        })
        .catch(e => { console.error(`Day ${d} error:`, e); return null; });
    });

    await Promise.all(dayPromises);
    setDaysData(prev => prev.filter(Boolean));
    setStatus("done");

    // Enrich slots with photos/hours in background after itinerary is shown
    setTimeout(() => enrichSlots(), 500);
  };

  const enrichSlots = async () => {
    setDaysData(prev => {
      prev.forEach((day, dayIdx) => {
        day?.slots?.forEach(async (slot, slotIdx) => {
          if (slot.confidence) return; // already enriched
          try {
            const res = await fetch(`${BACKEND}/enrich`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slot, city })
            });
            const enriched = await res.json();
            setDaysData(current => current.map((d, di) =>
              di !== dayIdx ? d : {
                ...d,
                slots: d.slots.map((s, si) => si === slotIdx ? { ...s, ...enriched } : s)
              }
            ));
          } catch(e) { /* enrichment optional */ }
        });
      });
      return prev;
    });
  };

  useEffect(()=>{ if (!preloadedDays?.length) generate(); }, []);

  const sendChat = async (msg) => {
    if (!msg.trim() || chatLoading) return;
    const day = daysData[activeDay];
    if (!day) return;
    setChatMessages(prev => [...prev, { role:"user", text:msg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch(`${BACKEND}/chat-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          message: msg,
          currentDay: day,
          profile: profile?.answers || null
        })
      });
      const data = await res.json();
      if (data.updatedDay) {
        setDaysData(prev => prev.map((d, i) => i === activeDay ? data.updatedDay : d));
        setChatMessages(prev => [...prev, { role:"assistant", text: data.message || "Done! I've updated your itinerary." }]);
      } else {
        setChatMessages(prev => [...prev, { role:"assistant", text: data.message || "I couldn't make that change. Try rephrasing." }]);
      }
    } catch(e) {
      setChatMessages(prev => [...prev, { role:"assistant", text:"Something went wrong. Try again." }]);
    }
    setChatLoading(false);
  };

  const saveTrip = async () => {
    if (tripSaved) return;
    onSave({ city, dates, moodContext, days:daysData, emoji:"✦", savedAt:Date.now() });
    setTripSaved(true);
    // Get the trip ID from Supabase for linking ratings
    if (supabase && user) {
      const { data } = await supabase.from("trips").select("id")
        .eq("user_id", user.id).eq("city", city).order("saved_at", {ascending:false}).limit(1);
      if (data?.[0]?.id) setSavedTripId(data[0].id);
    }
  };

  const checkIn = (dayIdx, slotIdx) => {
    setActiveSlot(`${dayIdx}-${slotIdx}`);
  };

  const checkOut = (dayIdx, slotIdx, slot) => {
    setActiveSlot(null);
    setShowRating({ dayIdx, slotIdx, slot });
  };

  const [ratingNote, setRatingNote] = useState("");
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingStatus, setRatingStatus] = useState(null); // null | "saving" | "saved" | "error"

  const submitRating = async (dayIdx, slotIdx, stars, note = "") => {
    const key = `${dayIdx}-${slotIdx}`;
    setRatings(prev => ({ ...prev, [key]: stars }));
    setShowRating(null);
    setRatingNote("");
    setRatingHover(0);

    // Save to Supabase if logged in
    if (supabase && user && stars > 0) {
      setRatingStatus("saving");
      const slot = daysData[dayIdx]?.slots?.[slotIdx];
      try {
        const { error } = await supabase.from("place_ratings").insert({
          user_id: user.id,
          place_name: slot?.name || "Unknown",
          city: city.split(",")[0].trim(),
          stars,
          note: note.trim() || null,
          is_public: true,
          rated_at: new Date().toISOString(),
          trip_id: savedTripId || null,
        });
        if (error) throw error;
        setRatingStatus("saved");
        window.dispatchEvent(new Event("wandr:rating-saved"));
      } catch(e) {
        console.error("Rating save error:", e);
        setRatingStatus("error");
      }
      setTimeout(() => setRatingStatus(null), 3000);
    }

    // Check if all slots in the day are rated
    const day = daysData[dayIdx];
    const allRated = day?.slots?.every((_, si) => {
      const k = `${dayIdx}-${si}`;
      return k === key || ratings[k];
    });
    if (allRated) setTimeout(() => setShowDaySummary({ day, dayIdx }), 400);
  };

  const BUCKET_COLORS = {morning:"#c49a3c",afternoon:"#4a7c59",evening:"#8b1a2f"};
  const TRANSIT_ICONS = { walk:"🚶", subway:"🚇", taxi:"🚕", bus:"🚌", tram:"🚊", "tuk-tuk":"🛺", ferry:"🚢", bike:"🚲", car:"🚗" };
  const TRANSIT_COLORS = { walk:"#4a7c59", subway:"#1e6b8a", taxi:"#c49a3c", bus:"#5a2d82", tram:"#255c3f", "tuk-tuk":"#b5600a", ferry:"#1a3a6b", bike:"#4a7c59", car:"#555" };
  const getBucket = t => {
    if (!t) return "morning";
    const h=parseInt(t.split(":")[0]); const pm=t.toLowerCase().includes("pm");
    const hour=pm&&h!==12?h+12:(!pm&&h===12?0:h);
    return hour<12?"morning":hour<17?"afternoon":"evening";
  };

  if (status==="error") return (
    <div style={{minHeight:"100vh",background:T.cream,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:32,fontFamily:"'DM Sans',sans-serif"}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{fontSize:40}}>⚠</div>
      <div style={{fontSize:18,fontWeight:700,color:T.ink}}>Couldn't build itinerary</div>
      <div style={{fontSize:13,color:T.inkFaint,textAlign:"center",maxWidth:300,lineHeight:1.6,background:T.paper,padding:"12px 16px",borderRadius:12}}>{statusMsg||"Unknown error"}</div>
      <button onClick={generate} style={{padding:"12px 28px",borderRadius:14,background:T.ink,border:"none",color:T.white,fontSize:14,fontWeight:700,cursor:"pointer"}}>Try again</button>
      <button onClick={onBack} style={{padding:"10px 20px",borderRadius:14,background:"none",border:`1px solid ${T.dust}`,color:T.inkFaint,fontSize:13,cursor:"pointer"}}>← Back to mood board</button>
    </div>
  );

  if (status==="loading"&&daysData.length===0) {
    const tips = [
      "Consulting locals and insiders…",
      "Matching spots to your vibes…",
      "Finding hidden gems…",
      "Checking neighborhood timing…",
      "Crafting your day's narrative…",
      "Picking the must-do moment…",
    ];
    const tipIdx = Math.floor((Date.now() / 3000)) % tips.length;
    return (
      <div style={{minHeight:"100vh",background:T.ink,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,padding:32,fontFamily:"'DM Sans',sans-serif"}}>
        <style>{GLOBAL_CSS}</style>
        {/* Animated logo */}
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:56,color:T.white,animation:"pulse 2s ease infinite",marginBottom:4}}>✦</div>

        {/* City */}
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700,color:T.white,textAlign:"center"}}>{city}</div>

        {/* Status */}
        <div style={{fontSize:14,fontWeight:600,color:"rgba(255,255,255,0.6)",textAlign:"center"}}>{statusMsg||"Building your itinerary…"}</div>

        {/* Rotating tip */}
        <div style={{fontSize:12,color:"rgba(255,255,255,0.3)",textAlign:"center",maxWidth:240,lineHeight:1.6,fontStyle:"italic",minHeight:36}}>
          {tips[tipIdx]}
        </div>

        {/* Day progress bars */}
        <div style={{display:"flex",gap:6,width:"100%",maxWidth:200,marginTop:4}}>
          {Array(totalDays).fill(null).map((_,i)=>(
            <div key={i} style={{flex:1,height:3,borderRadius:2,overflow:"hidden",background:"rgba(255,255,255,0.08)"}}>
              <div style={{
                height:"100%",borderRadius:2,
                transition:"width 0.6s ease",
                width:i<daysData.length?"100%":i===loadingDay-1?"50%":"0%",
                background:i<daysData.length?T.accent:"rgba(200,75,47,0.6)",
                animation:i===loadingDay-1?"shimmer 1.5s ease infinite":undefined,
                backgroundImage:i===loadingDay-1?`linear-gradient(90deg,rgba(200,75,47,0.3) 0%,${T.accent} 50%,rgba(200,75,47,0.3) 100%)`:undefined,
                backgroundSize:"200% auto"
              }}/>
            </div>
          ))}
        </div>

        {/* Day count */}
        <div style={{fontSize:11,color:"rgba(255,255,255,0.25)",letterSpacing:"0.1em",textTransform:"uppercase"}}>
          Day {loadingDay} of {totalDays}
        </div>
      </div>
    );
  }

  if (daysData.length===0) return (
    <div style={{minHeight:"100vh",background:T.cream,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:32,fontFamily:"'DM Sans',sans-serif"}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{fontSize:40}}>⚠</div>
      <div style={{fontSize:18,fontWeight:700,color:T.ink}}>Something went wrong</div>
      <div style={{fontSize:13,color:T.inkFaint,textAlign:"center",maxWidth:300,lineHeight:1.6,background:T.paper,padding:"12px 16px",borderRadius:12}}>{statusMsg||"No data returned. Please try again."}</div>
      <button onClick={generate} style={{padding:"12px 28px",borderRadius:14,background:T.ink,border:"none",color:T.white,fontSize:14,fontWeight:700,cursor:"pointer"}}>Try again</button>
      <button onClick={onBack} style={{padding:"10px 20px",borderRadius:14,background:"none",border:`1px solid ${T.dust}`,color:T.inkFaint,fontSize:13,cursor:"pointer"}}>← Back to mood board</button>
    </div>
  );
  const day = daysData[activeDay];
  const stillLoading = status==="loading"||status==="partial";

  return (
    <div style={{minHeight:"100vh",background:T.cream,fontFamily:"'DM Sans',sans-serif",paddingBottom:NAV_H}}>
      <style>{GLOBAL_CSS}</style>

      {showShare && <ShareCard city={city} dates={dates} days={daysData} moodContext={moodContext} onClose={()=>setShowShare(false)}/>}
      {selectedPlace && <PlaceSheet place={selectedPlace.name} city={city} category={selectedPlace.category} BACKEND={BACKEND} onClose={()=>setSelectedPlace(null)}/>}

      {/* Rating status toast */}
      {ratingStatus && (
        <div style={{position:"fixed",top:60,left:"50%",transform:"translateX(-50%)",zIndex:400,animation:"fadeUp 0.3s ease"}}>
          <div style={{background:ratingStatus==="error"?"#c84b2f":T.ink,color:"white",borderRadius:20,padding:"10px 20px",fontSize:13,fontWeight:700,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",whiteSpace:"nowrap"}}>
            {ratingStatus==="saving" ? "Saving rating…" : ratingStatus==="saved" ? "✦ Shared with friends" : "⚠ Couldn't save rating"}
          </div>
        </div>
      )}

      {/* Rating modal — Beli-style */}
      {showRating && (
        <div style={{position:"fixed",inset:0,background:"rgba(28,22,18,0.75)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn 0.2s ease"}} onClick={()=>{setShowRating(null);setRatingNote("");setRatingHover(0);}}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.white,borderRadius:"28px 28px 0 0",width:"100%",maxWidth:480,padding:"24px 24px 48px",animation:"slideUp 0.3s ease",fontFamily:"'DM Sans',sans-serif"}}>
            <div style={{width:36,height:4,borderRadius:2,background:T.dust,margin:"0 auto 20px"}}/>

            {/* Place info */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${T.ink},#2d1f10)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                {showRating.slot.is_meal ? "🍽" : "📍"}
              </div>
              <div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:T.ink,lineHeight:1.2}}>{showRating.slot.name}</div>
                <div style={{fontSize:12,color:T.inkFaint}}>{showRating.slot.neighborhood} · {city.split(",")[0]}</div>
              </div>
            </div>

            {/* Star rating */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:T.inkFaint,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12,textAlign:"center"}}>How was it?</div>
              <div style={{display:"flex",justifyContent:"center",gap:8}}>
                {[1,2,3,4,5].map(star => {
                  const filled = star <= (ratingHover || ratings[`${showRating.dayIdx}-${showRating.slotIdx}`] || 0);
                  return (
                    <button key={star}
                      onClick={()=>setRatings(prev=>({...prev,[`${showRating.dayIdx}-${showRating.slotIdx}`]:star}))}
                      onMouseEnter={()=>setRatingHover(star)}
                      onMouseLeave={()=>setRatingHover(0)}
                      style={{fontSize:44,background:"none",border:"none",cursor:"pointer",transition:"transform 0.1s",transform:star===(ratingHover||0)?"scale(1.25)":"scale(1)",lineHeight:1,color:filled?T.gold:T.dust}}>
                      ★
                    </button>
                  );
                })}
              </div>
              {/* Star label */}
              <div style={{textAlign:"center",fontSize:12,color:T.inkFaint,marginTop:8,minHeight:18}}>
                {["","Didn't enjoy it","It was okay","Good spot","Really liked it","Absolutely loved it"][(ratingHover || ratings[`${showRating.dayIdx}-${showRating.slotIdx}`] || 0)]}
              </div>
            </div>

            {/* Note input */}
            <div style={{marginBottom:16}}>
              <input
                value={ratingNote}
                onChange={e=>setRatingNote(e.target.value)}
                placeholder="Add a note for friends… (optional)"
                style={{width:"100%",padding:"12px 14px",borderRadius:14,border:`1.5px solid ${ratingNote?T.accent:T.dust}`,background:T.cream,color:T.ink,fontSize:14,outline:"none",transition:"border-color 0.2s"}}/>
            </div>

            {/* Actions */}
            <div style={{display:"flex",gap:10}}>
              <button
                onClick={()=>submitRating(showRating.dayIdx, showRating.slotIdx, ratings[`${showRating.dayIdx}-${showRating.slotIdx}`]||0, ratingNote)}
                disabled={!ratings[`${showRating.dayIdx}-${showRating.slotIdx}`]}
                style={{flex:1,padding:14,borderRadius:16,background:ratings[`${showRating.dayIdx}-${showRating.slotIdx}`]?`linear-gradient(135deg,${T.accent},#9b2020)`:T.dust,border:"none",color:"white",fontSize:14,fontWeight:800,cursor:ratings[`${showRating.dayIdx}-${showRating.slotIdx}`]?"pointer":"default",boxShadow:ratings[`${showRating.dayIdx}-${showRating.slotIdx}`]?"0 6px 20px rgba(200,75,47,0.3)":"none",transition:"all 0.2s"}}>
                {user ? "Rate & share ✦" : "Save rating"}
              </button>
              <button onClick={()=>submitRating(showRating.dayIdx, showRating.slotIdx, 0)}
                style={{padding:"14px 16px",borderRadius:16,background:T.paper,border:`1px solid ${T.dust}`,color:T.inkFaint,fontSize:13,fontWeight:600,cursor:"pointer"}}>
                Skip
              </button>
            </div>
            {user && (
              <div style={{textAlign:"center",fontSize:11,color:T.inkFaint,marginTop:10}}>
                Your rating will be visible to friends ✦
              </div>
            )}
          </div>
        </div>
      )}

      {/* Day summary modal */}
      {showDaySummary && (
        <div style={{position:"fixed",inset:0,background:"rgba(28,22,18,0.75)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn 0.2s ease"}}>
          <div style={{background:T.white,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,padding:"28px 24px 48px",animation:"slideUp 0.3s ease",fontFamily:"'DM Sans',sans-serif"}}>
            <div style={{width:36,height:4,borderRadius:2,background:T.dust,margin:"0 auto 20px"}}/>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:36,marginBottom:8}}>🌟</div>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:T.ink,marginBottom:6}}>Day {showDaySummary.day.day} complete!</h2>
              <div style={{fontSize:13,color:T.inkFaint,fontStyle:"italic"}}>{showDaySummary.day.theme}</div>
            </div>
            {showDaySummary.day.slots?.map((slot, si)=>{
              const r = ratings[`${showDaySummary.dayIdx}-${si}`];
              return r ? (
                <div key={si} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${T.dust}`}}>
                  <div style={{fontSize:14,fontWeight:600,color:T.ink}}>{slot.name}</div>
                  <div style={{display:"flex",gap:2}}>
                    {[1,2,3,4,5].map(s=>(
                      <span key={s} style={{fontSize:14,color:s<=r?T.gold:T.dust}}>★</span>
                    ))}
                  </div>
                </div>
              ) : null;
            })}
            <button onClick={()=>setShowDaySummary(null)}
              style={{width:"100%",marginTop:20,padding:15,borderRadius:16,background:T.ink,border:"none",color:T.white,fontSize:15,fontWeight:700,cursor:"pointer"}}>
              {showDaySummary.dayIdx < daysData.length-1 ? `On to Day ${showDaySummary.dayIdx+2} →` : "That's a wrap! ✦"}
            </button>
          </div>
        </div>
      )}

      {/* AI Chat Panel */}
      {showChat && (
        <div style={{position:"fixed",inset:0,background:"rgba(28,22,18,0.6)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn 0.2s ease"}} onClick={()=>setShowChat(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.white,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,height:"70vh",display:"flex",flexDirection:"column",animation:"slideUp 0.3s ease",fontFamily:"'DM Sans',sans-serif"}}>
            {/* Chat header */}
            <div style={{padding:"14px 20px 12px",borderBottom:`1px solid ${T.dust}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:T.ink}}>Edit Day {daysData[activeDay]?.day}</div>
                <div style={{fontSize:11,color:T.inkFaint}}>Ask me to add, remove or swap anything</div>
              </div>
              <button onClick={()=>setShowChat(false)} style={{background:"none",border:"none",fontSize:20,color:T.inkFaint,cursor:"pointer"}}>×</button>
            </div>

            {/* Suggestion chips */}
            {chatMessages.length === 0 && (
              <div style={{padding:"12px 16px",display:"flex",gap:8,flexWrap:"wrap",borderBottom:`1px solid ${T.dust}`}}>
                {["Add a rooftop bar after dinner","Make it more local, less touristy","Swap lunch for street food","Add a morning coffee stop","Make day more adventurous"].map(s=>(
                  <button key={s} onClick={()=>sendChat(s)}
                    style={{padding:"7px 12px",borderRadius:20,background:T.paper,border:`1px solid ${T.dust}`,fontSize:12,fontWeight:600,color:T.inkLight,cursor:"pointer",flexShrink:0}}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Messages */}
            <div style={{flex:1,overflowY:"auto",padding:"16px"}}>
              {chatMessages.map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:10}}>
                  <div style={{maxWidth:"80%",padding:"10px 14px",borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:m.role==="user"?T.ink:T.paper,color:m.role==="user"?T.white:T.ink,fontSize:13,lineHeight:1.5}}>
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{display:"flex",justifyContent:"flex-start",marginBottom:10}}>
                  <div style={{padding:"10px 14px",borderRadius:"18px 18px 18px 4px",background:T.paper,color:T.inkFaint,fontSize:13,animation:"pulse 1s ease infinite"}}>
                    Updating your itinerary…
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{padding:"12px 16px 28px",borderTop:`1px solid ${T.dust}`,display:"flex",gap:8}}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&sendChat(chatInput)}
                placeholder="Add a jazz bar, swap dinner, make it more local…"
                style={{flex:1,padding:"12px 14px",borderRadius:14,border:`1.5px solid ${T.dust}`,background:T.cream,color:T.ink,fontSize:13,outline:"none"}}/>
              <button onClick={()=>sendChat(chatInput)} disabled={!chatInput.trim()||chatLoading}
                style={{padding:"12px 16px",borderRadius:14,background:chatInput.trim()?T.ink:T.dust,border:"none",color:T.white,fontSize:13,fontWeight:700,cursor:chatInput.trim()?"pointer":"default"}}>
                →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating chat button */}
      {status==="done" && !showChat && (
        <button onClick={()=>setShowChat(true)}
          style={{position:"fixed",bottom:NAV_H+16,right:20,width:52,height:52,borderRadius:"50%",background:T.ink,border:"none",boxShadow:"0 4px 20px rgba(28,22,18,0.25)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,zIndex:50,animation:"fadeUp 0.3s ease"}}>
          ✏
        </button>
      )}

      {/* Header */}
      <div style={{background:`linear-gradient(160deg,${T.ink} 0%,#2d1f10 100%)`,padding:"48px 20px 20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:20,padding:"6px 14px",color:"rgba(255,255,255,0.6)",fontSize:12,fontWeight:600,cursor:"pointer"}}>← Mood board</button>
          {status==="done" && (
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={saveTrip} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:20,padding:"6px 14px",color:tripSaved?T.gold:"rgba(255,255,255,0.6)",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {tripSaved ? "✦ Saved" : "♥ Save"}
              </button>
              <button onClick={()=>setShowShare(true)} style={{background:T.accent,border:"none",borderRadius:20,padding:"6px 14px",color:T.white,fontSize:12,fontWeight:700,cursor:"pointer"}}>Share ↗</button>
            </div>
          )}
        </div>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(196,154,60,0.7)",marginBottom:6}}>✦ YOUR ITINERARY</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,color:T.white,marginBottom:4}}>{city}</div>
        {dates&&<div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>{dates}</div>}
        {/* Day progress bars */}
        <div style={{display:"flex",gap:5,marginTop:14}}>
          {Array(totalDays).fill(null).map((_,i)=>(
            <div key={i} onClick={()=>i<daysData.length&&setActiveDay(i)}
              style={{flex:1,height:3,borderRadius:2,background:i<daysData.length?(i===activeDay?T.accent:"rgba(200,75,47,0.4)"):i===loadingDay-1?"rgba(200,75,47,0.2)":"rgba(255,255,255,0.1)",cursor:i<daysData.length?"pointer":"default",transition:"all 0.3s",animation:i===loadingDay-1&&daysData.length<=i?"pulse 1s ease infinite":undefined}}/>
          ))}
        </div>
        {stillLoading&&<div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:8}}>{statusMsg}</div>}
      </div>

      {/* Day selector + mode toggle */}
      <div style={{display:"flex",alignItems:"center",padding:"14px 16px 0",gap:8}}>
        <div style={{display:"flex",gap:8,overflowX:"auto",flex:1}}>
          {Array(totalDays).fill(null).map((_,i)=>{
            const ready=i<daysData.length, active=activeDay===i;
            return (
              <button key={i} onClick={()=>ready&&setActiveDay(i)} disabled={!ready}
                style={{flexShrink:0,padding:"7px 14px",borderRadius:20,border:`2px solid ${active?T.ink:ready?T.dust:"transparent"}`,background:active?T.ink:ready?T.white:T.paper,color:active?T.white:ready?T.inkLight:T.dust,fontSize:12,fontWeight:700,cursor:ready?"pointer":"default",display:"flex",alignItems:"center",gap:5}}>
                Day {i+1}
                {!ready&&<span style={{fontSize:10,animation:"pulse 1s ease infinite",opacity:0.5}}>…</span>}
              </button>
            );
          })}
        </div>
        {/* Mode toggle */}
        <div style={{display:"flex",background:T.paper,borderRadius:20,padding:3,gap:2,flexShrink:0,border:`1px solid ${T.dust}`}}>
          <button onClick={()=>setViewMode("story")}
            style={{padding:"5px 12px",borderRadius:16,background:viewMode==="story"?T.ink:"transparent",border:"none",color:viewMode==="story"?"white":T.inkFaint,fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
            ▶ Story
          </button>
          <button onClick={()=>setViewMode("plan")}
            style={{padding:"5px 12px",borderRadius:16,background:viewMode==="plan"?T.ink:"transparent",border:"none",color:viewMode==="plan"?"white":T.inkFaint,fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
            ☰ Plan
          </button>
        </div>
      </div>

      {/* Story mode — swipeable moment cards */}
      {viewMode === "story" && (
        <MomentCards
          day={day}
          activeDay={activeDay}
          ratings={ratings}
          activeSlot={activeSlot}
          checkIn={checkIn}
          checkOut={checkOut}
          setSelectedPlace={setSelectedPlace}
          BUCKET_COLORS={BUCKET_COLORS}
          getBucket={getBucket}
          TRANSIT_ICONS={TRANSIT_ICONS}
          TRANSIT_COLORS={TRANSIT_COLORS}
          onUpdateSlots={(newSlots) => {
            setDaysData(prev => prev.map((d, i) =>
              i === activeDay ? { ...d, slots: newSlots } : d
            ));
          }}
        />
      )}

      {/* Plan mode — draggable list */}
      {viewMode === "plan" && (
        <PlanMode
          day={day}
          activeDay={activeDay}
          ratings={ratings}
          BUCKET_COLORS={BUCKET_COLORS}
          getBucket={getBucket}
          TRANSIT_ICONS={TRANSIT_ICONS}
          TRANSIT_COLORS={TRANSIT_COLORS}
          setSelectedPlace={setSelectedPlace}
          onUpdateSlots={(newSlots) => {
            setDaysData(prev => prev.map((d, i) =>
              i === activeDay ? { ...d, slots: newSlots } : d
            ));
          }}
        />
      )}

    </div>
  );
}

// ─────────────────────────────────────────────
// PLAN MODE — draggable list view
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

  return (
    <div style={{padding:"12px 16px",paddingBottom:NAV_H+80}}>
      {/* Header */}
      <div style={{marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:3}}>Day {day?.day}</div>
        <div style={{fontFamily:"Playfair Display,serif",fontSize:18,fontStyle:"italic",color:T.ink,marginBottom:swapIdx!==null?8:0}}>{day?.theme}</div>
        {swapIdx !== null && (
          <div style={{background:`${T.sage}10`,border:`1px solid ${T.sage}25`,borderRadius:10,padding:"8px 12px",fontSize:11,color:T.sage,fontWeight:600}}>
            Tap another card to swap with "{localSlots[swapIdx]?.name?.split(' ')[0]}"
          </div>
        )}
        {error && (
          <div style={{marginTop:6,background:"rgba(200,75,47,0.07)",border:"1px solid rgba(200,75,47,0.2)",borderRadius:10,padding:"8px 12px",fontSize:11,color:"#c84b2f",display:"flex",gap:6}}>
            <span>🚫</span><span>{error}</span>
          </div>
        )}
      </div>

      {localSlots.map((slot, i) => {
        const bc = BUCKET_COLORS[getBucket(slot.time)] || T.gold;
        const rating = ratings[`${activeDay}-${i}`];
        const isCompleted = rating !== undefined;
        const isSwapSelected = swapIdx === i;
        const isSwapTarget = swapIdx !== null && swapIdx !== i;
        const isEditingTime = editingTimeIdx === i;
        const nextSlot = localSlots[i + 1];
        const mode = nextSlot?.transit_mode || "walk";

        return (
          <div key={`${slot.name}-${i}`}>
            <div style={{
              display:"flex",
              alignItems:"center",
              gap:8,
              background: isSwapSelected ? `${T.sage}18` : isCompleted ? "#f6f6f6" : T.white,
              borderRadius:16,
              padding:"10px 12px",
              marginBottom:2,
              border:`2px solid ${isSwapSelected ? T.sage : isSwapTarget ? `${T.gold}80` : T.dust}`,
              boxShadow: isSwapSelected ? `0 0 0 3px ${T.sage}20` : "0 1px 6px rgba(28,22,18,0.05)",
              transition:"all 0.15s",
            }}>

              {/* Up/Down arrows */}
              <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
                <button onClick={()=>{setSwapIdx(null);moveCard(i,-1);}} disabled={i===0}
                  style={{width:24,height:24,borderRadius:8,border:`1px solid ${T.dust}`,background:i===0?T.paper:T.white,color:i===0?T.dust:T.inkLight,fontSize:12,cursor:i===0?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>↑</button>
                <button onClick={()=>{setSwapIdx(null);moveCard(i,1);}} disabled={i===localSlots.length-1}
                  style={{width:24,height:24,borderRadius:8,border:`1px solid ${T.dust}`,background:i===localSlots.length-1?T.paper:T.white,color:i===localSlots.length-1?T.dust:T.inkLight,fontSize:12,cursor:i===localSlots.length-1?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>↓</button>
              </div>

              {/* Time — tappable */}
              <div onClick={(e)=>{e.stopPropagation();setSwapIdx(null);setEditingTimeIdx(isEditingTime?null:i);}}
                style={{width:54,flexShrink:0,textAlign:"center",cursor:"pointer",padding:"3px 5px",borderRadius:8,background:isEditingTime?`${bc}15`:"transparent",border:`1.5px solid ${isEditingTime?bc:"transparent"}`,transition:"all 0.15s"}}>
                <div style={{fontSize:11,fontWeight:800,color:bc,lineHeight:1}}>{slot.time}</div>
                <div style={{fontSize:9,color:T.inkFaint,marginTop:1}}>{slot.end_time}</div>
                {slot.confidence === "verified" && <div style={{fontSize:8,color:T.sage,marginTop:1}}>✅</div>}
                {slot.confidence === "unverified" && <div style={{fontSize:8,color:"#c84b2f",marginTop:1}}>⚠️</div>}
              </div>

              {/* Color bar */}
              <div style={{width:3,height:36,borderRadius:2,background:slot.highlight?T.gold:bc,flexShrink:0}}/>

              {/* Content — tap to swap */}
              <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>handleSwap(i)}>
                <div style={{fontSize:13,fontWeight:700,color:isCompleted?T.inkFaint:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
                  {slot.highlight && <span style={{fontSize:10,color:T.gold}}>★</span>}
                  {slot.name}
                  {isSwapSelected && <span style={{fontSize:10,color:T.sage,marginLeft:2}}>← selected</span>}
                </div>
                <div style={{fontSize:10,color:T.inkFaint,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📍 {slot.neighborhood}</div>
              </div>

              {/* Right */}
              <div style={{flexShrink:0,textAlign:"right"}}>
                {slot.price && <div style={{fontSize:10,color:T.inkFaint,marginBottom:2}}>{slot.price}</div>}
                {isCompleted
                  ? <div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(s=><span key={s} style={{fontSize:9,color:s<=rating?T.gold:T.dust}}>★</span>)}</div>
                  : slot.highlight ? <span style={{fontSize:9,fontWeight:700,color:T.gold}}>Top pick</span> : null}
              </div>
            </div>

            {/* Time editor */}
            {isEditingTime && (
              <div style={{background:`${bc}08`,borderRadius:14,padding:"12px 14px",marginBottom:4,border:`1px solid ${bc}20`,animation:"fadeUp 0.15s ease"}}>
                <div style={{fontSize:10,fontWeight:700,color:bc,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>{slot.name}</div>
                {slot.opening_hours?.length > 0 && (
                  <div style={{fontSize:10,color:T.sage,marginBottom:8,display:"flex",gap:4}}>
                    <span>🕐</span><span>{slot.opening_hours[new Date().getDay()===0?6:new Date().getDay()-1]}</span>
                  </div>
                )}
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <div>
                    <div style={{fontSize:10,color:T.inkFaint,marginBottom:5,fontWeight:600}}>Start time</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      {[-60,-45,-30,-15,15,30,45,60].map(d=>(
                        <button key={d} onClick={(e)=>{e.stopPropagation();adjustTime(i,'time',d);}}
                          style={{padding:"5px 8px",borderRadius:8,background:d<0?"#fef2f2":"#f0faf5",border:`1px solid ${d<0?"#fcc":"#b8e0c8"}`,color:d<0?"#c84b2f":T.sage,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                          {d>0?`+${d}`:`${d}`}m
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:T.inkFaint,marginBottom:5,fontWeight:600}}>Duration</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      {[-30,-15,15,30,60].map(d=>(
                        <button key={d} onClick={(e)=>{e.stopPropagation();adjustTime(i,'end_time',d);}}
                          style={{padding:"5px 8px",borderRadius:8,background:d<0?"#fef2f2":"#f0faf5",border:`1px solid ${d<0?"#fcc":"#b8e0c8"}`,color:d<0?"#c84b2f":T.sage,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                          {d>0?`+${d}`:`${d}`}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {slot.hours_warning && (
                  <div style={{marginTop:8,fontSize:10,color:"#c84b2f",display:"flex",gap:4}}>
                    <span>⚠️</span><span>{slot.hours_warning}</span>
                  </div>
                )}
                <button onClick={(e)=>{e.stopPropagation();setEditingTimeIdx(null);}}
                  style={{marginTop:8,padding:"5px 12px",borderRadius:8,background:T.ink,border:"none",color:"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  Done
                </button>
              </div>
            )}

            {/* Transit connector */}
            {nextSlot && (
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"2px 8px 2px 52px",marginBottom:2}}>
                <div style={{width:1,height:12,background:T.dust}}/>
                <span style={{fontSize:12}}>{TRANSIT_ICONS[mode]||"🚶"}</span>
                <span style={{fontSize:10,color:TRANSIT_COLORS[mode]||T.inkFaint,fontWeight:600}}>
                  {nextSlot.transit_from_prev||(mode==="walk"?"5 min walk":"10 min")}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { ItineraryView };