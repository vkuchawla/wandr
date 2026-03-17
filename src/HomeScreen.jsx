import { useState, useEffect, useRef } from "react";
import { T, GLOBAL_CSS, NAV_H, MONTHS_FULL, MONTHS_SHORT, DAYS } from "./constants.jsx";
function HomeScreen({ onStart, savedTrips, profile, onOpenTrip, supabase, user }) {
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
  const BACKEND = "http://localhost:3001";

  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    // Wait for auth to settle before fetching - check session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user || null;
      setUserLoaded(true);
      const query = supabase.from("trips")
        .select("*, profiles(name, travel_dna)")
        .eq("is_public", true)
        .order("saved_at", { ascending: false })
        .limit(10);
      const finalQuery = currentUser ? query.neq("user_id", currentUser.id) : query;
      finalQuery.then(({ data }) => setFriendActivity(data || []));
    });
  }, []);

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

  const handleCityChange = (val) => {
    setCity(val);
    clearTimeout(autocompleteTimer.current);
    if (val.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    autocompleteTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${BACKEND}/autocomplete?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      } catch(e) { setSuggestions([]); }
    }, 300);
  };

  const selectSuggestion = (s) => {
    setCity(s.description ? `${s.name}, ${s.description}` : s.name);
    setSuggestions([]);
    setShowSuggestions(false);
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

  return (
    <div style={{minHeight:"100vh",background:T.cream,fontFamily:"'DM Sans',sans-serif",paddingBottom:NAV_H+20}}>
      <style>{GLOBAL_CSS}</style>

      {/* Header — clean dark, no cream bleed */}
      <div style={{padding:"52px 20px 24px",background:"linear-gradient(160deg,#1c1612 0%,#2d1f10 100%)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 20% 50%,rgba(196,154,60,0.08) 0%,transparent 60%)",pointerEvents:"none"}}/>
        <div style={{position:"relative",zIndex:1}}>
          {/* Greeting */}
          {firstName && (
            <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",fontWeight:500,marginBottom:6}}>
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {firstName} ✦
            </div>
          )}
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:900,color:T.white,lineHeight:1.1,marginBottom:6}}>
            {heroLine}
          </h1>
          <p style={{fontSize:13,color:"rgba(255,255,255,0.35)",lineHeight:1.6}}>{subLine}</p>
        </div>
      </div>

      {/* Search card */}
      <div style={{background:T.white,margin:"0 16px",borderRadius:20,padding:"16px",boxShadow:"0 4px 20px rgba(28,22,18,0.08)",position:"relative",zIndex:2,marginTop:16}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{flex:1,position:"relative"}}>
            <input value={city} onChange={e=>handleCityChange(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&city.trim()&&onStart(city.trim(),"")}
              onBlur={()=>setTimeout(()=>setShowSuggestions(false),150)}
              onFocus={()=>suggestions.length>0&&setShowSuggestions(true)}
              placeholder="City or destination…"
              style={{width:"100%",padding:"12px 16px",borderRadius:14,border:`1.5px solid ${city?T.accent:T.dust}`,background:T.cream,color:T.ink,fontSize:14,fontWeight:600,outline:"none",transition:"border-color 0.2s"}}/>
            {showSuggestions && suggestions.length > 0 && (
              <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:T.white,borderRadius:14,boxShadow:"0 8px 24px rgba(28,22,18,0.12)",border:`1px solid ${T.dust}`,zIndex:50,overflow:"hidden"}}>
                {suggestions.map((s,i)=>(
                  <button key={i} onMouseDown={()=>selectSuggestion(s)}
                    style={{width:"100%",padding:"12px 16px",background:"none",border:"none",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10,borderBottom:i<suggestions.length-1?`1px solid ${T.dust}`:"none"}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.paper}
                    onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <span style={{fontSize:14}}>📍</span>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:T.ink}}>{s.name}</div>
                      {s.description&&<div style={{fontSize:12,color:T.inkFaint}}>{s.description}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={()=>city.trim()&&onStart(city.trim(),"")}
            style={{flexShrink:0,padding:"12px 18px",borderRadius:14,background:city.trim()?T.ink:T.dust,border:"none",color:"white",fontSize:14,fontWeight:800,cursor:city.trim()?"pointer":"default",transition:"background 0.2s"}}>
            →
          </button>
        </div>

        {/* Quick city chips — removed, search is enough */}
      </div>

      {/* Upcoming trip hero */}
      {upcomingTrips.length > 0 && (
        <div style={{padding:"16px 16px 0"}}>
          {upcomingTrips.map((trip,i)=>{
            const parts = (trip.dates||"").split("–")[0].trim();
            const d = new Date(parts + ", " + new Date().getFullYear());
            const diff = Math.ceil((d - today) / 86400000);
            return (
              <div key={i} onClick={()=>onOpenTrip(trip)}
                style={{background:`linear-gradient(135deg,${T.ink},#2d1f10)`,borderRadius:20,padding:"18px 20px",cursor:"pointer",boxShadow:"0 6px 24px rgba(28,22,18,0.15)",marginBottom:10,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:-20,right:-20,fontSize:80,opacity:0.04,fontFamily:"serif"}}>✦</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{background:"rgba(255,255,255,0.08)",borderRadius:10,padding:"4px 10px",display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.1em"}}>
                      {diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `In ${diff} days`}
                    </span>
                  </div>
                  <span style={{fontSize:12,color:"rgba(255,255,255,0.3)"}}>{trip.dates}</span>
                </div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,color:"white",marginBottom:4}}>
                  {trip.city?.split(",")[0]}
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>
                    {Array.isArray(trip.days)?trip.days.length:0} days planned
                  </div>
                  <div style={{background:T.accent,borderRadius:10,padding:"5px 12px",fontSize:12,fontWeight:700,color:"white"}}>
                    View itinerary →
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Friends planning — horizontal scroll */}
      {friendActivity.filter(t => !user || t.user_id !== user.id).length > 0 && (
        <div style={{padding:"16px 0 0"}}>
          <div style={{padding:"0 16px",fontSize:11,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:T.inkFaint,marginBottom:10}}>Friends planning</div>
          <div style={{display:"flex",gap:10,overflowX:"auto",padding:"0 16px 4px"}}>
            {friendActivity.filter(t => !user || t.user_id !== user.id).slice(0,6).map((trip,i)=>{
              const vibes = (trip.mood_context||"").split("\n").flatMap(l=>l.split(":")[1]?.split(",").map(v=>v.trim())||[]).filter(Boolean).slice(0,2);
              return (
                <div key={i} style={{flexShrink:0,width:160,background:T.white,borderRadius:16,overflow:"hidden",border:`1px solid ${T.dust}`,boxShadow:"0 2px 8px rgba(28,22,18,0.05)"}}>
                  <div style={{background:`linear-gradient(135deg,${T.ink},#2d1f10)`,padding:"12px 12px 10px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <div style={{width:26,height:26,borderRadius:"50%",background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"white",flexShrink:0}}>
                        {trip.profiles?.name?.[0]||"?"}
                      </div>
                      <div style={{fontSize:11,fontWeight:700,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{trip.profiles?.name||"Wanderer"}</div>
                    </div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:"white",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {trip.city?.split(",")[0]}
                    </div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>{trip.days?.length||0} days</div>
                  </div>
                  {vibes.length > 0 && (
                    <div style={{padding:"8px 10px",display:"flex",flexWrap:"wrap",gap:4}}>
                      {vibes.map(v=>(
                        <span key={v} style={{padding:"2px 7px",borderRadius:8,background:T.paper,fontSize:10,fontWeight:600,color:T.inkLight}}>{v}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past trips */}
      {pastTrips.length > 0 && (
        <div style={{padding:"16px 16px 0"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:T.inkFaint}}>Past trips</div>
            {pastTrips.length > 3 && <button onClick={()=>onOpenTrip(null)} style={{background:"none",border:"none",fontSize:12,color:T.accent,fontWeight:700,cursor:"pointer",padding:0}}>See all →</button>}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {pastTrips.slice(0,3).map((trip,i)=>(
              <div key={i} onClick={()=>onOpenTrip(trip)}
                style={{background:T.white,borderRadius:16,padding:"13px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",border:`1px solid ${T.dust}`}}>
                <div style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${T.ink},#2d1f10)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                  {trip.emoji||"✦"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{trip.city?.split(",")[0]}</div>
                  <div style={{fontSize:11,color:T.inkFaint}}>{trip.dates||"No dates"}</div>
                </div>
                <div style={{fontSize:16,color:T.dust}}>›</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {savedTrips.length === 0 && friendActivity.filter(t => !user || t.user_id !== user.id).length === 0 && (
        <div style={{padding:"32px 20px",textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:12}}>🌍</div>
          <div style={{fontSize:15,fontWeight:700,color:T.ink,marginBottom:6}}>Your adventures start here</div>
          <div style={{fontSize:13,color:T.inkFaint,lineHeight:1.6,maxWidth:260,margin:"0 auto"}}>Search a city above, set your vibe, and let AI plan your perfect trip.</div>
        </div>
      )}
    </div>
  );
}



// ─────────────────────────────────────────────
// PROFILE / TRAVEL STYLE QUIZ
// ─────────────────────────────────────────────
export { HomeScreen };