import { useState, useMemo } from "react";
import { T, GLOBAL_CSS, NAV_H, CITY_PHOTOS } from "./constants.jsx";

const MOODS = [
  { id:"chill",     emoji:"🌊", label:"Chill out"  },
  { id:"adventure", emoji:"⚡", label:"Adventure"  },
  { id:"food",      emoji:"🍜", label:"Foodie"     },
  { id:"culture",   emoji:"🏛", label:"Culture"    },
  { id:"nightlife", emoji:"🎉", label:"Nightlife"  },
  { id:"romantic",  emoji:"💑", label:"Romantic"   },
  { id:"nature",    emoji:"🌿", label:"Nature"     },
  { id:"offbeat",   emoji:"🗺", label:"Offbeat"    },
];

const MOOD_TO_VIBES = {
  chill:     ["slow-morning","chill-afternoon","spa-wellness"],
  adventure: ["adventurous","day-trip"],
  food:      ["street-food","splurge-dinner","coffee-crawl","brunch"],
  culture:   ["cultural","art-design"],
  nightlife: ["nightlife","live-music"],
  romantic:  ["splurge-dinner","golden-hour"],
  nature:    ["nature","day-trip"],
  offbeat:   ["local-weird"],
};

const VIBE_LABELS = {
  "slow-morning":"Slow Morning","chill-afternoon":"Chill Afternoon","spa-wellness":"Spa & Wellness",
  "adventurous":"Adventurous","day-trip":"Day Trip","street-food":"Street Food",
  "splurge-dinner":"Splurge Dinner","coffee-crawl":"Coffee Crawl","brunch":"Brunch Vibes",
  "cultural":"Cultural","art-design":"Art & Design","nightlife":"Nightlife",
  "live-music":"Live Music","golden-hour":"Golden Hour","nature":"Nature & Parks",
  "local-weird":"Local & Weird",
};

const CITIES = [
  { name:"Tokyo",        country:"Japan",          tags:["food","culture","adventure","offbeat"], tagline:"Neon streets, silent temples, ramen at 3am" },
  { name:"Kyoto",        country:"Japan",          tags:["culture","chill","romantic","nature"],  tagline:"Bamboo groves, matcha & geisha districts" },
  { name:"Seoul",        country:"South Korea",    tags:["food","nightlife","culture","adventure"],tagline:"K-BBQ, palace hikes & neon-lit nights" },
  { name:"Bali",         country:"Indonesia",      tags:["chill","nature","romantic","adventure"],tagline:"Rice terraces, surf breaks & spa days" },
  { name:"Paris",        country:"France",         tags:["romantic","culture","food"],            tagline:"Croissants, galleries & effortless charm" },
  { name:"Barcelona",    country:"Spain",          tags:["food","nightlife","culture","chill"],   tagline:"Tapas, Gaudi & late-night beach sunsets" },
  { name:"Lisbon",       country:"Portugal",       tags:["food","chill","offbeat","culture"],     tagline:"Trams, pasteis de nata & fado nights" },
  { name:"Rome",         country:"Italy",          tags:["food","culture","romantic"],            tagline:"Ancient ruins, pasta & golden hour over the Tiber" },
  { name:"Amsterdam",    country:"Netherlands",    tags:["chill","culture","offbeat","nightlife"],tagline:"Canals, cycling & cozy cafe culture" },
  { name:"Vienna",       country:"Austria",        tags:["culture","romantic","food"],            tagline:"Palaces, coffee houses & classical music" },
  { name:"Prague",       country:"Czech Republic", tags:["nightlife","culture","romantic","offbeat"],tagline:"Gothic spires, craft beer & hidden courtyards" },
  { name:"Dubrovnik",    country:"Croatia",        tags:["romantic","chill","nature"],            tagline:"Adriatic coastline & walled old city" },
  { name:"Santorini",    country:"Greece",         tags:["romantic","chill","nature"],            tagline:"White-washed cliffs & infinite blue sunsets" },
  { name:"Marrakech",    country:"Morocco",        tags:["culture","offbeat","adventure"],        tagline:"Souks, riads & the Sahara at the edge" },
  { name:"Cape Town",    country:"South Africa",   tags:["adventure","nature","food","chill"],    tagline:"Table Mountain, oceans & world-class wine" },
  { name:"Buenos Aires", country:"Argentina",      tags:["food","nightlife","romantic","culture"],tagline:"Tango, steak & late-night everything" },
  { name:"Mexico City",  country:"Mexico",         tags:["food","culture","offbeat","nightlife"], tagline:"Street tacos, murals & mezcal bars" },
  { name:"New York",     country:"USA",            tags:["food","nightlife","culture","adventure"],tagline:"Never sleeps. Never disappoints." },
  { name:"New Orleans",  country:"USA",            tags:["food","nightlife","culture","offbeat"], tagline:"Beignets, jazz & hauntingly good times" },
  { name:"Nashville",    country:"USA",            tags:["nightlife","food","culture"],           tagline:"Honky-tonks, hot chicken & live music" },
  { name:"Miami",        country:"USA",            tags:["nightlife","chill","food"],             tagline:"Art Deco, beach clubs & Cuban food" },
  { name:"Chicago",      country:"USA",            tags:["food","culture","nightlife"],           tagline:"Deep dish, blues music & lake views" },
  { name:"Los Angeles",  country:"USA",            tags:["chill","food","nightlife"],             tagline:"Eternal summer, tacos & movie magic" },
  { name:"San Francisco",country:"USA",            tags:["food","culture","offbeat"],             tagline:"Sourdough, fog & the Golden Gate" },
  { name:"Kansas City",  country:"USA",            tags:["food","chill","offbeat"],               tagline:"BBQ, jazz roots & underrated charm" },
];

