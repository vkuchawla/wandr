import { useState, useRef, useEffect } from "react";
import { CITY_PHOTOS, DAYS, GLOBAL_CSS, NAV_H, T, VIBE_COLORS_MAP } from "./constants.jsx";
const BACKEND = import.meta.env.VITE_BACKEND || "https://wandr-62i6.onrender.com";

function CitySearchSheet({ searchRef, query, handleQuery, suggestions, searching, pickCity, onClose }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(28,22,18,0.6)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:T.white,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,padding:"20px 20px 40px",animation:"slideUp 0.28s ease"}}>
        <div style={{width:40,height:4,borderRadius:2,background:T.dust,margin:"0 auto 20px"}}/>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:T.ink,marginBottom:14}}>Where to next?</div>
        <div style={{position:"relative"}}>
          <input
            ref={searchRef}
            value={query}
            onChange={e=>handleQuery(e.target.value)}
            placeholder="City or destination…"
            style={{width:"100%",padding:"13px 16px",borderRadius:14,border:`1.5px solid ${query?T.accent:T.dust}`,background:T.paper,color:T.ink,fontSize:15,fontWeight:600,outline:"none",fontFamily:"'DM Sans',sans-serif",transition:"border-color 0.2s",boxSizing:"border-box"}}/>
          {searching && (
            <div style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",width:16,height:16,border:`2px solid ${T.dust}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
          )}
        </div>
        {suggestions.length > 0 && (
          <div style={{marginTop:8,borderRadius:14,border:`1px solid ${T.dust}`,overflow:"hidden",background:T.white}}>
            {suggestions.map((s,i)=>(
              <button key={i} onClick={()=>pickCity(s.name)}
                style={{width:"100%",padding:"13px 16px",background:"none",border:"none",borderTop:i>0?`1px solid ${T.dust}`:"none",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10,fontFamily:"'DM Sans',sans-serif"}}>
                <span style={{fontSize:15,flexShrink:0}}>📍</span>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:T.ink}}>{s.name}</div>
                  <div style={{fontSize:12,color:T.inkFaint}}>{s.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {query.length >= 2 && !searching && suggestions.length === 0 && (
          <div style={{marginTop:12,textAlign:"center",fontSize:13,color:T.inkFaint}}>No results for "{query}"</div>
        )}
      </div>
    </div>
  );
}

function SavedTripsScreen({ savedTrips, onOpenTrip, onPlanNew, onDeleteTrip }) {
  const VIBE_C = VIBE_COLORS_MAP;
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);
  const debounce = useRef(null);

  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 120);
    else { setQuery(""); setSuggestions([]); }
  }, [showSearch]);

  const handleQuery = (val) => {
    setQuery(val);
    clearTimeout(debounce.current);
    if (val.length < 2) { setSuggestions([]); setSearching(false); return; }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        const r = await fetch(`${BACKEND}/autocomplete?q=${encodeURIComponent(val)}`);
        const d = await r.json();
        setSuggestions(d.suggestions || []);
      } catch { setSuggestions([]); }
      setSearching(false);
    }, 280);
  };

  const pickCity = (city) => {
    setShowSearch(false);
    onPlanNew(city);
  };

  const getVibes = (moodCtx) => {
    if (!moodCtx) return [];
    const all = [];
    (moodCtx || "").split("\n").forEach(line => {
      line.split(":")[1]?.split(",").map(v=>v.trim()).filter(Boolean).forEach(v => { if(!all.includes(v)) all.push(v); });
    });
    return all.slice(0, 5);
  };

  if (savedTrips.length === 0) return (
    <div style={{minHeight:"100vh",background:T.cream,fontFamily:"'DM Sans',sans-serif",paddingBottom:NAV_H}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{background:"linear-gradient(160deg,#1c1612 0%,#2d1f10 100%)",padding:"52px 20px 40px",textAlign:"center"}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(196,154,60,0.7)",marginBottom:12}}>✦ YOUR TRIPS</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:900,color:"white",marginBottom:8}}>No trips yet.</div>
        <div style={{fontSize:14,color:"rgba(255,255,255,0.4)",lineHeight:1.6}}>Plan your first adventure.</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:48,gap:16}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:48,color:T.dust,lineHeight:1}}>✦</div>
        <div style={{fontSize:15,fontWeight:700,color:T.ink}}>Your adventures start here</div>
        <div style={{fontSize:13,color:T.inkFaint,textAlign:"center",lineHeight:1.6,maxWidth:240}}>Pick a city, choose your vibe, and get a full AI-built day-by-day itinerary.</div>
        <button onClick={()=>setShowSearch(true)}
          style={{padding:"14px 28px",borderRadius:16,background:`linear-gradient(135deg,${T.accent},#9b2020)`,border:"none",color:T.white,fontSize:14,fontWeight:700,cursor:"pointer",marginTop:8,boxShadow:"0 6px 20px rgba(200,75,47,0.25)"}}>
          Search a destination →
        </button>
      </div>
      {showSearch && <CitySearchSheet searchRef={searchRef} query={query} handleQuery={handleQuery} suggestions={suggestions} searching={searching} pickCity={pickCity} onClose={()=>setShowSearch(false)}/>}
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:T.cream,fontFamily:"'DM Sans',sans-serif",paddingBottom:NAV_H+20}}>
      <style>{GLOBAL_CSS}</style>

      {/* Header */}
      <div style={{background:`linear-gradient(160deg,${T.ink} 0%,#2d1f10 100%)`,padding:"52px 20px 24px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(196,154,60,0.7)",marginBottom:10}}>✦ YOUR TRIPS</div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:700,color:T.white,marginBottom:4}}>{savedTrips.length} trip{savedTrips.length!==1?"s":""} planned.</h1>
            <p style={{fontSize:13,color:"rgba(255,255,255,0.35)"}}>Tap a trip to view or continue planning.</p>
          </div>
          <button onClick={()=>setShowSearch(true)}
            style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:14,padding:"10px 16px",color:T.white,fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0,marginTop:4,display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:16,lineHeight:1}}>+</span> New trip
          </button>
        </div>
      </div>

      {/* Trip cards */}
      <div style={{padding:"16px 16px 0"}}>
        {savedTrips.map((trip, i) => {
          const vibes = getVibes(trip.moodContext || trip.mood_context);
          const days = trip.days || [];
          const savedDate = trip.saved_at || trip.savedAt ? new Date(trip.saved_at || trip.savedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "";
          const cityKey = trip.city?.split(",")[0]?.trim();
          const photo = CITY_PHOTOS[cityKey];

          return (
            <div key={i} style={{background:T.white,borderRadius:22,overflow:"hidden",marginBottom:14,boxShadow:"0 4px 20px rgba(28,22,18,0.08)",animation:`fadeUp 0.4s ease ${i*0.06}s both`,border:`1px solid ${T.dust}`}}>

              {/* Card header */}
              <div style={{background:`linear-gradient(135deg,${T.ink},#2d1f10)`,padding:"20px 20px 16px",position:"relative",overflow:"hidden",minHeight:100}}>
                {photo && <img src={photo} alt={cityKey} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.28}} onError={e=>e.target.style.display="none"}/>}
                <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(28,22,18,0.85) 0%,rgba(45,31,16,0.75) 100%)"}}/>
                <div style={{position:"relative",zIndex:1}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:T.white,lineHeight:1.2,textShadow:"0 1px 6px rgba(0,0,0,0.3)"}}>{cityKey}</div>
                      <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginTop:4}}>{trip.dates || "No dates set"}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{background:"rgba(255,255,255,0.1)",backdropFilter:"blur(4px)",borderRadius:12,padding:"6px 12px",textAlign:"center"}}>
                        <div style={{fontSize:18,fontWeight:800,color:T.white,lineHeight:1}}>{days.length}</div>
                        <div style={{fontSize:9,color:"rgba(255,255,255,0.45)",fontWeight:700,letterSpacing:"0.06em"}}>DAYS</div>
                      </div>
                      <button onClick={(e)=>{ e.stopPropagation(); setConfirmDelete(trip); }}
                        style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:10,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"rgba(255,255,255,0.5)",fontSize:16,flexShrink:0}}>
                        ⋯
                      </button>
                    </div>
                  </div>

                  {/* Day themes preview */}
                  {days.length > 0 && (
                    <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:4}}>
                      {days.slice(0,2).map((day,j)=>(
                        <div key={j} style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:10,fontWeight:700,color:T.gold,minWidth:36}}>Day {day.day}</span>
                          <span style={{fontSize:12,fontStyle:"italic",color:"rgba(255,255,255,0.6)",fontFamily:"'Playfair Display',serif"}}>{day.theme}</span>
                        </div>
                      ))}
                      {days.length > 2 && (
                        <div style={{fontSize:11,color:"rgba(255,255,255,0.25)",marginTop:2}}>+{days.length-2} more days</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Vibes */}
              {vibes.length > 0 && (
                <div style={{padding:"12px 18px 0",display:"flex",flexWrap:"wrap",gap:6}}>
                  {vibes.map(v => {
                    const key = v.toLowerCase().replace(/ /g,"-");
                    const color = VIBE_C[key] || T.inkFaint;
                    return (
                      <span key={v} style={{padding:"4px 10px",borderRadius:10,background:`${color}15`,fontSize:11,fontWeight:700,color}}>
                        {v}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Actions */}
              <div style={{padding:"12px 18px 16px",display:"flex",gap:8,alignItems:"center"}}>
                <button onClick={()=>onOpenTrip(trip)}
                  style={{flex:1,padding:"11px 0",borderRadius:13,background:`linear-gradient(135deg,${T.accent},#9b2020)`,border:"none",color:T.white,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 14px rgba(200,75,47,0.2)"}}>
                  View itinerary →
                </button>
                {savedDate && <div style={{fontSize:11,color:T.inkFaint,flexShrink:0}}>{savedDate}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {showSearch && <CitySearchSheet searchRef={searchRef} query={query} handleQuery={handleQuery} suggestions={suggestions} searching={searching} pickCity={pickCity} onClose={()=>setShowSearch(false)}/>}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div style={{position:"fixed",inset:0,background:"rgba(28,22,18,0.7)",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}
          onClick={()=>setConfirmDelete(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.white,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,padding:"24px 20px 40px"}}>
            <div style={{width:40,height:4,borderRadius:2,background:T.dust,margin:"0 auto 20px"}}/>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:T.ink,marginBottom:6}}>Delete this trip?</div>
            <div style={{fontSize:14,color:T.inkLight,marginBottom:24}}>
              <strong>{confirmDelete.city}</strong>{confirmDelete.dates ? ` · ${confirmDelete.dates}` : ""} will be permanently removed.
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setConfirmDelete(null)}
                style={{flex:1,padding:"13px 0",borderRadius:14,background:T.paper,border:`1px solid ${T.dust}`,color:T.inkLight,fontSize:14,fontWeight:600,cursor:"pointer"}}>
                Cancel
              </button>
              <button onClick={()=>{ onDeleteTrip(confirmDelete); setConfirmDelete(null); }}
                style={{flex:1,padding:"13px 0",borderRadius:14,background:"#c84b2f",border:"none",color:"white",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                Delete trip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// AUTH SCREEN — Magic link login
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// TRIP CARD — used in social feed
// ─────────────────────────────────────────────


export { SavedTripsScreen };