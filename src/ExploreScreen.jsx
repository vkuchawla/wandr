import { useState, useEffect, useRef } from "react";
import { T, GLOBAL_CSS, NAV_H, EXPLORE_CITIES, VIBES } from "./constants.jsx";

const CITY_PHOTOS = {
  "New Orleans": "https://images.unsplash.com/photo-1571893544028-06b07af6dade?w=600&q=80",
  "Tokyo":       "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80",
  "Barcelona":   "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&q=80",
  "Nashville":   "https://images.unsplash.com/photo-1545579133-99bb5ab189bd?w=600&q=80",
  "Lisbon":      "https://images.unsplash.com/photo-1558370781-d6196949e317?w=600&q=80",
  "Miami":       "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=600&q=80",
  "Paris":       "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80",
  "Mexico City": "https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?w=600&q=80",
  "New York":    "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80",
  "Kyoto":       "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80",
  "Amsterdam":   "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=600&q=80",
  "Buenos Aires":"https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=600&q=80",
  "Cape Town":   "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=600&q=80",
  "Seoul":       "https://images.unsplash.com/photo-1601621915196-2621bfb0cd6e?w=600&q=80",
  "London":      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80",
  "Marrakech":   "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=600&q=80",
  "Istanbul":    "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=600&q=80",
  "Bali":        "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80",
  "Bangkok":     "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=600&q=80",
  "Copenhagen":  "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=600&q=80",
  "Porto":       "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&q=80",
  "Singapore":   "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600&q=80",
};

const CITY_VIBES = {
  "New Orleans": ["Jazz clubs","Creole food","Garden District"],
  "Tokyo":       ["Ramen alleys","Shibuya","Onsen"],
  "Barcelona":   ["Gaudí","Tapas crawl","Beach clubs"],
  "Nashville":   ["Live music","Hot chicken","Honky-tonk"],
  "Lisbon":      ["Fado nights","Tram 28","Pastéis de nata"],
  "Miami":       ["Art Basel","South Beach","Cuban food"],
  "Paris":       ["Café culture","Seine walks","Marché"],
  "Mexico City": ["Tacos al pastor","Frida Kahlo","Mezcal bars"],
  "New York":    ["Bagels","Central Park","Brooklyn"],
  "Kyoto":       ["Bamboo grove","Tea ceremony","Geisha district"],
  "Amsterdam":   ["Canal boats","Stroopwafels","Rijksmuseum"],
  "Buenos Aires":["Tango","Asado","Palermo Soho"],
  "Cape Town":   ["Table Mountain","Braai","Winelands"],
  "Seoul":       ["K-BBQ","Han River","Dongdaemun"],
  "London":      ["Pubs","Borough Market","Parks"],
  "Marrakech":   ["Medina","Hammam","Spice souks"],
};

// Curated additions — all have photos
const MORE_CITIES = [
  { city:"Istanbul",   tag:"East meets west",       emoji:"🕌", bg:"#2d1a0e", accent:"#c49a3c" },
  { city:"Bali",       tag:"Temples & rice fields", emoji:"🌺", bg:"#0e2d1a", accent:"#4a7c59" },
  { city:"Bangkok",    tag:"Temples & street food", emoji:"🛺", bg:"#2d1a00", accent:"#c84b2f" },
  { city:"Copenhagen", tag:"Hygge & design",        emoji:"🚲", bg:"#0e1a2d", accent:"#4a7c59" },
  { city:"Porto",      tag:"Wine & azulejos",       emoji:"🍷", bg:"#1a0e2d", accent:"#a04060" },
  { city:"Singapore",  tag:"Clean & electric",      emoji:"🦁", bg:"#0e2d2d", accent:"#4a7c59" },
];

const CITY_VIBES_EXTRA = {
  "Istanbul":   ["Bosphorus cruise","Grand Bazaar","Hammam"],
  "Bali":       ["Ubud rice fields","Uluwatu cliff","Seminyak nights"],
  "Bangkok":    ["Floating markets","Tuk-tuk rides","Pad thai"],
  "Copenhagen": ["Noma's legacy","Nyhavn canals","Design museums"],
  "Porto":      ["Port wine cellars","Ribeira district","Francesinha"],
  "Singapore":  ["Hawker centres","Gardens by the Bay","Marina Bay"],
};

