import { useState, useEffect, useRef, useMemo } from "react";
import { T, GLOBAL_CSS, NAV_H, MONTHS_FULL, MONTHS_SHORT, DAYS, CITY_PHOTOS } from "./constants.jsx";
function HomeScreen({ onStart, savedTrips, profile, onOpenTrip, supabase, user, refreshKey }) {
  const [city, setCity]     = useState("");
  const [startDate, setStart] = useState(null);
  const [endDate, setEnd]     = useState(null);
  const [picking, setPicking] = useState(null);
  const [calOffset, setCalOffset] = useState(0);
  const [hoverDay, setHoverDay]   = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [friendActivity, setFriendActivity] = useState([]);
  const autocompleteTimer = useRef(null);
  const BACKEND = import.meta.env.VITE_BACKEND || (import.meta.env.PROD ? "https://wandr-62i6.onrender.com" : "");

  const [userLoaded, setUserLoaded] = useState(false);

  // Clear community feed immediately when user signs out
  useEffect(() => {
    if (!user) setFriendActivity([]);
  }, [user]);

  useEffect(() => {
    if (!supabase) return;
    // Wait for auth to settle before fetching - check session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user || null;
      setUserLoaded(true);
      // Only fetch community trips if there's an active session
      if (!currentUser) { setFriendActivity([]); return; }
      supabase.from("trips")
        .select("*, profiles(name, travel_dna)")
        .eq("is_public", true)
        .neq("user_id", currentUser.id)
        .order("saved_at", { ascending: false })
        .limit(10)
        .then(({ data }) => setFriendActivity(data || []));
    });
  }, [refreshKey]);

  // Split saved trips into upcoming and past
  const today = new Date();
  today.setHours(0,0,0,0);
  const upcomingTrips = savedTrips.filter(t => {
    if (!t.dates) return false;
    const parts = t.dates.split("–").map(s=>s.trim());
    const end = parts[1] ? new Date(parts[1] + ", " + new Date().getFullYear()) : null;
    const start = parts[0] ? new Date(parts[0] + ", " + new Date().getFullYear()) : null;
    const refDate = end || start;
    return refDate && refDate >= today;
  });
  const pastTrips = savedTrips.filter(t => !upcomingTrips.includes(t));

  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [coldStartMsg, setColdStartMsg] = useState("");
  const [quickPlan, setQuickPlan] = useState(null); // {city} when quick plan sheet is open
  const [quickVibes, setQuickVibes] = useState([]);
  const [showQuickCal, setShowQuickCal] = useState(false);
  const [quickHomeBase, setQuickHomeBase] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [hotelSuggestions, setHotelSuggestions] = useState([]);
  const [showHotelSuggestions, setShowHotelSuggestions] = useState(false);
  const [hotelSuggestionsLoading, setHotelSuggestionsLoading] = useState(false);
  const hotelTimer = useRef(null);
  const QUICK_VIBES = [
    { id:"slow-morning", emoji:"☕", label:"Slow mornings" },
    { id:"street-food", emoji:"🍜", label:"Street food" },
    { id:"cultural", emoji:"🏛", label:"Cultural" },
    { id:"nightlife", emoji:"🍸", label:"Nightlife" },
    { id:"adventurous", emoji:"🧗", label:"Adventure" },
    { id:"local-weird", emoji:"🗺", label:"Off the beaten path" },
    { id:"splurge-dinner", emoji:"🍷", label:"Fine dining" },
    { id:"chill-afternoon", emoji:"🌿", label:"Laid back" },
  ];

  // Hero city — stable per session
  const heroCityEntry = useMemo(() => {
    const entries = Object.entries(CITY_PHOTOS);
    return entries[Math.floor(Math.random() * entries.length)];
  }, []);
  const [heroCity, heroCityPhoto] = heroCityEntry;

  const handleHotelChange = (val) => {
    setQuickHomeBase(val);
    clearTimeout(hotelTimer.current);
    if (!val || val.length < 2) { setHotelSuggestions([]); setShowHotelSuggestions(false); return; }
    setHotelSuggestionsLoading(true);
    hotelTimer.current = setTimeout(async () => {
      try {
        const cityParam = quickPlan ? `&city=${encodeURIComponent(quickPlan)}` : "";
        const res = await fetch(`${BACKEND}/hotel-autocomplete?q=${encodeURIComponent(val)}${cityParam}`);
        const data = await res.json();
        setHotelSuggestions(data.suggestions || []);
        setShowHotelSuggestions(true);
      } catch { setHotelSuggestions([]); }
      finally { setHotelSuggestionsLoading(false); }
    }, 300);
  };

  const selectHotel = (s) => {
    const full = s.description ? `${s.name}, ${s.description}` : s.name;
    setQuickHomeBase(full);
    setHotelSuggestions([]);
    setShowHotelSuggestions(false);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`${BACKEND}/reverse-geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
          const data = await res.json();
          if (data.address) setQuickHomeBase(data.address);
        } catch {}
        setLocationLoading(false);
      },
      () => setLocationLoading(false),
      { timeout: 10000 }
    );
  };

  const handleQuickBuild = () => {
    if (!quickPlan) return;
    const moodCtx = quickVibes.length > 0
      ? `Day 1: ${quickVibes.map(v => QUICK_VIBES.find(q=>q.id===v)?.label||v).join(", ")}`
      : "";
    onStart(quickPlan, dateString, moodCtx, quickHomeBase.trim());
    setQuickPlan(null);
    setQuickVibes([]);
    setQuickHomeBase("");
    setStart(null); setEnd(null); setPicking(null);
    setShowQuickCal(false);
  };

  // Pre-warm backend on first focus so it's awake by the time user hits generate
  const hasPrewarmed = useRef(false);
  const handleSearchFocus = () => {
    if (!hasPrewarmed.current) {
      hasPrewarmed.current = true;
      fetch(`${BACKEND}/health`).catch(() => {});
    }
  };

  const handleCityChange = (val) => {
    setCity(val);
    clearTimeout(autocompleteTimer.current);
    if (val.length < 2) { setSuggestions([]); setShowSuggestions(false); setSuggestionsLoading(false); return; }
    setSuggestionsLoading(true);
    autocompleteTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${BACKEND}/autocomplete?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
        setColdStartMsg("");
      } catch(e) {
        // Render cold start — show friendly message and retry
        setColdStartMsg("Server waking up ☕ — just a moment…");
        try {
          await new Promise(r => setTimeout(r, 5000));
          const res = await fetch(`${BACKEND}/autocomplete?q=${encodeURIComponent(val)}`);
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions(true);
          setColdStartMsg("");
        } catch {
          setSuggestions([]);
          setColdStartMsg("Can't reach server — check your connection.");
        }
      } finally { setSuggestionsLoading(false); }
    }, 300);
  };

  const selectSuggestion = (s) => {
    const full = s.description ? `${s.name}, ${s.description}` : s.name;
    setCity(full);
    setSuggestions([]);
    setShowSuggestions(false);
    // Go directly to generation — skip the quick plan sheet
    onStart(full, "", "");
  };

  const fmt   = d => d ? `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}` : null;
  const dateString = startDate && endDate
    ? `${fmt(startDate)} – ${fmt(endDate)}, ${endDate.getFullYear()}`
    : startDate ? `From ${fmt(startDate)}` : "";

  const buildCal = () => {
    const base = new Date(); base.setDate(1); base.setMonth(base.getMonth()+calOffset);
    return { year:base.getFullYear(), month:base.getMonth(), firstDay:new Date(base.getFullYear(),base.getMonth(),1).getDay(), daysInMonth:new Date(base.getFullYear(),base.getMonth()+1,0).getDate(), label:`${MONTHS_FULL[base.getMonth()]} ${base.getFullYear()}` };
  };
  const cal = buildCal();

  const handleDay = day => {
    const d = new Date(cal.year, cal.month, day);
    if (d < today) return;
    if (!startDate || picking==="start") { setStart(d); setEnd(null); setPicking("end"); }
    else if (picking==="end") { if(d<startDate){setStart(d);setEnd(null);}else{setEnd(d);setPicking(null);} }
  };
  const inRange = day => {
    const d = new Date(cal.year,cal.month,day);
    if (startDate && hoverDay && !endDate) return d>startDate && d<=hoverDay;
    if (startDate && endDate) return d>startDate && d<endDate;
    return false;
  };

  const CITY_PILLS = ["New York","Tokyo","Paris","London","Barcelona","New Orleans","Nashville","Miami","Lisbon","Mexico City","Kyoto","Seoul","Amsterdam","Buenos Aires","Cape Town","Marrakech"];
  const greeting = profile?.name ? `Welcome back, ${profile.name.split(" ")[0]}.` : "Where next?";

  // Smart greeting
  const firstName = profile?.name?.split(" ")[0] || null;
  const nextTrip = upcomingTrips[0];
  const daysUntil = nextTrip ? (() => {
    const parts = (nextTrip.dates||"").split("–")[0].trim();
    const d = new Date(parts + ", " + new Date().getFullYear());
    const diff = Math.ceil((d - today) / 86400000);
    return diff > 0 ? diff : 0;
  })() : null;

  const heroLine = nextTrip && daysUntil !== null
    ? daysUntil === 0 ? `Today's the day. ✦`
      : daysUntil === 1 ? `${nextTrip.city?.split(",")[0]} is tomorrow.`
      : `${nextTrip.city?.split(",")[0]} in ${daysUntil} days.`
    : "Where next?";

  const subLine = nextTrip && daysUntil !== null
    ? "Tap your trip to review the plan."
    : "Set your vibe. AI builds the rest.";

  // Destination grid cities — shuffle deterministically, skip hero city
  const destCities = useMemo(() => {
    const allEntries = Object.entries(CITY_PHOTOS);
    // Move hero city to front, then slice from index 1 to get 6 others
    const without = allEntries.filter(([k]) => k !== heroCity);
    return without.slice(0, 6);
  }, [heroCity]);

  // Time-based greeting
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div style={{minHeight:"100vh",background:T.cream,fontFamily:"'DM Sans',sans-serif",paddingBottom:NAV_H+20}}>
      <style>{GLOBAL_CSS}</style>

      {/* ── 1. Dark header: branding + greeting + search ── */}
      <div style={{background:`linear-gradient(160deg,#1a1008 0%,${T.ink} 100%)`,padding:"52px 16px 20px",position:"relative",overflow:"hidden"}}>
        {/* Subtle warm radial glow */}
        <div style={{position:"absolute",top:0,right:0,width:200,height:200,backgroundImage:"radial-gradient(circle at 100% 0%,rgba(196,154,60,0.1) 0%,transparent 65%)",pointerEvents:"none"}}/>

        {/* Top row: wordmark + greeting */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:800,letterSpacing:"0.22em",textTransform:"uppercase",color:T.gold}}>✦ WANDR</div>
          {firstName ? (
            <div style={{fontSize:12,fontWeight:500,color:"rgba(255,255,255,0.45)"}}>{timeGreeting}, {firstName}</div>
          ) : (
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontStyle:"italic",fontFamily:"'Playfair Display',serif"}}>AI travel planner</div>
          )}
        </div>

        {/* Hero line */}
        <div style={{marginBottom:18}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:900,color:"white",lineHeight:1.1,letterSpacing:"-0.5px"}}>
            {heroLine}
          </div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginTop:6,lineHeight:1.5}}>{subLine}</div>
        </div>

        {/* ── Search bar embedded in header ── */}
        <div style={{position:"relative",zIndex:10}}>
          <div style={{
            background:"rgba(255,255,255,0.07)",
            borderRadius:18,
            padding:"3px 3px 3px 16px",
            display:"flex",gap:8,alignItems:"center",
            border:"1px solid rgba(255,255,255,0.1)",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0}}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <div style={{flex:1,position:"relative"}}>
              <input value={city} onChange={e=>handleCityChange(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter"&&city.trim()){ onStart(city.trim(), "", ""); setShowSuggestions(false); } }}
                onBlur={()=>setTimeout(()=>setShowSuggestions(false),150)}
                onFocus={()=>{ handleSearchFocus(); suggestions.length>0&&setShowSuggestions(true); }}
                placeholder="Where to next?"
                style={{width:"100%",padding:"12px 0",border:"none",background:"transparent",color:"white",fontSize:15,fontWeight:600,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
              <style>{`input::placeholder{color:rgba(255,255,255,0.3)!important}`}</style>
              {(showSuggestions && suggestions.length > 0) || suggestionsLoading ? (
                <div style={{position:"absolute",top:"calc(100% + 10px)",left:-32,right:0,background:T.white,borderRadius:18,boxShadow:"0 12px 40px rgba(28,22,18,0.2)",border:`1px solid ${T.dust}`,zIndex:50,overflow:"hidden"}}>
                  {suggestionsLoading && suggestions.length === 0 && (
                    <div style={{padding:"14px 18px",fontSize:13,color:T.inkFaint}}>Searching…</div>
                  )}
                  {suggestions.map((s,i)=>(
                    <button key={i} onMouseDown={()=>selectSuggestion(s)}
                      style={{width:"100%",padding:"13px 18px",background:"none",border:"none",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:12,borderBottom:i<suggestions.length-1?`1px solid ${T.dust}`:"none"}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.paper}
                      onMouseLeave={e=>e.currentTarget.style.background="none"}>
                      <div style={{width:32,height:32,borderRadius:10,background:T.cream,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>📍</div>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,color:T.ink}}>{s.name}</div>
                        {s.description&&<div style={{fontSize:12,color:T.inkFaint,marginTop:1}}>{s.description}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button onClick={()=>{ if(city.trim()){ onStart(city.trim(), "", ""); setShowSuggestions(false); }}}
              onMouseDown={e=>city.trim()&&(e.currentTarget.style.transform="scale(0.92)")}
              onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
              style={{flexShrink:0,width:44,height:44,borderRadius:15,background:city.trim()?`linear-gradient(135deg,${T.accent},#9b2020)`:"rgba(255,255,255,0.08)",border:"none",color:city.trim()?"white":"rgba(255,255,255,0.25)",fontSize:18,fontWeight:900,cursor:city.trim()?"pointer":"default",transition:"background 0.2s,transform 0.15s",boxShadow:city.trim()?"0 4px 14px rgba(200,75,47,0.4)":"none",display:"flex",alignItems:"center",justifyContent:"center"}}>
              →
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Featured city card ── */}
      <div style={{padding:"16px 16px 0"}}>
        <div onClick={()=>setQuickPlan(heroCity)}
          onMouseDown={e=>e.currentTarget.style.transform="scale(0.985)"}
          onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
          onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
          style={{height:190,borderRadius:22,overflow:"hidden",cursor:"pointer",background:T.ink,position:"relative",boxShadow:"0 6px 28px rgba(28,22,18,0.2)",transition:"transform 0.18s ease"}}>
          {heroCityPhoto && <img src={heroCityPhoto} alt={heroCity} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.72}} onError={e=>e.target.style.display="none"}/>}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.08) 0%,rgba(0,0,0,0.62) 100%)"}}/>
          <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"18px 18px 18px",display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:12}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:"rgba(255,255,255,0.5)",marginBottom:4}}>Featured</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:900,color:"white",lineHeight:1,letterSpacing:"-0.5px",textShadow:"0 2px 12px rgba(0,0,0,0.4)"}}>{heroCity}</div>
            </div>
            <button
              onClick={e=>{e.stopPropagation();setQuickPlan(heroCity);}}
              onMouseDown={e=>e.currentTarget.style.transform="scale(0.94)"}
              onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
              style={{flexShrink:0,padding:"10px 16px",borderRadius:20,background:`linear-gradient(135deg,${T.accent},#a83520)`,border:"none",color:"white",fontSize:13,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 16px rgba(200,75,47,0.5)",whiteSpace:"nowrap",transition:"transform 0.15s"}}>
              Plan it →
            </button>
          </div>
        </div>
      </div>

      {/* Cold-start message */}
      {coldStartMsg && (
        <div style={{padding:"8px 20px 0",fontSize:12,color:T.inkFaint,textAlign:"center",animation:"fadeIn 0.4s ease"}}>
          {coldStartMsg}
        </div>
      )}
      {/* Customize hint */}
      {city.trim() && !coldStartMsg && (
        <div style={{padding:"6px 16px 0",textAlign:"right",animation:"fadeIn 0.3s ease"}}>
          <button onClick={()=>setQuickPlan(city.trim())}
            style={{background:"none",border:"none",fontSize:11,color:T.accent,fontWeight:700,cursor:"pointer",padding:0}}>
            + customize vibes & dates
          </button>
        </div>
      )}

      {/* ── 3. Quick mood row ── */}
      <div style={{padding:"20px 0 0"}}>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.18em",textTransform:"uppercase",color:T.inkFaint,marginBottom:12,paddingLeft:16}}>
          What's the vibe?
        </div>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:6,paddingLeft:16,paddingRight:24,scrollbarWidth:"none",msOverflowStyle:"none"}}>
          {QUICK_VIBES.map(v => (
            <button
              key={v.id}
              onClick={()=>{ setQuickVibes([v.id]); setQuickPlan(heroCity); }}
              onMouseDown={e=>e.currentTarget.style.transform="scale(0.93)"}
              onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
              style={{
                flexShrink:0, display:"flex", alignItems:"center", gap:7,
                padding:"9px 16px", borderRadius:22,
                background:T.white, border:`1.5px solid ${T.dust}`,
                color:T.ink, fontSize:13, fontWeight:600, cursor:"pointer",
                whiteSpace:"nowrap", boxShadow:"0 2px 8px rgba(28,22,18,0.06)",
                transition:"transform 0.12s ease, box-shadow 0.15s ease",
              }}>
              <span style={{fontSize:15}}>{v.emoji}</span>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. Personalized stats card ── */}
      {(() => {
        const totalTrips = savedTrips.length;
        const uniqueCities = [...new Set(savedTrips.map(t => t.city?.split(",")[0]?.trim()).filter(Boolean))].length;
        const totalDays = savedTrips.reduce((sum, t) => sum + (Array.isArray(t.days) ? t.days.length : 0), 0);
        const allVibes = savedTrips.flatMap(t =>
          (t.mood_context||"").split("\n").flatMap(l => l.split(":")[1]?.split(",").map(v=>v.trim())||[])
        ).filter(Boolean);
        const topVibe = allVibes.length > 0
          ? Object.entries(allVibes.reduce((acc, v) => { acc[v] = (acc[v]||0)+1; return acc; }, {})).sort((a,b)=>b[1]-a[1])[0]?.[0]
          : null;

        if (!user && totalTrips === 0) return null; // hide if no data and not logged in

        return (
          <div style={{padding:"16px 16px 0"}}>
            <div style={{borderRadius:20,background:`linear-gradient(135deg,${T.ink} 0%,#2d1f10 100%)`,padding:"20px",boxShadow:"0 6px 24px rgba(28,22,18,0.18)",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,right:0,width:120,height:120,backgroundImage:"radial-gradient(circle at 100% 0%,rgba(196,154,60,0.12) 0%,transparent 70%)",pointerEvents:"none"}}/>

              {/* Greeting + name */}
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:"rgba(196,154,60,0.7)",marginBottom:4}}>✦ YOUR WANDR STORY</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"white",lineHeight:1.2}}>
                  {firstName ? `${firstName}'s adventures` : "Your adventures"}
                  {totalTrips === 0 && <span style={{fontWeight:400,fontStyle:"italic",color:"rgba(255,255,255,0.4)",fontSize:18}}> are just beginning.</span>}
                </div>
              </div>

              {/* Stats row */}
              {totalTrips > 0 && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:1,background:"rgba(255,255,255,0.06)",borderRadius:14,overflow:"hidden",marginBottom:16}}>
                  {[
                    { val: totalTrips, label: totalTrips === 1 ? "trip" : "trips" },
                    { val: uniqueCities, label: uniqueCities === 1 ? "city" : "cities" },
                    { val: totalDays, label: totalDays === 1 ? "day" : "days" },
                  ].map((s, i) => (
                    <div key={i} style={{padding:"12px 8px",textAlign:"center",background:"rgba(255,255,255,0.04)"}}>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,color:"white",lineHeight:1}}>{s.val}</div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:600,marginTop:3,textTransform:"uppercase",letterSpacing:"0.08em"}}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Next trip or top vibe or empty CTA */}
              {nextTrip ? (
                <div onClick={()=>onOpenTrip(nextTrip)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"10px 14px",cursor:"pointer"}}>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:"rgba(196,154,60,0.8)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:2}}>
                      {daysUntil === 0 ? "✈ Today!" : daysUntil === 1 ? "✈ Tomorrow" : `✈ In ${daysUntil} days`}
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:"white"}}>{nextTrip.city?.split(",")[0]}</div>
                  </div>
                  <div style={{background:T.accent,borderRadius:10,padding:"6px 12px",fontSize:11,fontWeight:800,color:"white"}}>View plan →</div>
                </div>
              ) : topVibe ? (
                <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",lineHeight:1.5}}>
                  Your favourite vibe: <span style={{color:"rgba(255,255,255,0.65)",fontWeight:700}}>{topVibe}</span>
                </div>
              ) : (
                <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",fontStyle:"italic"}}>Search a city above to start planning.</div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── 5. Community "Popular right now" ── */}
      {friendActivity.filter(t => !user || t.user_id !== user.id).filter((t,_,arr)=>arr.findIndex(x=>x.city?.split(",")[0]===t.city?.split(",")[0])===arr.indexOf(t)).length > 0 && (
        <div style={{padding:"16px 0 0"}}>
          <div style={{padding:"0 16px",marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:T.inkFaint}}>Popular right now</div>
            <div style={{fontSize:11,color:T.inkFaint,marginTop:2}}>See where other travelers are heading</div>
          </div>
          <div style={{display:"flex",gap:10,overflowX:"auto",padding:"0 16px 4px"}}>
            {friendActivity.filter(t => !user || t.user_id !== user.id).filter((t,_,arr)=>arr.findIndex(x=>x.city?.split(",")[0]===t.city?.split(",")[0])===arr.indexOf(t)).slice(0,6).map((trip,i)=>{
              const vibes = (trip.mood_context||"").split("\n").flatMap(l=>l.split(":")[1]?.split(",").map(v=>v.trim())||[]).filter(Boolean).slice(0,2);
              const cityKey = trip.city?.split(",")[0]?.trim();
              const photo = CITY_PHOTOS[cityKey];
              return (
                <div key={i} style={{flexShrink:0,width:155,borderRadius:16,overflow:"hidden",boxShadow:"0 3px 12px rgba(28,22,18,0.15)",background:`linear-gradient(160deg,${T.ink},#2d1f10)`,position:"relative"}}>
                  {photo && <img src={photo} alt={cityKey} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.35}} onError={e=>e.target.style.display="none"}/>}
                  <div style={{position:"relative",zIndex:1,padding:"12px 12px 10px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
                      <div style={{width:24,height:24,borderRadius:"50%",background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"white",flexShrink:0}}>
                        {trip.profiles?.name?.[0]||"?"}
                      </div>
                      <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.75)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{trip.profiles?.name||"Wanderer"}</div>
                    </div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:"white",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {cityKey}
                    </div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:vibes.length>0?8:0}}>{trip.days?.length||0} {trip.days?.length===1?"day":"days"}</div>
                    {vibes.length > 0 && (
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {vibes.map(v=>(
                          <span key={v} style={{padding:"2px 7px",borderRadius:8,background:"rgba(255,255,255,0.12)",fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.7)"}}>{v}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 6. Destinations discovery grid — always visible ── */}
      <div style={{padding:"24px 16px 0"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.18em",textTransform:"uppercase",color:T.inkFaint}}>Explore the world</div>
        </div>
        {/* Large hero card — first city */}
        {destCities[0] && (() => {
          const [c, photo] = destCities[0];
          return (
            <div onClick={()=>onStart(c,"","")}
              onMouseDown={e=>e.currentTarget.style.transform="scale(0.985)"}
              onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
              style={{height:200,borderRadius:22,overflow:"hidden",cursor:"pointer",background:T.ink,position:"relative",boxShadow:"0 6px 24px rgba(28,22,18,0.2)",marginBottom:10,transition:"transform 0.18s ease,box-shadow 0.18s ease"}}>
              <img src={photo} alt={c} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.75}} onError={e=>e.target.style.display="none"}/>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(160deg,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.65) 100%)"}}/>
              <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"18px 18px"}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:"rgba(255,255,255,0.5)",marginBottom:4}}>Plan a trip</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:900,color:"white",lineHeight:1.0,letterSpacing:"-0.5px",textShadow:"0 2px 12px rgba(0,0,0,0.4)"}}>{c}</div>
              </div>
            </div>
          );
        })()}
        {/* Remaining cities — 2 col */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {destCities.slice(1).map(([c, photo]) => (
            <div
              key={c}
              onClick={()=>onStart(c, "", "")}
              onMouseDown={e=>e.currentTarget.style.transform="scale(0.96)"}
              onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
              style={{height:148,borderRadius:18,overflow:"hidden",cursor:"pointer",background:T.ink,position:"relative",boxShadow:"0 3px 14px rgba(28,22,18,0.13)",transition:"transform 0.15s ease"}}>
              <img src={photo} alt={c} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.65}} onError={e=>e.target.style.display="none"}/>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 20%,rgba(0,0,0,0.75) 100%)"}}/>
              <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"11px 13px"}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:800,color:"white",lineHeight:1.15,textShadow:"0 1px 8px rgba(0,0,0,0.5)"}}>{c}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 7. Past trips ── */}
      {pastTrips.length > 0 && (
        <div style={{padding:"16px 16px 0"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:T.inkFaint}}>Past trips</div>
            {pastTrips.length > 3 && <button onClick={()=>onOpenTrip(null)} style={{background:"none",border:"none",fontSize:12,color:T.accent,fontWeight:700,cursor:"pointer",padding:0}}>See all →</button>}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {pastTrips.slice(0,3).map((trip,i)=>{
              const cityKey = trip.city?.split(",")[0]?.trim();
              const photo = CITY_PHOTOS[cityKey];
              return (
                <div key={i} onClick={()=>onOpenTrip(trip)}
                  style={{background:T.white,borderRadius:16,display:"flex",alignItems:"stretch",cursor:"pointer",border:`1px solid ${T.dust}`,overflow:"hidden"}}>
                  <div style={{width:56,flexShrink:0,background:T.ink,position:"relative",overflow:"hidden"}}>
                    {photo && <img src={photo} alt={cityKey} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.7}} onError={e=>e.target.style.display="none"}/>}
                    {!photo && <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,opacity:0.5}}>{trip.emoji||"✦"}</div>}
                  </div>
                  <div style={{flex:1,minWidth:0,padding:"12px 14px",display:"flex",alignItems:"center",gap:0}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cityKey}</div>
                      <div style={{fontSize:11,color:T.inkFaint}}>{trip.dates||"No dates"}</div>
                    </div>
                    <div style={{fontSize:16,color:T.dust,flexShrink:0}}>›</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Plan Sheet */}
      {quickPlan && (
        <div style={{position:"fixed",inset:0,background:"rgba(28,22,18,0.6)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}
          onClick={()=>setQuickPlan(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.white,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,maxHeight:"88vh",display:"flex",flexDirection:"column",animation:"slideUp 0.3s ease"}}>
            {/* Scrollable content */}
            <div style={{overflowY:"auto",flex:1,padding:"24px 20px 0"}}>
              {/* Handle */}
              <div style={{width:40,height:4,borderRadius:2,background:T.dust,margin:"0 auto 20px"}}/>

              {/* City name */}
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:T.ink,marginBottom:4}}>
                {quickPlan.split(",")[0]}
              </div>
              <div style={{fontSize:13,color:T.inkFaint,marginBottom:16}}>What's the vibe? Pick all that apply.</div>

              {/* Vibe chips */}
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
                {QUICK_VIBES.map(v=>{
                  const sel = quickVibes.includes(v.id);
                  return (
                    <button key={v.id}
                      onClick={()=>setQuickVibes(prev=>sel?prev.filter(x=>x!==v.id):[...prev,v.id])}
                      style={{padding:"8px 14px",borderRadius:20,background:sel?T.ink:T.paper,border:`1.5px solid ${sel?"transparent":T.dust}`,color:sel?T.white:T.ink,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all 0.15s"}}>
                      <span>{v.emoji}</span> {v.label}
                    </button>
                  );
                })}
              </div>

              {/* Dates — optional */}
              <button onClick={()=>setShowQuickCal(v=>!v)}
                style={{width:"100%",padding:"12px 14px",borderRadius:14,border:`1.5px solid ${dateString?T.accent:T.dust}`,background:T.paper,color:dateString?T.accent:T.inkFaint,fontSize:13,fontWeight:dateString?700:400,outline:"none",marginBottom:10,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:8,transition:"border-color 0.2s"}}>
                <span style={{fontSize:15}}>📅</span>
                {dateString || "Add dates (optional)"}
                {dateString && <button onClick={e=>{e.stopPropagation();setStart(null);setEnd(null);setPicking(null);setShowQuickCal(false);}} style={{marginLeft:"auto",background:"none",border:"none",color:T.inkFaint,fontSize:16,cursor:"pointer",lineHeight:1}}>×</button>}
              </button>

              {showQuickCal && (
                <div style={{background:T.cream,borderRadius:16,padding:"14px",marginBottom:10,border:`1px solid ${T.dust}`}}>
                  {/* Month nav */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <button onClick={()=>setCalOffset(o=>Math.max(0,o-1))} style={{background:"none",border:"none",fontSize:18,color:T.inkLight,cursor:"pointer",padding:"0 4px",lineHeight:1}}>‹</button>
                    <div style={{fontSize:13,fontWeight:700,color:T.ink}}>{cal.label}</div>
                    <button onClick={()=>setCalOffset(o=>o+1)} style={{background:"none",border:"none",fontSize:18,color:T.inkLight,cursor:"pointer",padding:"0 4px",lineHeight:1}}>›</button>
                  </div>
                  {/* Day headers */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:4}}>
                    {["S","M","T","W","T","F","S"].map((d,i)=>(
                      <div key={i} style={{textAlign:"center",fontSize:10,fontWeight:700,color:T.inkFaint,padding:"2px 0"}}>{d}</div>
                    ))}
                  </div>
                  {/* Day grid */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                    {Array(cal.firstDay).fill(null).map((_,i)=><div key={`e${i}`}/>)}
                    {Array(cal.daysInMonth).fill(null).map((_,i)=>{
                      const d = i+1;
                      const date = new Date(cal.year,cal.month,d);
                      const isPast = date < today;
                      const isStart = startDate && date.toDateString()===startDate.toDateString();
                      const isEnd = endDate && date.toDateString()===endDate.toDateString();
                      const range = inRange(d);
                      return (
                        <button key={d}
                          onClick={()=>!isPast&&handleDay(d)}
                          onMouseEnter={()=>setHoverDay(date)}
                          onMouseLeave={()=>setHoverDay(null)}
                          style={{aspectRatio:"1",padding:0,borderRadius:"50%",border:"none",fontSize:12,fontWeight:isStart||isEnd?700:400,cursor:isPast?"default":"pointer",background:isStart||isEnd?T.accent:range?"rgba(200,75,47,0.12)":"transparent",color:isPast?T.dust:isStart||isEnd?"white":T.ink,transition:"background 0.1s"}}>
                          {d}
                        </button>
                      );
                    })}
                  </div>
                  {dateString && (
                    <div style={{textAlign:"center",fontSize:12,fontWeight:700,color:T.accent,marginTop:10}}>{dateString}</div>
                  )}
                </div>
              )}
              {/* Hotel / Location input */}
              <div style={{marginBottom:16,position:"relative"}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.inkFaint,marginBottom:8}}>Where are you staying?</div>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 14px",borderRadius:14,border:`1.5px solid ${quickHomeBase ? T.sage : T.dust}`,background:T.paper,transition:"border-color 0.2s"}}>
                  <span style={{fontSize:14,flexShrink:0}}>🏨</span>
                  <input
                    value={quickHomeBase}
                    onChange={e=>handleHotelChange(e.target.value)}
                    onFocus={()=>hotelSuggestions.length>0&&setShowHotelSuggestions(true)}
                    onBlur={()=>setTimeout(()=>setShowHotelSuggestions(false),150)}
                    placeholder="Hotel name or address (optional)"
                    style={{flex:1,border:"none",background:"transparent",color:quickHomeBase?T.ink:T.inkFaint,fontSize:13,fontWeight:quickHomeBase?600:400,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
                  <button
                    onClick={handleDetectLocation}
                    title="Use my current location"
                    style={{flexShrink:0,background:"none",border:"none",padding:"4px 6px",cursor:"pointer",fontSize:18,lineHeight:1,color:T.inkFaint,transition:"color 0.15s",opacity:locationLoading?0.4:1}}>
                    {locationLoading ? "…" : "🔍"}
                  </button>
                  {quickHomeBase && (
                    <button onClick={()=>{setQuickHomeBase("");setHotelSuggestions([]);}} style={{flexShrink:0,background:"none",border:"none",cursor:"pointer",color:T.inkFaint,fontSize:18,lineHeight:1,padding:0}}>×</button>
                  )}
                </div>
                {/* Hotel suggestions dropdown */}
                {(showHotelSuggestions && hotelSuggestions.length > 0) || hotelSuggestionsLoading ? (
                  <div style={{position:"absolute",top:"calc(100% - 4px)",left:0,right:0,background:T.white,borderRadius:12,boxShadow:"0 8px 24px rgba(28,22,18,0.12)",border:`1px solid ${T.dust}`,zIndex:60,overflow:"hidden"}}>
                    {hotelSuggestionsLoading && hotelSuggestions.length === 0 && (
                      <div style={{padding:"12px 14px",fontSize:13,color:T.inkFaint}}>Searching hotels…</div>
                    )}
                    {hotelSuggestions.map((s,i)=>(
                      <button key={i} onMouseDown={()=>selectHotel(s)}
                        style={{width:"100%",padding:"10px 14px",background:"none",border:"none",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10,borderBottom:i<hotelSuggestions.length-1?`1px solid ${T.dust}`:"none"}}
                        onMouseEnter={e=>e.currentTarget.style.background=T.paper}
                        onMouseLeave={e=>e.currentTarget.style.background="none"}>
                        <span style={{fontSize:14,flexShrink:0}}>🏨</span>
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:T.ink}}>{s.name}</div>
                          {s.description&&<div style={{fontSize:11,color:T.inkFaint}}>{s.description}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
                {locationLoading && <div style={{fontSize:11,color:T.inkFaint,marginTop:5}}>Finding your location…</div>}
                {quickHomeBase && !locationLoading && !showHotelSuggestions && <div style={{fontSize:11,color:T.sage,fontWeight:600,marginTop:5}}>✓ Day routes from {quickHomeBase.split(",")[0]}</div>}
              </div>

              <div style={{height:4}}/>
            </div>

            {/* Sticky CTA */}
            <div style={{padding:"12px 20px 32px",borderTop:`1px solid ${T.dust}`,background:T.white,flexShrink:0}}>
              <div style={{textAlign:"center",fontSize:11,color:T.inkFaint,marginBottom:10}}>
                {quickVibes.length === 0 ? "No vibes selected — we'll choose the best mix" : `${quickVibes.length} vibe${quickVibes.length>1?"s":""} selected ✦`}
              </div>
              <button onClick={handleQuickBuild}
                style={{width:"100%",padding:"15px 0",borderRadius:16,background:`linear-gradient(135deg,${T.accent},#9b2020)`,border:"none",color:"white",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:"0 6px 20px rgba(200,75,47,0.3)"}}>
                Build my trip ✦
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



// ─────────────────────────────────────────────
// PROFILE / TRAVEL STYLE QUIZ
// ─────────────────────────────────────────────
export { HomeScreen };
