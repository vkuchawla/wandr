import { useState, useEffect, useRef } from "react";
import { GLOBAL_CSS, NAV_H, T, TRANSIT_COLORS, TRANSIT_ICONS, CITY_PHOTOS } from "./constants.jsx";
import { MomentCards } from "./MomentCards.jsx";
import { PlaceSheet } from "./PlaceSheet.jsx";
import { ShareCard } from "./ShareCard.jsx";
import { RatingSheet } from "./RatingSheet.jsx";
import { parseTripDays, countDays } from "./utils.jsx";
import { AuthGateModal } from "./Auth.jsx";
// Parse trip start date and compute date for each day
const getDayDate = (dates, dayIdx) => {
  if (!dates) return null;
  const match = dates.match(/([A-Za-z]+\s+\d+)/);
  if (!match) return null;
  try {
    const year = dates.match(/\d{4}/)?.[0] || new Date().getFullYear();
    const base = new Date(`${match[1]}, ${year}`);
    base.setDate(base.getDate() + dayIdx);
    return base.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
  } catch { return null; }
};

// Returns YYYYMMDD for Google Calendar URLs
const getCalendarDate = (dates, dayIdx) => {
  if (!dates) return null;
  const match = dates.match(/([A-Za-z]+\s+\d+)/);
  if (!match) return null;
  try {
    const year = dates.match(/\d{4}/)?.[0] || new Date().getFullYear();
    const base = new Date(`${match[1]}, ${year}`);
    base.setDate(base.getDate() + dayIdx);
    return base.toISOString().slice(0, 10).replace(/-/g, "");
  } catch { return null; }
};