function CityCard({ city, selectedMoods, onOpen, compact }) {
  const photo = CITY_PHOTOS[city.name];
  const matchedMoods = selectedMoods.filter(m => city.tags.includes(m));
  const isPerfect = selectedMoods.length >= 2 && matchedMoods.length === selectedMoods.length;

  if (compact) {
    return (
      <div onClick={() => onOpen(city.name)}
        style={{ position:"relative", borderRadius:16, overflow:"hidden", height:130,
          cursor:"pointer", boxShadow:"0 3px 12px rgba(28,22,18,0.1)", background:"#1c1612" }}>
        {photo && <img src={photo} alt={city.name} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.6}}/>}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 55%)"}}/>
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"10px 11px"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:"white",lineHeight:1.2}}>{city.name}</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.45)"}}>{city.country}</div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={() => onOpen(city.name)}
      style={{ position:"relative", borderRadius:20, overflow:"hidden", height:160,
        cursor:"pointer", boxShadow:"0 4px 16px rgba(28,22,18,0.12)", marginBottom:10,
        background:"#1c1612", animation:"fadeUp 0.3s ease both" }}>
      {photo && <img src={photo} alt={city.name} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center",opacity:0.65}}/>}
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.9) 0%,rgba(0,0,0,0.15) 55%,transparent 100%)"}}/>

      {/* Top-right Plan button — always visible, never clipped */}
      <button onClick={e=>{e.stopPropagation();onOpen(city.name);}}
        style={{position:"absolute",top:12,right:12,padding:"7px 14px",borderRadius:20,background:"rgba(200,75,47,0.92)",backdropFilter:"blur(4px)",border:"none",color:"white",fontSize:11,fontWeight:800,cursor:"pointer",zIndex:2}}>
        Plan →
      </button>

      {isPerfect && (
        <div style={{position:"absolute",top:12,left:12,background:"rgba(196,154,60,0.92)",backdropFilter:"blur(4px)",borderRadius:20,padding:"5px 10px"}}>
          <span style={{fontSize:10,fontWeight:800,color:"white",letterSpacing:"0.05em"}}>✦ Perfect</span>
        </div>
      )}

      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"12px 14px"}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:"white",lineHeight:1.1,marginBottom:3}}>{city.name}</div>
        {/* Show tagline OR mood tags — not both */}
        {matchedMoods.length > 0 ? (
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {matchedMoods.map(m => {
              const mood = MOODS.find(x=>x.id===m);
              return (
                <span key={m} style={{padding:"2px 8px",borderRadius:8,background:"rgba(255,255,255,0.15)",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.9)"}}>
                  {mood?.emoji} {mood?.label}
                </span>
              );
            })}
          </div>
        ) : (
          <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",lineHeight:1.4}}>{city.tagline}</div>
        )}
      </div>
    </div>
  );
}

