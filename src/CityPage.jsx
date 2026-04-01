import { useState, useEffect, useRef } from "react";
import { GLOBAL_CSS, NAV_H, T, VIBE_COLORS_MAP } from "./constants.jsx";
const BACKEND = import.meta.env.VITE_BACKEND || "https://wandr-62i6.onrender.com";
function CityPage({ city, dates, supabase, user, onPlan, onSkipMood, onRemix, onBack, onSetDates }) {
  const [friendTrips, setFriendTrips] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [startDate, setStartDate]     = useState(null);
  const [endDate, setEndDate]         = useState(null);
  const [picking, setPicking]         = useState(null);
  const [calOffset, setCalOffset]     = useState(0);
  const [hoverDay, setHoverDay]       = useState(null);
  const [homeBase, setHomeBase]       = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [hotelSuggestions, setHotelSuggestions] = useState([]);
  const [showHotelSuggestions, setShowHotelSuggestions] = useState(false);
  const [hotelSuggestionsLoading, setHotelSuggestionsLoading] = useState(false);
  const hotelTimer = useRef(null);

  const handleHotelChange = (val) => {
    setHomeBase(val);
    clearTimeout(hotelTimer.current);
    if (!val || val.length < 2) { setHotelSuggestions([]); setShowHotelSuggestions(false); return; }
    setHotelSuggestionsLoading(true);
    hotelTimer.current = setTimeout(async () => {
      try {
        const cityParam = city ? `&city=${encodeURIComponent(city)}` : "";
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
    setHomeBase(full);
    setHotelSuggestions([]);
    setShowHotelSuggestions(false);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`${BACKEND}/reverse-geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
          const data = await res.json();
          if (data.address) setHomeBase(data.address);
        } catch {}
        setLocationLoading(false);
      },
      () => setLocationLoading(false),
      { timeout: 10000 }
    );
  };

  const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const MONTHS_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const today = new Date(); today.setHours(0,0,0,0);
  const fmt = d => d ? `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}` : null;

  const buildCal = () => {
    const base = new Date(); base.setDate(1); base.setMonth(base.getMonth()+calOffset);
    return { year:base.getFullYear(), month:base.getMonth(), firstDay:new Date(base.getFullYear(),base.getMonth(),1).getDay(), daysInMonth:new Date(base.getFullYear(),base.getMonth()+1,0).getDate(), label:`${MONTHS_FULL[base.getMonth()]} ${base.getFullYear()}` };
  };
  const cal = buildCal();

  const inRange = day => {
    const d = new Date(cal.year,cal.month,day);
    if (startDate && hoverDay && !endDate) return d>startDate && d<=hoverDay;
    if (startDate && endDate) return d>startDate && d<endDate;
    return false;
  };

  const handleDay = day => {
    const d = new Date(cal.year, cal.month, day);
    if (d < today) return;
    if (!startDate || picking==="start") { setStartDate(d); setEndDate(null); setPicking("end"); }
    else if (picking==="end") {
      if (d < startDate) { setStartDate(d); setEndDate(null); }
      else {
        setEndDate(d);
        setPicking(null);
        const dateStr = `${fmt(startDate)} – ${fmt(d)}, ${d.getFullYear()}`;
        if (onSetDates) onSetDates(dateStr);
      }
    }
  };

  useEffect(() => { loadFriendTrips(); }, [city]);

  const loadFriendTrips = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("trips")
      .select("*, profiles(name, travel_dna)")
      .ilike("city", `%${city.split(",")[0]}%`)
      .eq("is_public", true)
      .order("saved_at", { ascending: false })
      .limit(10);
    setFriendTrips(data || []);
    setLoading(false);
  };

  const vibeColors = { "slow-morning":"#a0522d","splurge-dinner":"#8b1a2f","street-food":"#b5600a","nightlife":"#2d2060","day-trip":"#255c3f","adventurous":"#9b2020","chill-afternoon":"#1e6b8a","local-weird":"#5a2d82","cultural":"#4a3a10","sports":"#1a5c30","golden-hour":"#b06000","spa-day":"#4a7c59","coffee-crawl":"#5c3d1e","brunch":"#8b4513","nature":"#2d5a1b","shopping":"#8b1a6b","art":"#1a3a6b","music":"#5a1a6b" };

  const getVibes = (moodCtx) => {
    if (!moodCtx) return [];
    const all = [];
    moodCtx.split("\n").forEach(line => {
      line.split(":")[1]?.split(",").map(v=>v.trim()).filter(Boolean).forEach(v => { if(!all.includes(v)) all.push(v); });
    });
    return all.slice(0, 6);
  };

  // Find most common vibes across all trips for this city
  const allVibes = friendTrips.flatMap(t => getVibes(t.mood_context));
  const vibeCounts = allVibes.reduce((acc, v) => { acc[v] = (acc[v]||0)+1; return acc; }, {});
  const topVibes = Object.entries(vibeCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([v])=>v);

  const isOwnTrip = (t) => user && t.user_id === user.id;

  return (
    <div style={{minHeight:"100vh",background:T.cream,fontFamily:"'DM Sans',sans-serif",paddingBottom:NAV_H+80}}>
      <style>{GLOBAL_CSS}</style>

      {/* Hero */}
      <div style={{background:`linear-gradient(160deg,${T.ink} 0%,#2d1f10 100%)`,padding:"52px 20px 24px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-20,right:-20,fontSize:120,opacity:0.04}}>✦</div>
        <button onClick={onBack} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:20,padding:"6px 14px",color:"rgba(255,255,255,0.6)",fontSize:12,fontWeight:600,cursor:"pointer",marginBottom:16}}>← Back</button>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(196,154,60,0.7)",marginBottom:8}}>✦ DESTINATION</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:36,fontWeight:900,color:T.white,lineHeight:1.1,marginBottom:6}}>{city.split(",")[0]}</h1>
        {dates && <div style={{fontSize:13,color:"rgba(255,255,255,0.4)"}}>{dates}</div>}

        {/* Top vibes for this city */}
        {topVibes.length > 0 && (
          <div style={{marginTop:16}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(255,255,255,0.3)",marginBottom:8}}>
              Popular vibes here
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {topVibes.map(v=>{
                const color = vibeColors[v.toLowerCase().replace(/ /g,"-")] || T.accent;
                return (
                  <span key={v} style={{padding:"5px 12px",borderRadius:20,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.7)"}}>
                    {v}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Friend trips */}
      <div style={{padding:"20px 16px 0"}}>
        {loading ? (
          <div style={{textAlign:"center",padding:32,color:T.inkFaint,fontSize:14}}>Loading…</div>
        ) : friendTrips.length > 0 ? (
          <>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:T.inkFaint,marginBottom:14}}>
              {friendTrips.length} trip{friendTrips.length!==1?"s":""} planned here
            </div>
            {friendTrips.map((trip, i) => {
              const vibes = getVibes(trip.mood_context);
              return (
                <div key={trip.id} style={{background:T.white,borderRadius:18,marginBottom:12,overflow:"hidden",boxShadow:"0 2px 12px rgba(28,22,18,0.06)",animation:`fadeUp 0.4s ease ${i*0.05}s both`}}>
                  {/* Who planned it */}
                  <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:isOwnTrip(trip)?T.gold:T.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:T.white}}>
                        {trip.profiles?.name?.[0] || "?"}
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:T.ink}}>
                          {isOwnTrip(trip) ? "You" : (trip.profiles?.name || "Wanderer")}
                        </div>
                        {trip.profiles?.travel_dna && (
                          <div style={{fontSize:10,color:T.inkFaint}}>{trip.profiles.travel_dna}</div>
                        )}
                      </div>
                    </div>
                    <div style={{fontSize:11,color:T.inkFaint}}>{trip.days?.length||0} days</div>
                  </div>

                  {/* Vibes */}
                  {vibes.length > 0 && (
                    <div style={{padding:"0 16px 12px",display:"flex",flexWrap:"wrap",gap:6}}>
                      {vibes.map(v=>{
                        const color = vibeColors[v.toLowerCase().replace(/ /g,"-")] || T.inkFaint;
                        return (
                          <span key={v} style={{padding:"4px 10px",borderRadius:10,background:`${color}15`,fontSize:11,fontWeight:700,color}}>
                            {v}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Itinerary preview — day themes */}
                  {trip.days?.length > 0 && (
                    <div style={{padding:"8px 16px 12px",borderTop:`1px solid ${T.dust}`}}>
                      {trip.days.slice(0,2).map((day,j)=>(
                        <div key={j} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0"}}>
                          <span style={{fontSize:11,fontWeight:700,color:T.gold,minWidth:40}}>Day {day.day}</span>
                          <span style={{fontSize:12,fontStyle:"italic",color:T.inkLight}}>{day.theme}</span>
                        </div>
                      ))}
                      {trip.days.length > 2 && (
                        <div style={{fontSize:11,color:T.inkFaint,marginTop:4}}>+{trip.days.length-2} more days</div>
                      )}
                    </div>
                  )}

                  {/* Remix */}
                  {!isOwnTrip(trip) && (
                    <div style={{padding:"0 16px 14px"}}>
                      <button onClick={()=>onRemix(trip)}
                        style={{width:"100%",padding:"10px 0",borderRadius:12,background:T.ink,border:"none",color:T.white,fontSize:13,fontWeight:700,cursor:"pointer"}}>
                        ✦ Remix this trip
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <div style={{textAlign:"center",padding:"32px 0"}}>
            <div style={{fontSize:32,marginBottom:12}}>🌍</div>
            <div style={{fontSize:15,fontWeight:700,color:T.ink,marginBottom:6}}>No trips planned here yet</div>
            <div style={{fontSize:13,color:T.inkFaint,lineHeight:1.6}}>Be the first to plan {city.split(",")[0]}.</div>
          </div>
        )}
      </div>

      {/* CTA with date picker */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,paddingTop:16,paddingLeft:16,paddingRight:16,paddingBottom:NAV_H+12,background:`linear-gradient(to top,${T.cream} 70%,transparent)`}}>
        
        {/* Date picker */}
        <div style={{background:T.white,borderRadius:18,padding:"12px 14px",marginBottom:10,boxShadow:"0 2px 12px rgba(28,22,18,0.08)",border:`1px solid ${T.dust}`}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.inkFaint,marginBottom:8}}>When are you going?</div>
          <div style={{display:"flex",gap:8}}>
            {[["start","Depart",startDate],["end","Return",endDate]].map(([key,lbl,val])=>(
              <button key={key} onClick={()=>setPicking(picking===key?null:key)}
                style={{flex:1,padding:"9px 12px",borderRadius:12,border:`1.5px solid ${picking===key?T.accent:T.dust}`,background:picking===key?"#fdf8f4":T.cream,cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.inkFaint,marginBottom:1}}>{lbl}</div>
                <div style={{fontSize:13,fontWeight:700,color:val?T.ink:T.inkFaint}}>{val?fmt(val):"Select date"}</div>
              </button>
            ))}
            {(startDate||endDate) && (
              <button onClick={()=>{setStartDate(null);setEndDate(null);setPicking(null);if(onSetDates)onSetDates("");}}
                style={{padding:"0 10px",borderRadius:12,border:`1.5px solid ${T.dust}`,background:"none",color:T.inkFaint,cursor:"pointer",fontSize:16}}>✕</button>
            )}
          </div>

          {/* Calendar */}
          {picking && (
            <div style={{marginTop:10,animation:"fadeIn 0.2s ease"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <button onClick={()=>setCalOffset(o=>o-1)} style={{background:"none",border:"none",cursor:"pointer",color:T.inkLight,fontSize:18,padding:"0 4px"}}>‹</button>
                <span style={{fontSize:12,fontWeight:700,color:T.ink}}>{cal.label}</span>
                <button onClick={()=>setCalOffset(o=>o+1)} style={{background:"none",border:"none",cursor:"pointer",color:T.inkLight,fontSize:18,padding:"0 4px"}}>›</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,textAlign:"center"}}>
                {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} style={{fontSize:9,color:T.inkFaint,padding:"2px 0",fontWeight:700}}>{d}</div>)}
                {Array(cal.firstDay).fill(null).map((_,i)=><div key={`e${i}`}/>)}
                {Array(cal.daysInMonth).fill(null).map((_,i)=>{
                  const day=i+1; const d=new Date(cal.year,cal.month,day);
                  const isPast=d<today, isStart=startDate&&d.toDateString()===startDate.toDateString(), isEnd=endDate&&d.toDateString()===endDate.toDateString(), isIn=inRange(day);
                  return (
                    <button key={day} onClick={()=>handleDay(day)}
                      onMouseEnter={()=>{if(picking==="end"&&startDate)setHoverDay(new Date(cal.year,cal.month,day));}}
                      onMouseLeave={()=>setHoverDay(null)}
                      disabled={isPast}
                      style={{padding:"5px 1px",borderRadius:6,border:"none",background:isStart||isEnd?T.accent:isIn?"rgba(200,75,47,0.1)":"transparent",color:isPast?T.dust:isStart||isEnd?T.white:T.ink,fontSize:11,cursor:isPast?"default":"pointer",fontWeight:isStart||isEnd?700:400}}>
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Hotel / Location input */}
        <div style={{position:"relative",marginBottom:10}}>
          <div style={{background:T.white,borderRadius:18,padding:"12px 14px",boxShadow:"0 2px 12px rgba(28,22,18,0.08)",border:`1.5px solid ${homeBase ? T.sage : T.dust}`,transition:"border-color 0.2s"}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.inkFaint,marginBottom:8}}>Where are you staying?</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:14,flexShrink:0}}>🏨</span>
              <input
                value={homeBase}
                onChange={e=>handleHotelChange(e.target.value)}
                onFocus={()=>hotelSuggestions.length>0&&setShowHotelSuggestions(true)}
                onBlur={()=>setTimeout(()=>setShowHotelSuggestions(false),150)}
                placeholder="Hotel or address (optional)"
                style={{flex:1,border:"none",background:"transparent",color:homeBase?T.ink:T.inkFaint,fontSize:13,fontWeight:homeBase?600:400,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
              <button
                onClick={detectLocation}
                title="Use my current location"
                style={{flexShrink:0,background:"none",border:"none",padding:"4px 6px",cursor:"pointer",fontSize:18,lineHeight:1,color:T.inkFaint,transition:"color 0.15s",opacity:locationLoading?0.4:1}}>
                {locationLoading ? "…" : "🔍"}
              </button>
              {homeBase && <button onClick={()=>{setHomeBase("");setHotelSuggestions([]);}} style={{background:"none",border:"none",cursor:"pointer",color:T.inkFaint,fontSize:18,lineHeight:1,padding:0,flexShrink:0}}>×</button>}
            </div>
            {locationLoading && <div style={{fontSize:11,color:T.inkFaint,marginTop:5}}>Finding your location…</div>}
            {homeBase && !locationLoading && !showHotelSuggestions && <div style={{fontSize:11,color:T.sage,fontWeight:600,marginTop:5}}>✓ Routing your day from {homeBase.split(",")[0]}</div>}
          </div>
          {/* Hotel suggestions dropdown */}
          {(showHotelSuggestions && hotelSuggestions.length > 0) || hotelSuggestionsLoading ? (
            <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:T.white,borderRadius:14,boxShadow:"0 8px 24px rgba(28,22,18,0.12)",border:`1px solid ${T.dust}`,zIndex:60,overflow:"hidden"}}>
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
        </div>

        {/* Fast lane — primary CTA */}
        <button onClick={()=>onSkipMood ? onSkipMood(homeBase) : onPlan()}
          style={{width:"100%",padding:"16px 20px",borderRadius:16,background:`linear-gradient(135deg,${T.ink} 0%,#2d1f10 100%)`,border:"none",color:T.white,cursor:"pointer",boxShadow:"0 6px 24px rgba(28,22,18,0.25)",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"space-between",textAlign:"left"}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:T.white}}>Generate itinerary ✦</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:2}}>AI curates the perfect mix for {city.split(",")[0]}</div>
          </div>
          <div style={{width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:16}}>✦</div>
        </button>

        {/* Mood lane — secondary CTA */}
        <button onClick={onPlan}
          style={{width:"100%",padding:"12px 20px",borderRadius:14,background:"transparent",border:`1.5px solid ${T.dust}`,color:T.inkLight,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <span style={{fontSize:14}}>🎨</span> Set the mood first →
        </button>
      </div>
    </div>
  );
}

export { CityPage };