function ItineraryView({ city, dates, moodContext, homeBase, profile, onBack, onSave, preloadedDays, onDaysGenerated, supabase, user }) {
  // Deduplicate days — keep only first occurrence of each day number
  const dedupeDays = (days) => {
    const seen = new Set();
    return (days || []).filter(d => { if (seen.has(d.day)) return false; seen.add(d.day); return true; });
  };
  const [daysData, setDaysData] = useState(dedupeDays(preloadedDays));
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
  const [chatError, setChatError] = useState(null);
  const [undoStack, setUndoStack] = useState([]); // for undo after AI edits
  const [tripSaved, setTripSaved] = useState(false);
  const [savedTripId, setSavedTripId] = useState(preloadedDays?.length ? "preloaded" : null);
  const [showSaveNudge, setShowSaveNudge] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [failedDays, setFailedDays] = useState({}); // dayNum → error string
  const [activeSlot, setActiveSlot] = useState(null); // index of slot user is currently at
  const ratingsKey = `wandr-ratings-${city}-${dates}`;
  const [ratings, setRatings] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ratingsKey) || "{}"); } catch { return {}; }
  });
  const [showRating, setShowRating] = useState(null); // { dayIdx, slotIdx, slot }
  const [showDaySummary, setShowDaySummary] = useState(null); // day data after completion
  const [viewMode, setViewMode] = useState("story"); // "story" | "plan"
  const [loadingTipIdx, setLoadingTipIdx] = useState(0);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const savedRef = useRef(false);

  const totalDays = countDays(dates);
  const dayVibes  = moodContext.split("\n").filter(Boolean);

  const BACKEND = import.meta.env.VITE_BACKEND || (import.meta.env.PROD ? "https://wandr-62i6.onrender.com" : "");
  const localKey = `wandr-itinerary-${city}-${dates}`;

  const cityShort = city?.split(",")[0] || city;

  const ratingCount = Object.keys(ratings).length;
  const travelDna = profile?.travel_dna;

  const LOADING_TIPS = [
    `Asking locals in ${cityShort}…`,
    travelDna ? `Tailoring picks for the ${travelDna}…` : "Matching spots to your vibes…",
    "Finding hidden gems off the tourist trail…",
    "Checking neighborhood timing & opening hours…",
    ratingCount > 0 ? `Applying your ${ratingCount} place rating${ratingCount > 1 ? "s" : ""}…` : "Crafting your day's narrative…",
    "Picking the must-do moment of the day…",
    "Sourcing the best photo spots…",
    "Curating the perfect pace for you…",
  ];

  // Sync generated days back to parent so resume doesn't re-fetch
  useEffect(() => {
    if (daysData.length > 0) {
      onDaysGenerated?.(daysData);
      // Keep localStorage in sync (but don't overwrite during generation — that's handled inline)
      if (status === "done") {
        try { localStorage.setItem(localKey, JSON.stringify(daysData)); } catch {}
      }
    }
  }, [daysData]);

  // Rotate loading tips every 2.8s while generating
  useEffect(() => {
    if (status !== "loading" && status !== "partial") return;
    const interval = setInterval(() => {
      setLoadingTipIdx(i => (i + 1) % LOADING_TIPS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [status]);

  const fetchDay = async (d, usedPlaces, ratingHistory) => {
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        return await fetch(`${BACKEND}/itinerary/day`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            city, dates,
            dayNum: d,
            dayVibe: dayVibes[d-1] || "open / flexible",
            totalDays,
            travelProfile: profile?.answers || null,
            usedPlaces,
            homeBase: homeBase || null,
            ratingHistory,
          })
        }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e.error || "Error")));
      } catch(e) {
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
        } else {
          throw e;
        }
      }
    }
  };

  const retryDay = async (dayNum) => {
    setFailedDays(prev => { const n = {...prev}; delete n[dayNum]; return n; });
    const i = dayNum - 1;
    setStatusMsg(`Retrying Day ${dayNum}…`);
    const usedPlaces = daysData.flatMap(day => day?.slots?.map(s => s.name) || []);
    try {
      const dayData = await fetchDay(dayNum, usedPlaces, []);
      setDaysData(prev => {
        const updated = [...prev];
        // Insert or replace at correct position
        const existingIdx = updated.findIndex(d => d.day === dayNum);
        if (existingIdx >= 0) updated[existingIdx] = dayData;
        else updated.splice(i, 0, dayData);
        try { localStorage.setItem(localKey, JSON.stringify(updated)); } catch {}
        return updated;
      });
    } catch(e) {
      setFailedDays(prev => ({ ...prev, [dayNum]: String(e) }));
    }
    setStatusMsg("");
  };

  const generate = async () => {
    setStatus("loading"); setDaysData([]); setActiveDay(0); savedRef.current=false;
    setLoadingTipIdx(0); setFailedDays({});
    try { localStorage.removeItem(localKey); } catch {}

    // Fetch user's rating history to personalise generation
    let ratingHistory = [];
    if (supabase && user) {
      const { data: ratings } = await supabase
        .from("place_ratings")
        .select("place_name, city, stars")
        .eq("user_id", user.id)
        .order("rated_at", { ascending: false })
        .limit(30);
      ratingHistory = ratings || [];
    }

    // Generate days sequentially so each day knows what previous days used
    const allDays = [];
    const newFailedDays = {};
    for (let i = 0; i < totalDays; i++) {
      const d = i + 1;
      setStatusMsg(totalDays > 1 ? `Planning Day ${d} of ${totalDays}…` : `Planning your day in ${cityShort}…`);
      const usedPlaces = allDays.flatMap(day => day?.slots?.map(s => s.name) || []);
      try {
        const dayData = await fetchDay(d, usedPlaces, ratingHistory);
        allDays[i] = dayData;
        setDaysData([...allDays].filter(Boolean));
        setLoadingDay(i + 2);
        if (i === 0) { setStatus("partial"); setActiveDay(0); }
      } catch(e) {
        console.error(`Day ${d} error:`, e);
        allDays[i] = null;
        newFailedDays[d] = String(e);
      }
    }

    const finalDays = allDays.filter(Boolean);
    setDaysData(finalDays);
    setFailedDays(newFailedDays);
    setStatus("done");
    // Persist to localStorage
    try { localStorage.setItem(localKey, JSON.stringify(finalDays)); } catch {}
    // Show save nudge if user isn't logged in and trip generated successfully
    if (finalDays.length > 0 && !user) setTimeout(() => setShowSaveNudge(true), 3000);
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

  useEffect(()=>{
    if (preloadedDays?.length) return;
    // Try to restore from localStorage before fetching
    try {
      const cached = JSON.parse(localStorage.getItem(localKey) || "null");
      if (cached?.length > 0) {
        setDaysData(cached);
        setStatus("done");
        onDaysGenerated?.(cached);
        return;
      }
    } catch {}
    generate();
  }, []);

  // Keep Render backend warm — ping every 14 minutes to prevent cold starts
  useEffect(() => {
    const ping = () => fetch(`${BACKEND}/health`).catch(()=>{});
    ping(); // immediate ping on mount
    const interval = setInterval(ping, 14 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const sendChat = async (msg) => {
    if (!msg.trim() || chatLoading) return;
    const day = daysData[activeDay];
    if (!day) return;
    setChatError(null);
    setChatMessages(prev => [...prev, { role:"user", text:msg }]);
    setChatInput("");
    setChatLoading(true);

    // Save current state to undo stack before editing
    setUndoStack(prev => [...prev.slice(-4), { dayIdx: activeDay, day: JSON.parse(JSON.stringify(day)) }]);

    try {
      const dayDate = getDayDate(dates, activeDay);

      // Call backend chat-edit with full trip context
      let res;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          res = await fetch(`${BACKEND}/chat-edit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              city,
              dates,
              message: msg,
              currentDay: day,
              allDays: daysData,
              dayDate,
              profile: profile?.answers || null,
              history: chatMessages.slice(-6),
              ratings  // pass ratings so AI knows what user liked/disliked
            })
          });
          break;
        } catch(fetchErr) {
          if (attempt === 0) {
            await new Promise(r => setTimeout(r, 4000));
          } else throw fetchErr;
        }
      }
      const data = await res.json();
      if (data.updatedDay) {
        setDaysData(prev => prev.map((d, i) => i === activeDay ? data.updatedDay : d));
        setChatMessages(prev => [...prev, { role:"assistant", text: data.message || `Done! Updated Day ${day.day}${dayDate ? ` (${dayDate})` : ""}.`, success: true }]);
      } else {
        setChatMessages(prev => [...prev, { role:"assistant", text: data.message || "Couldn\'t make that change. Try rephrasing." }]);
      }
    } catch(e) {
      setChatError("Connection issue — try again");
      setChatMessages(prev => [...prev, { role:"assistant", text:"Something went wrong. Try again.", error: true }]);
    }
    setChatLoading(false);
  };

  const undoLastEdit = () => {
    if (!undoStack.length) return;
    const last = undoStack[undoStack.length - 1];
    setDaysData(prev => prev.map((d, i) => i === last.dayIdx ? last.day : d));
    setUndoStack(prev => prev.slice(0, -1));
    setChatMessages(prev => [...prev, { role:"assistant", text:"↩ Undone — restored previous version." }]);
  };

  const saveTrip = async () => {
    if (tripSaved) return;
    if (!user) { setShowAuthGate(true); return; }
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

  const [ratingStatus, setRatingStatus] = useState(null); // null | "saving" | "saved" | "error"

  const submitRating = async (dayIdx, slotIdx, stars, note = "") => {
    const key = `${dayIdx}-${slotIdx}`;
    setRatings(prev => {
      const next = { ...prev, [key]: stars };
      try { localStorage.setItem(ratingsKey, JSON.stringify(next)); } catch {}
      return next;
    });

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
    if (allRated) setTimeout(() => setShowDaySummary({ day, dayIdx }), 900);
  };

  const BUCKET_COLORS = {morning:"#c49a3c",afternoon:"#4a7c59",evening:"#8b1a2f"};
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
    const loadingCityPhoto = CITY_PHOTOS[cityShort];
    return (
      <div style={{minHeight:"100vh",background:T.ink,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:0,padding:32,fontFamily:"'DM Sans',sans-serif",position:"relative",overflow:"hidden"}}>
        <style>{GLOBAL_CSS}</style>

        {/* City photo background */}
        {loadingCityPhoto && (
          <img src={loadingCityPhoto} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.18,filter:"blur(12px)",transform:"scale(1.08)"}} />
        )}

        {/* Dark overlay */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(28,22,18,0.7) 0%,rgba(28,22,18,0.92) 100%)"}}/>

        {/* Background glow orbs */}
        <div style={{position:"absolute",top:"20%",left:"10%",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(200,75,47,0.1) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:"15%",right:"5%",width:240,height:240,borderRadius:"50%",background:"radial-gradient(circle,rgba(196,154,60,0.08) 0%,transparent 70%)",pointerEvents:"none"}}/>

        {/* Logo mark */}
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(196,154,60,0.5)",marginBottom:32}}>✦ WANDR</div>

        {/* Animated star */}
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:52,color:T.white,animation:"pulse 2s ease infinite",marginBottom:20}}>✦</div>

        {/* City */}
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:700,color:T.white,textAlign:"center",marginBottom:8,letterSpacing:"-0.5px"}}>{cityShort}</div>

        {/* Status — shows which day is being planned */}
        <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.45)",textAlign:"center",marginBottom:28,minHeight:20}}>
          {statusMsg || `Planning your trip…`}
        </div>

        {/* Day progress bars */}
        {totalDays > 1 && (
          <div style={{display:"flex",gap:6,width:"100%",maxWidth:180,marginBottom:24}}>
            {Array(totalDays).fill(null).map((_,i)=>(
              <div key={i} style={{flex:1,height:3,borderRadius:2,overflow:"hidden",background:"rgba(255,255,255,0.08)"}}>
                <div style={{
                  height:"100%",borderRadius:2,
                  transition:"width 0.8s ease",
                  width:i<daysData.length?"100%":i===loadingDay-1?"60%":"0%",
                  background:i<daysData.length?T.accent:T.accent,
                  animation:i===loadingDay-1?"shimmer 1.5s ease infinite":undefined,
                  backgroundImage:i===loadingDay-1?`linear-gradient(90deg,rgba(200,75,47,0.3) 0%,${T.accent} 50%,rgba(200,75,47,0.3) 100%)`:undefined,
                  backgroundSize:"200% auto"
                }}/>
              </div>
            ))}
          </div>
        )}

        {/* Rotating tip */}
        <div key={loadingTipIdx} style={{fontSize:12,color:"rgba(255,255,255,0.28)",textAlign:"center",maxWidth:220,lineHeight:1.7,fontStyle:"italic",animation:"fadeIn 0.5s ease"}}>
          {LOADING_TIPS[loadingTipIdx]}
        </div>

        {/* Personalization badge */}
        {(travelDna || ratingCount > 0) && (
          <div style={{marginTop:20,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
            {travelDna && (
              <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(196,154,60,0.55)",background:"rgba(196,154,60,0.08)",padding:"4px 10px",borderRadius:20,border:"1px solid rgba(196,154,60,0.15)"}}>
                ✦ {travelDna}
              </div>
            )}
            {ratingCount > 0 && (
              <div style={{fontSize:10,color:"rgba(255,255,255,0.22)",letterSpacing:"0.06em"}}>
                {ratingCount} rating{ratingCount > 1 ? "s" : ""} applied
              </div>
            )}
          </div>
        )}
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
      {showAuthGate && <AuthGateModal supabase={supabase} reason="save" onClose={()=>setShowAuthGate(false)}/>}

      {/* Save nudge — shown ~3s after generation if not logged in */}
      {showSaveNudge && (
        <div style={{position:"fixed",bottom:NAV_H+16,left:"50%",transform:"translateX(-50%)",zIndex:400,animation:"fadeUp 0.4s ease",maxWidth:340,width:"calc(100% - 40px)"}}>
          <div style={{background:T.ink,borderRadius:18,padding:"14px 18px",boxShadow:"0 8px 32px rgba(28,22,18,0.35)",display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:22}}>✦</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:"white",marginBottom:2}}>Save your itinerary</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Sign in to keep it & access anywhere.</div>
            </div>
            <button onClick={()=>{ setShowSaveNudge(false); saveTrip(); }} style={{padding:"8px 14px",borderRadius:12,background:T.accent,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>Save</button>
            <button onClick={()=>setShowSaveNudge(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.4)",fontSize:18,cursor:"pointer",padding:"0 4px",flexShrink:0,lineHeight:1}}>×</button>
          </div>
        </div>
      )}

      {/* Rating status toast */}
      {ratingStatus && (
        <div style={{position:"fixed",top:60,left:"50%",transform:"translateX(-50%)",zIndex:400,animation:"fadeUp 0.3s ease"}}>
          <div style={{background:ratingStatus==="error"?"#c84b2f":T.ink,color:"white",borderRadius:20,padding:"10px 20px",fontSize:13,fontWeight:700,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",whiteSpace:"nowrap"}}>
            {ratingStatus==="saving" ? "Saving rating…" : ratingStatus==="saved" ? "✦ Shared with friends" : "⚠ Couldn't save rating"}
          </div>
        </div>
      )}

      {/* Rating sheet — Beli-style */}
      {showRating && (
        <RatingSheet
          slot={showRating.slot}
          dayIdx={showRating.dayIdx}
          slotIdx={showRating.slotIdx}
          ratings={ratings}
          daysData={daysData}
          city={city}
          user={user}
          onSubmit={(dayIdx, slotIdx, score, note) => {
            submitRating(dayIdx, slotIdx, score, note);
          }}
          onClose={() => setShowRating(null)}
        />
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
            {(() => {
              const SCORE_COLORS = (s) => s>=9?"#22c55e":s>=7?"#84cc16":s>=5?"#eab308":s>=3?"#f97316":"#ef4444";
              const SCORE_LABELS = [,"Avoid","Regret it","Disappointing","Underwhelming","It was alright","Worth a visit","Solid pick","Really loved it","Exceptional","One of a kind"];
              const rated = showDaySummary.day.slots?.map((slot, si) => ({ slot, si, r: ratings[`${showDaySummary.dayIdx}-${si}`] })).filter(x => x.r > 0).sort((a,b) => b.r - a.r);
              return rated?.map(({ slot, si, r }) => (
                <div key={si} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${T.dust}`}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:SCORE_COLORS(r),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 2px 8px ${SCORE_COLORS(r)}44`}}>
                    <span style={{fontSize:14,fontWeight:900,color:"white"}}>{r}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{slot.name}</div>
                    <div style={{fontSize:11,color:T.inkFaint}}>{SCORE_LABELS[r]}</div>
                  </div>
                </div>
              ));
            })()}
            <button onClick={()=>{
              if (showDaySummary.dayIdx < daysData.length-1) setActiveDay(showDaySummary.dayIdx+1);
              setShowDaySummary(null);
            }}
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
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${T.accent},#9b2020)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>✦</div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:T.ink}}>
                    {daysData.length > 1 ? `Editing Day ${daysData[activeDay]?.day}` : "Edit your itinerary"}
                    {getDayDate(dates, activeDay) && <span style={{fontWeight:400,color:T.inkLight}}> · {getDayDate(dates, activeDay)}</span>}
                  </div>
                  <div style={{fontSize:11,color:T.inkFaint}}>{city?.split(",")[0]} · Add, remove, or swap anything</div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {undoStack.length > 0 && (
                  <button onClick={undoLastEdit}
                    style={{padding:"5px 10px",borderRadius:10,background:T.paper,border:`1px solid ${T.dust}`,fontSize:11,fontWeight:700,color:T.inkLight,cursor:"pointer"}}>
                    ↩ Undo
                  </button>
                )}
                <button onClick={()=>setShowChat(false)} style={{background:"none",border:"none",fontSize:20,color:T.inkFaint,cursor:"pointer",lineHeight:1}}>×</button>
              </div>
            </div>

            {/* Day dropdown */}
            {daysData.length > 1 && (
              <div style={{padding:"8px 16px",borderBottom:`1px solid ${T.dust}`}}>
                <select
                  value={activeDay}
                  onChange={e => { setActiveDay(Number(e.target.value)); setChatMessages([]); }}
                  style={{width:"100%",padding:"8px 12px",borderRadius:12,border:`1.5px solid ${T.dust}`,background:T.cream,color:T.ink,fontSize:13,fontWeight:600,outline:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                  {daysData.map((d,i) => {
                    const date = getDayDate(dates, i);
                    return (
                      <option key={i} value={i}>
                        Day {d.day}{date ? ` · ${date}` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Suggestion chips — context-aware based on current day */}
            {(chatMessages.length === 0 || chatMessages[chatMessages.length-1]?.role === "assistant") && !chatLoading && (
              <div style={{padding:"10px 16px",display:"flex",gap:6,flexWrap:"wrap",borderBottom:`1px solid ${T.dust}`}}>
                {(() => {
                  const day = daysData[activeDay];
                  const slots = day?.slots || [];
                  const cats = slots.map(s => (s.category||"").toLowerCase());
                  const hasBar = cats.some(c => c.includes("bar") || c.includes("cocktail") || c.includes("nightlife") || c.includes("drink"));
                  const hasCafe = cats.some(c => c.includes("cafe") || c.includes("coffee"));
                  const hasMeal = slots.some(s => s.is_meal);
                  const hasMuseum = cats.some(c => c.includes("museum") || c.includes("gallery") || c.includes("art"));
                  const worstRatingKey = slots.reduce((worst, _, i) => {
                    const k = `${activeDay}-${i}`;
                    const r = ratings[k];
                    if (!r) return worst;
                    if (!worst || r < (ratings[worst] || 11)) return k;
                    return worst;
                  }, null);
                  const worstSlot = worstRatingKey ? slots[parseInt(worstRatingKey.split("-")[1])] : null;
                  const chips = [];
                  if (worstSlot && ratings[worstRatingKey] <= 5) chips.push(`Replace ${worstSlot.name}`);
                  if (!hasBar) chips.push("Add a cocktail bar");
                  if (!hasCafe) chips.push("Add a morning coffee");
                  if (hasMuseum) chips.push("Swap museum for something active");
                  chips.push("Make it more local");
                  if (hasMeal) chips.push("Upgrade lunch to somewhere special");
                  chips.push("More off the beaten path");
                  chips.push("Shake up the whole day");
                  return chips.slice(0, 6).map(s => (
                    <button key={s} onClick={()=>sendChat(s)}
                      style={{padding:"5px 11px",borderRadius:20,background:T.paper,border:`1px solid ${T.dust}`,fontSize:11,fontWeight:600,color:T.inkLight,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
                      {s}
                    </button>
                  ));
                })()}
              </div>
            )}

            {/* Messages */}
            <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
              {chatMessages.length === 0 && (
                <div style={{textAlign:"center",padding:"20px 0",color:T.inkFaint}}>
                  <div style={{fontSize:28,marginBottom:8}}>✦</div>
                  <div style={{fontSize:13,fontWeight:600,color:T.ink,marginBottom:4}}>What should we change?</div>
                  <div style={{fontSize:12,color:T.inkFaint}}>Tap a suggestion or type your own edit</div>
                </div>
              )}
              {chatMessages.map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:10,alignItems:"flex-end",gap:8}}>
                  {m.role==="assistant" && (
                    <div style={{width:24,height:24,borderRadius:"50%",background:`linear-gradient(135deg,${T.accent},#9b2020)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0,marginBottom:2}}>✦</div>
                  )}
                  <div style={{maxWidth:"78%",padding:"10px 14px",borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:m.role==="user"?T.ink:m.error?"#fef2f2":m.success?`${T.sage}15`:T.paper,color:m.role==="user"?T.white:m.error?"#c84b2f":T.ink,fontSize:13,lineHeight:1.5,border:m.success?`1px solid ${T.sage}30`:"none"}}>
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{display:"flex",justifyContent:"flex-start",marginBottom:10,alignItems:"flex-end",gap:8}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:`linear-gradient(135deg,${T.accent},#9b2020)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>✦</div>
                  <div style={{padding:"10px 14px",borderRadius:"18px 18px 18px 4px",background:T.paper,fontSize:13}}>
                    <span style={{animation:"pulse 1s ease infinite",color:T.inkFaint}}>
                      Updating Day {daysData[activeDay]?.day}{getDayDate(dates, activeDay) ? ` · ${getDayDate(dates, activeDay)}` : ""}…
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{padding:"10px 16px 28px",borderTop:`1px solid ${T.dust}`}}>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&sendChat(chatInput)}
                  placeholder="Add a jazz bar, swap dinner, make it more local…"
                  style={{flex:1,padding:"12px 14px",borderRadius:14,border:`1.5px solid ${chatInput?T.accent:T.dust}`,background:T.cream,color:T.ink,fontSize:13,outline:"none",transition:"border-color 0.2s"}}/>
                <button onClick={()=>sendChat(chatInput)} disabled={!chatInput.trim()||chatLoading}
                  style={{width:44,height:44,borderRadius:14,background:chatInput.trim()?`linear-gradient(135deg,${T.accent},#9b2020)`:T.dust,border:"none",color:T.white,fontSize:18,fontWeight:700,cursor:chatInput.trim()?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:chatInput.trim()?"0 4px 14px rgba(200,75,47,0.3)":"none",transition:"all 0.2s"}}>
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Header */}
      <div style={{background:`linear-gradient(160deg,${T.ink} 0%,#2d1f10 100%)`,padding:"48px 20px 20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:20,padding:"6px 14px",color:"rgba(255,255,255,0.6)",fontSize:12,fontWeight:600,cursor:"pointer"}}>← Back</button>
          {status==="done" && (
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={saveTrip} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:20,padding:"6px 14px",color:tripSaved?T.gold:"rgba(255,255,255,0.6)",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {tripSaved ? "✦ Saved" : "♥ Save"}
              </button>
              <button onClick={async ()=>{
                if (savedTripId && savedTripId !== "preloaded") {
                  const url = `${window.location.origin}${window.location.pathname}?trip=${savedTripId}`;
                  navigator.clipboard.writeText(url).catch(()=>{});
                  setLinkCopied(true);
                  setTimeout(()=>setLinkCopied(false), 2500);
                } else if (user) {
                  // Save first then copy link
                  await saveTrip();
                  // Give Supabase a moment to write
                  setTimeout(async ()=>{
                    const { data } = await supabase.from("trips").select("id")
                      .eq("user_id", user.id).eq("city", city).order("saved_at", {ascending:false}).limit(1);
                    const id = data?.[0]?.id;
                    if (id) {
                      const url = `${window.location.origin}${window.location.pathname}?trip=${id}`;
                      navigator.clipboard.writeText(url).catch(()=>{});
                      setSavedTripId(id);
                      setLinkCopied(true);
                      setTimeout(()=>setLinkCopied(false), 2500);
                    }
                  }, 800);
                } else {
                  setShowShare(true);
                }
              }} style={{background:linkCopied?"#4a7c59":T.accent,border:"none",borderRadius:20,padding:"6px 14px",color:T.white,fontSize:12,fontWeight:700,cursor:"pointer",transition:"background 0.3s"}}>
                {linkCopied ? "✓ Link copied" : "Share ↗"}
              </button>
            </div>
          )}
        </div>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(196,154,60,0.7)",marginBottom:6}}>✦ YOUR ITINERARY</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,color:T.white,marginBottom:4}}>{city}</div>
        {dates&&<div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:6}}>{dates}</div>}
        {profile?.answers && (() => {
          const a = profile.answers;
          const traits = [];
          if (a.pace==="slow") traits.push("Slow pace");
          if (a.pace==="fast") traits.push("Packed days");
          if (a.vibe==="immerse") traits.push("Local spots");
          if (a.vibe==="relax") traits.push("Relaxed vibe");
          if (a.vibe==="explore") traits.push("Explorer");
          if (a.food==="everything") traits.push("Food-first");
          if (a.food==="local") traits.push("Local eats");
          if (a.budget==="luxury") traits.push("Luxury");
          if (a.budget==="budget") traits.push("Budget-friendly");
          if (a.companions==="solo") traits.push("Solo-friendly");
          if (a.companions==="partner") traits.push("Romantic");
          if (!traits.length) return null;
          return (
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginTop:2}}>
              <span style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontWeight:600,letterSpacing:"0.06em"}}>PERSONALIZED</span>
              {traits.slice(0,4).map(t=>(
                <span key={t} style={{fontSize:10,fontWeight:700,color:"rgba(196,154,60,0.8)",background:"rgba(196,154,60,0.1)",borderRadius:20,padding:"2px 8px",border:"1px solid rgba(196,154,60,0.2)"}}>{t}</span>
              ))}
            </div>
          );
        })()}
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
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          {/* Open today's route in Google Maps */}
          {day?.slots?.length > 1 && (() => {
            const stops = day.slots.map(s => encodeURIComponent(`${s.name}, ${city}`));
            const mapsUrl = `https://www.google.com/maps/dir/${stops.join("/")}`;
            return (
              <a href={mapsUrl} target="_blank" rel="noreferrer"
                style={{padding:"5px 10px",borderRadius:16,background:T.paper,border:`1px solid ${T.dust}`,color:T.inkLight,fontSize:11,fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                🗺 Route
              </a>
            );
          })()}
          {/* Add to Calendar */}
          {day && (() => {
            const calDate = getCalendarDate(dates, activeDay);
            const slots = day.slots || [];
            const firstTime = slots[0]?.time || "09:00 AM";
            const lastEnd = slots[slots.length-1]?.end_time || "09:00 PM";
            const toGcalTime = (t, d) => {
              if (!t || !d) return d + "T090000";
              const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
              if (!m) return d + "T090000";
              let h = parseInt(m[1]), min = parseInt(m[2]);
              const pm = m[3].toUpperCase()==="PM";
              if (pm && h!==12) h+=12;
              if (!pm && h===12) h=0;
              return `${d}T${String(h).padStart(2,"0")}${String(min).padStart(2,"0")}00`;
            };
            const title = encodeURIComponent(`${cityShort} – Day ${day.day}: ${day.theme || "Itinerary"}`);
            const details = encodeURIComponent(slots.map(s=>`${s.time} ${s.name}`).join("\n"));
            const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${toGcalTime(firstTime,calDate)}/${toGcalTime(lastEnd,calDate)}&details=${details}`;
            return (
              <a href={calUrl} target="_blank" rel="noreferrer"
                style={{padding:"5px 10px",borderRadius:16,background:T.paper,border:`1px solid ${T.dust}`,color:T.inkLight,fontSize:11,fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                📅 Add
              </a>
            );
          })()}
          <div style={{display:"flex",background:T.paper,borderRadius:20,padding:3,gap:2,border:`1px solid ${T.dust}`}}>
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
      </div>

      {/* Failed day banners */}
      {Object.entries(failedDays).map(([dayNum, errMsg]) => (
        <div key={dayNum} style={{margin:"8px 16px 0",background:"rgba(200,75,47,0.07)",border:"1px solid rgba(200,75,47,0.25)",borderRadius:14,padding:"11px 14px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16}}>⚠️</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:"#c84b2f"}}>Day {dayNum} couldn't be generated</div>
            <div style={{fontSize:11,color:"#c84b2f",opacity:0.75,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{errMsg || "Try again"}</div>
          </div>
          <button onClick={()=>retryDay(Number(dayNum))}
            style={{padding:"7px 14px",borderRadius:10,background:"#c84b2f",border:"none",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>
            Retry
          </button>
        </div>
      ))}

      {/* Day theme bar */}
      {day?.theme && (
        <div style={{padding:"10px 16px 0",display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,height:1,background:T.dust}}/>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontStyle:"italic",color:T.inkFaint,flexShrink:0,textAlign:"center",maxWidth:260}}>{day.theme}</div>
          <div style={{flex:1,height:1,background:T.dust}}/>
        </div>
      )}

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
          city={city}
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

      {/* Edit with AI — at bottom of content, above nav */}
      {status==="done" && !showChat && (
        <div style={{padding:"8px 20px 24px"}}>
          <button onClick={()=>setShowChat(true)}
            style={{width:"100%",padding:"14px 0",borderRadius:16,background:`linear-gradient(135deg,${T.accent},#9b2020)`,border:"none",boxShadow:"0 4px 20px rgba(200,75,47,0.3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"'DM Sans',sans-serif"}}>
            <span style={{fontSize:14,color:"white"}}>✦</span>
            <span style={{fontSize:14,fontWeight:700,color:"white"}}>Edit with AI</span>
          </button>
        </div>
      )}

    </div>
  );
}
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

export { ItineraryView };