function ExploreScreen({ onSelectCity, onStart }) {
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [filterKey, setFilterKey] = useState(0);

  const toggleMood = (id) => {
    setSelectedMoods(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
    setFilterKey(k => k+1);
  };

  const openCity = (cityName) => {
    if (selectedMoods.length > 0 && onStart) {
      const vibeIds = [...new Set(selectedMoods.flatMap(m => MOOD_TO_VIBES[m] || []))].slice(0, 5);
      const moodCtx = "Day 1: " + vibeIds.map(id => VIBE_LABELS[id]).filter(Boolean).join(", ");
      onStart(cityName, "", moodCtx);
    } else {
      onSelectCity?.(cityName);
    }
  };

  const { perfect, partial } = useMemo(() => {
    if (selectedMoods.length === 0) return { perfect: [], partial: [] };
    const scored = CITIES
      .map(c => ({ ...c, matchCount: selectedMoods.filter(m => c.tags.includes(m)).length }))
      .filter(c => c.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount);
    return {
      perfect: scored.filter(c => c.matchCount === selectedMoods.length),
      partial: scored.filter(c => c.matchCount < selectedMoods.length),
    };
  }, [selectedMoods]);

  const isFiltered = selectedMoods.length > 0;
  const totalResults = isFiltered ? perfect.length + partial.length : CITIES.length;

  return (
    <div style={{minHeight:"100vh",background:"#fdf6ed",fontFamily:"'DM Sans',sans-serif",paddingBottom:NAV_H+20}}>
      <style>{GLOBAL_CSS}{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{background:"linear-gradient(160deg,#1c1612 0%,#2d1f10 100%)",padding:"52px 20px 24px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 80% 50%,rgba(196,154,60,0.07) 0%,transparent 60%)",pointerEvents:"none"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(196,154,60,0.7)",marginBottom:8}}>EXPLORE</div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:700,color:"white",lineHeight:1.15,margin:"0 0 6px"}}>How do you want<br/>to feel?</h1>
          <p style={{fontSize:13,color:"rgba(255,255,255,0.38)",margin:0,lineHeight:1.5}}>Pick a mood. We'll find where to go.</p>
        </div>
      </div>

      {/* Mood grid */}
      <div style={{background:"#f5ede0",borderBottom:"1px solid #e8dcd0",padding:"16px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {MOODS.map(mood => {
            const sel = selectedMoods.includes(mood.id);
            return (
              <button key={mood.id} onClick={()=>toggleMood(mood.id)}
                style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"12px 4px",borderRadius:14,
                  border:"1.5px solid " + (sel ? "#1c1612" : "#e8dcd0"),
                  background:sel ? "#1c1612" : "white",
                  cursor:"pointer",transition:"all 0.15s",
                  boxShadow:sel ? "0 2px 8px rgba(28,22,18,0.15)" : "none"}}>
                <span style={{fontSize:20,lineHeight:1}}>{mood.emoji}</span>
                <span style={{fontSize:10,fontWeight:700,color:sel?"white":"#a89880",lineHeight:1,textAlign:"center"}}>{mood.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Count + clear */}
      <div style={{padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:12,fontWeight:700,color:"#a89880"}}>
          {!isFiltered ? CITIES.length + " destinations"
            : totalResults === 0 ? "No matches"
            : perfect.length > 0
              ? perfect.length + " perfect match" + (perfect.length>1?"es":"") + (partial.length>0?" \u00B7 " + partial.length + " more":"")
              : totalResults + " destination" + (totalResults!==1?"s":"") + " match"}
        </div>
        {isFiltered && (
          <button onClick={()=>{setSelectedMoods([]);setFilterKey(k=>k+1);}}
            style={{background:"none",border:"1px solid #e8dcd0",borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:700,color:"#a89880",cursor:"pointer"}}>
            Clear x
          </button>
        )}
      </div>

      {/* Results */}
      <div style={{padding:"0 16px"}} key={filterKey}>

        {/* Browse mode — 2-col compact grid */}
        {!isFiltered && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {CITIES.map(city => (
              <CityCard key={city.name} city={city} selectedMoods={[]} onOpen={openCity} compact/>
            ))}
          </div>
        )}

        {/* Filter mode */}
        {isFiltered && (
          <>
            {totalResults === 0 && (
              <div style={{textAlign:"center",padding:"48px 20px"}}>
                <div style={{fontSize:40,marginBottom:12}}>🗺</div>
                <div style={{fontSize:16,fontWeight:700,color:"#1c1612",marginBottom:8}}>No destinations match</div>
                <div style={{fontSize:13,color:"#a89880"}}>Try selecting fewer moods.</div>
              </div>
            )}
            {perfect.length > 0 && (
              <>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.16em",textTransform:"uppercase",color:"#c49a3c",marginBottom:10}}>Perfect matches</div>
                {perfect.map(city => <CityCard key={city.name} city={city} selectedMoods={selectedMoods} onOpen={openCity}/>)}
              </>
            )}
            {partial.length > 0 && (
              <>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.16em",textTransform:"uppercase",color:"#a89880",marginBottom:10,marginTop:perfect.length>0?20:0}}>Also worth exploring</div>
                {partial.map(city => <CityCard key={city.name} city={city} selectedMoods={selectedMoods} onOpen={openCity}/>)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export { ExploreScreen };