const ALL_CITIES = [...EXPLORE_CITIES, ...MORE_CITIES];

const BACKEND = "https://wandr-62i6.onrender.com";

function ExploreScreen({ onSelectCity, supabase, user }) {
  const [quickRate, setQuickRate] = useState(null); // {placeName, city}
  const [quickStars, setQuickStars] = useState(0);
  const [quickNote, setQuickNote] = useState("");
  const [quickSaved, setQuickSaved] = useState(false);

  const submitQuickRate = async () => {
    if (!quickStars || !supabase || !user) return;
    await supabase.from("place_ratings").insert({
      user_id: user.id,
      place_name: quickRate.placeName,
      city: quickRate.city,
      stars: quickStars,
      note: quickNote.trim() || null,
      is_public: true,
      rated_at: new Date().toISOString()
    });
    setQuickSaved(true);
    setTimeout(() => {
      setQuickRate(null); setQuickStars(0); setQuickNote(""); setQuickSaved(false);
    }, 1500);
  };
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tripCounts, setTripCounts] = useState({});
  const autocompleteTimer = useRef(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("trips").select("city").eq("is_public", true)
      .then(({ data }) => {
        if (!data) return;
        const counts = {};
        data.forEach(t => { counts[t.city] = (counts[t.city] || 0) + 1; });
        setTripCounts(counts);
      });
  }, []);

  const handleSearch = (val) => {
    setQuery(val);
    clearTimeout(autocompleteTimer.current);
    if (val.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    autocompleteTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${BACKEND}/autocomplete?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      } catch(e) {
        try {
          await new Promise(r => setTimeout(r, 2000));
          const res = await fetch(`${BACKEND}/autocomplete?q=${encodeURIComponent(val)}`);
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions(true);
        } catch { setSuggestions([]); }
      }
    }, 300);
  };

  const featured = EXPLORE_CITIES.slice(0, 4);

  return (
    <div style={{minHeight:"100vh",background:T.cream,fontFamily:"'DM Sans',sans-serif",paddingBottom:NAV_H+20}}>
      <style>{GLOBAL_CSS}</style>

      {/* Header */}
      <div style={{background:"linear-gradient(160deg,#1c1612 0%,#2d1f10 100%)",padding:"52px 20px 20px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 80% 50%,rgba(196,154,60,0.07) 0%,transparent 60%)",pointerEvents:"none"}}/>
        <div style={{position:"relative",zIndex:1}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(196,154,60,0.7)",marginBottom:10}}>✦ EXPLORE</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:900,color:"white",lineHeight:1.1,marginBottom:16}}>Where to next?</h1>

        {/* Search — any city in the world */}
        <div style={{position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",background:T.white,borderRadius:14,border:`1.5px solid ${query ? T.accent : T.dust}`,overflow:"visible",transition:"border-color 0.2s"}}>
            <span style={{padding:"0 12px",fontSize:16}}>🔍</span>
            <input
              value={query}
              onChange={e=>handleSearch(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&query.trim()){ setShowSuggestions(false); onSelectCity(query.trim()); }}}
              onBlur={()=>setTimeout(()=>setShowSuggestions(false),150)}
              onFocus={()=>suggestions.length>0&&setShowSuggestions(true)}
              placeholder="Any city in the world…"
              style={{flex:1,padding:"13px 0",background:"none",border:"none",color:T.ink,fontSize:14,fontWeight:600,outline:"none"}}/>
            {query && (
              <button onClick={()=>{setQuery("");setSuggestions([]);setShowSuggestions(false);}} style={{padding:"0 12px",background:"none",border:"none",color:T.inkFaint,cursor:"pointer",fontSize:16}}>✕</button>
            )}
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:T.white,borderRadius:14,boxShadow:"0 8px 24px rgba(28,22,18,0.12)",border:`1px solid ${T.dust}`,zIndex:50,overflow:"hidden"}}>
              {suggestions.map((s,i)=>(
                <button key={i} onMouseDown={()=>{ setShowSuggestions(false); onSelectCity(s.description ? `${s.name}, ${s.description}` : s.name); }}
                  style={{width:"100%",padding:"12px 16px",background:"none",border:"none",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10,borderBottom:i<suggestions.length-1?`1px solid ${T.dust}`:"none"}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.paper}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <span>📍</span>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:T.ink}}>{s.name}</div>
                    {s.description&&<div style={{fontSize:11,color:T.inkFaint}}>{s.description}</div>}
                  </div>
                </button>
              ))}
              <button onMouseDown={()=>{ setShowSuggestions(false); onSelectCity(query.trim()); }}
                style={{width:"100%",padding:"12px 16px",background:T.paper,border:"none",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10,borderTop:`1px solid ${T.dust}`}}>
                <span>✦</span>
                <div style={{fontSize:13,fontWeight:700,color:T.accent}}>Plan a trip to "{query}" →</div>
              </button>
            </div>
          )}
        </div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:8}}>Plan any destination worldwide ✦</div>
        </div>
      </div>

      {/* Featured 2x2 grid */}
      <div style={{padding:"0 16px 16px"}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:T.inkFaint,marginBottom:10}}>Popular right now</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {featured.map(c => {
            const photo = CITY_PHOTOS[c.city];
            const count = tripCounts[c.city];
            return (
              <div key={c.city} onClick={()=>onSelectCity(c.city)} style={{position:"relative"}}
              onMouseEnter={e=>e.currentTarget.querySelector(".rate-btn")?.style&&(e.currentTarget.querySelector(".rate-btn").style.opacity="1")}
              onMouseLeave={e=>e.currentTarget.querySelector(".rate-btn")?.style&&(e.currentTarget.querySelector(".rate-btn").style.opacity="0")}
                style={{borderRadius:18,overflow:"hidden",cursor:"pointer",position:"relative",height:150,background:c.bg,boxShadow:"0 4px 20px rgba(28,22,18,0.12)"}}>
                {photo&&<img src={photo} alt={c.city} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>}
                <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.65) 100%)"}}/>
                {count>0&&<div style={{position:"absolute",top:10,right:10,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(6px)",borderRadius:10,padding:"3px 8px",fontSize:10,color:"white",fontWeight:700}}>{count} trip{count!==1?"s":""}</div>}
                <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"10px 12px"}}>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:c.accent,marginBottom:2}}>{c.tag}</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700,color:"white",lineHeight:1.2}}>{c.city}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All destinations */}
      <div style={{padding:"0 16px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.inkFaint}}>All destinations</div>
          <div style={{fontSize:11,color:T.inkFaint}}>{ALL_CITIES.length} cities — or search any</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {ALL_CITIES.slice(4).map(c => {
            const photo = CITY_PHOTOS[c.city];
            const count = tripCounts[c.city];
            const vibes = ((CITY_VIBES[c.city] || CITY_VIBES_EXTRA[c.city]) || []).slice(0,3);
            return (
              <div key={c.city} onClick={()=>onSelectCity(c.city)} style={{position:"relative"}}
              onMouseEnter={e=>e.currentTarget.querySelector(".rate-btn")?.style&&(e.currentTarget.querySelector(".rate-btn").style.opacity="1")}
              onMouseLeave={e=>e.currentTarget.querySelector(".rate-btn")?.style&&(e.currentTarget.querySelector(".rate-btn").style.opacity="0")}
                style={{borderRadius:16,overflow:"hidden",cursor:"pointer",background:T.white,border:`1px solid ${T.dust}`,display:"flex",alignItems:"stretch"}}>
                <div style={{width:80,flexShrink:0,background:c.bg,position:"relative",overflow:"hidden",minHeight:80}}>
                  {photo&&<img src={photo} alt={c.city} style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}} onError={e=>e.target.style.display="none"}/>}
                  <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.15)"}}/>
                  {!photo&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,opacity:0.4}}>{c.emoji}</div>}
                </div>
                <div style={{flex:1,padding:"12px 12px 10px",minWidth:0,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:T.ink,lineHeight:1.2}}>{c.city}</div>
                    {count>0&&<div style={{fontSize:10,color:T.sage,fontWeight:700,flexShrink:0,marginLeft:8}}>{count} trip{count!==1?"s":""}</div>}
                  </div>
                  <div style={{fontSize:10,color:T.inkFaint,marginBottom:vibes.length>0?6:0}}>{c.tag}</div>
                  {vibes.length>0&&(
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {vibes.map(v=><span key={v} style={{fontSize:10,fontWeight:600,color:T.inkLight,background:T.paper,borderRadius:8,padding:"3px 8px",border:`1px solid ${T.dust}`}}>{v}</span>)}
                    </div>
                  )}
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",paddingRight:12,gap:8}}>
                  <div style={{color:T.dust,fontSize:16}}>›</div>
                  {user && (
                    <button className="rate-btn"
                      onClick={e=>{ e.stopPropagation(); setQuickRate({placeName:c.city, city:c.city}); }}
                      style={{fontSize:10,fontWeight:700,color:T.accent,background:`${T.accent}15`,border:`1px solid ${T.accent}30`,borderRadius:8,padding:"3px 6px",cursor:"pointer",whiteSpace:"nowrap",opacity:0,transition:"opacity 0.15s"}}>
                      ★ Rate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* "Any city" CTA at bottom */}
        <div style={{marginTop:16,padding:"20px",background:T.ink,borderRadius:18,textAlign:"center"}}>
          <div style={{fontSize:13,fontWeight:700,color:"white",marginBottom:6}}>Don't see your city?</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginBottom:14,lineHeight:1.5}}>Wandr can build itineraries for any destination on earth — from Tbilisi to Tucson.</div>
          <button
            onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}
            style={{width:"100%",padding:"12px",borderRadius:12,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.7)",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <span>🔍</span><span>Search any city ✦</span>
          </button>
        </div>
      </div>
      {/* Quick Rate Sheet */}
      {quickRate && (
        <div style={{position:"fixed",inset:0,background:"rgba(28,22,18,0.7)",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}
          onClick={()=>{ setQuickRate(null); setQuickStars(0); setQuickNote(""); }}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.white,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,padding:"24px 20px 40px"}}>
            <div style={{width:40,height:4,borderRadius:2,background:T.dust,margin:"0 auto 20px"}}/>
            {quickSaved ? (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:36,marginBottom:8}}>✦</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:T.ink}}>Shared with friends!</div>
              </div>
            ) : (
              <>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:T.ink,marginBottom:4}}>{quickRate.placeName}</div>
                <div style={{fontSize:13,color:T.inkFaint,marginBottom:20}}>📍 {quickRate.city}</div>
                <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:16}}>
                  {[1,2,3,4,5].map(s=>(
                    <button key={s} onClick={()=>setQuickStars(s)}
                      style={{fontSize:40,background:"none",border:"none",cursor:"pointer",color:s<=quickStars?T.gold:T.dust,transform:s===quickStars?"scale(1.2)":"scale(1)",transition:"all 0.1s"}}>★</button>
                  ))}
                </div>
                <input value={quickNote} onChange={e=>setQuickNote(e.target.value)}
                  placeholder="Add a note for friends… (optional)"
                  style={{width:"100%",padding:"12px 14px",borderRadius:14,border:`1.5px solid ${T.dust}`,background:T.cream,color:T.ink,fontSize:13,outline:"none",marginBottom:14,fontFamily:"'DM Sans',sans-serif"}}/>
                <button onClick={submitQuickRate} disabled={!quickStars || !user}
                  style={{width:"100%",padding:"14px 0",borderRadius:16,background:quickStars&&user?`linear-gradient(135deg,${T.accent},#9b2020)`:T.dust,border:"none",color:"white",fontSize:14,fontWeight:700,cursor:quickStars&&user?"pointer":"default",boxShadow:quickStars&&user?"0 6px 20px rgba(200,75,47,0.25)":"none"}}>
                  {!user ? "Sign in to rate" : !quickStars ? "Tap a star to rate" : "Share with friends ✦"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { ExploreScreen };
