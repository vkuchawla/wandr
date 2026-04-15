import { useState, useEffect } from "react";
import { GLOBAL_CSS, NAV_H, T, VIBE_COLORS_MAP, CITY_PHOTOS, EXPLORE_CITIES } from "./constants.jsx";

function parseVibesFromContext(moodCtx) {
  if (!moodCtx) return [];
  const all = [];
  moodCtx.split("\n").forEach(line => {
    const vibes = line.split(":")[1]?.split(",").map(v => v.trim()).filter(Boolean) || [];
    vibes.forEach(v => { if (!all.includes(v)) all.push(v); });
  });
  return all.slice(0, 4);
}

function timeAgo(str) {
  if (!str) return "";
  const d = new Date(str), now = new Date();
  const mins = Math.floor((now - d) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en", { month:"short", day:"numeric" });
}

// Parse "Mar 18 – Mar 19, 2026" → { start, end } as Date objects
function parseTripDates(dateStr) {
  if (!dateStr) return { start: null, end: null };
  const year = dateStr.match(/\d{4}/)?.[0] || new Date().getFullYear();
  const parts = dateStr.split(/\s*[–—-]\s*/);
  try {
    const startRaw = parts[0].trim();
    const endRaw   = (parts[1] || parts[0]).trim();
    const start = new Date(`${startRaw}${startRaw.match(/\d{4}/) ? "" : `, ${year}`}`);
    const end   = new Date(`${endRaw}${endRaw.match(/\d{4}/)   ? "" : `, ${year}`}`);
    return { start: isNaN(start) ? null : start, end: isNaN(end) ? null : end };
  } catch { return { start: null, end: null }; }
}

// Returns "active" | "upcoming" | "past" | "unknown"
function getTripStatus(trip) {
  const { start, end } = parseTripDates(trip.dates);
  if (!start) return "unknown";
  const now = new Date();
  if (now < start) return "upcoming";
  if (end && now > end) return "past";
  return "active"; // currently traveling
}

function Avatar({ name, size = 36, color = T.accent }) {
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.38,fontWeight:800,color:"white",flexShrink:0}}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

const RATING_META = [
  null,
  { label:"Didn't enjoy it", color:"#999",     emoji:"😕" },
  { label:"It was okay",     color:T.inkFaint,  emoji:"😐" },
  { label:"Good spot",       color:"#5a8f5a",   emoji:"👍" },
  { label:"Really liked it", color:"#b8860b",   emoji:"😊" },
  { label:"Absolutely loved it", color:T.accent, emoji:"🤩" },
];

const PLACE_EMOJI = (name) => {
  const n = (name || "").toLowerCase();
  if (/coffee|café|cafe|espresso/.test(n)) return "☕";
  if (/bar|cocktail|wine|beer|pub/.test(n)) return "🍸";
  if (/restaurant|bistro|kitchen|grill|dining/.test(n)) return "🍽";
  if (/museum|gallery|art/.test(n)) return "🏛";
  if (/park|garden|nature/.test(n)) return "🌿";
  if (/market/.test(n)) return "🛒";
  if (/beach|coast/.test(n)) return "🏖";
  if (/hotel|hostel/.test(n)) return "🏨";
  return "📍";
};

// Beli-style rating card
function RatingCard({ rating, onPlanCity }) {
  const stars = rating.stars || 0;
  const meta = RATING_META[stars];
  const emoji = PLACE_EMOJI(rating.place_name);

  return (
    <div style={{background:T.white,borderRadius:18,marginBottom:10,overflow:"hidden",boxShadow:"0 2px 10px rgba(28,22,18,0.06)",border:`1px solid ${T.dust}`}}>
      {/* Author row */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px 10px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Avatar name={rating.profiles?.name} size={30} color={T.sage}/>
          <div>
            <span style={{fontSize:13,fontWeight:700,color:T.ink}}>{rating.profiles?.name || "Wanderer"}</span>
            {rating.profiles?.travel_dna && (
              <span style={{fontSize:11,color:T.inkFaint}}> · {rating.profiles.travel_dna}</span>
            )}
          </div>
        </div>
        <span style={{fontSize:11,color:T.inkFaint}}>{timeAgo(rating.rated_at)}</span>
      </div>

      {/* Main content */}
      <div style={{padding:"0 14px 14px",display:"flex",gap:12,alignItems:"flex-start"}}>
        {/* Place icon */}
        <div style={{width:44,height:44,borderRadius:12,background:T.cream,border:`1px solid ${T.dust}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
          {emoji}
        </div>

        <div style={{flex:1,minWidth:0}}>
          {/* Place name */}
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:T.ink,lineHeight:1.2,marginBottom:2}}>
            {rating.place_name}
          </div>
          {/* City */}
          <div style={{fontSize:11,color:T.inkFaint,marginBottom:8}}>📍 {rating.city}</div>

          {/* Stars + label inline */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:rating.note?8:0}}>
            <div style={{display:"flex",gap:1}}>
              {[1,2,3,4,5].map(s => (
                <span key={s} style={{fontSize:13,color:s<=stars?T.gold:T.dust}}>★</span>
              ))}
            </div>
            {meta && (
              <span style={{fontSize:12,fontWeight:700,color:meta.color}}>{meta.emoji} {meta.label}</span>
            )}
          </div>

          {/* Note */}
          {rating.note && (
            <div style={{fontSize:13,color:T.inkLight,fontStyle:"italic",lineHeight:1.5,background:T.cream,borderRadius:10,padding:"8px 10px",borderLeft:`3px solid ${T.gold}`}}>
              "{rating.note}"
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div style={{borderTop:`1px solid ${T.dust}`,padding:"10px 14px"}}>
        <button onClick={()=>onPlanCity(rating.city)}
          style={{background:"none",border:"none",color:T.accent,fontSize:12,fontWeight:700,cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:4}}>
          ✦ Plan a trip to {rating.city} →
        </button>
      </div>
    </div>
  );
}

function FeedSection({ label, accent = T.inkFaint, children }) {
  return (
    <div style={{marginBottom:8}}>
      <div style={{fontSize:11,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:accent,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
        {label}
      </div>
      {children}
    </div>
  );
}

function TripCard({ trip, user, following, followUser, onRemix, status }) {
  const vibes = parseVibesFromContext(trip.mood_context);
  const isFollowing = following.includes(trip.user_id);
  const isOwnTrip = user && trip.user_id === user.id;
  const cityKey = trip.city?.split(",")[0].trim();
  const photo = CITY_PHOTOS[cityKey];
  const dayCount = Array.isArray(trip.days) ? trip.days.length : 0;
  const themes = (trip.days || []).slice(0, 3).map(d => d.theme).filter(Boolean);

  return (
    <div style={{background:T.white,borderRadius:18,marginBottom:10,overflow:"hidden",boxShadow:"0 2px 10px rgba(28,22,18,0.06)",border:`1px solid ${T.dust}`}}>
      {/* Author row */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Avatar name={isOwnTrip ? (user?.email?.split("@")[0]) : trip.profiles?.name} size={30} color={isOwnTrip ? T.gold : T.accent}/>
          <div>
            <span style={{fontSize:13,fontWeight:700,color:T.ink}}>
              {isOwnTrip ? "You" : (trip.profiles?.name || "Wanderer")}
            </span>
            {trip.profiles?.travel_dna && (
              <span style={{fontSize:11,color:T.inkFaint}}> · {trip.profiles.travel_dna}</span>
            )}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,color:T.inkFaint}}>{timeAgo(trip.saved_at)}</span>
          {user && !isOwnTrip && (
            <button onClick={()=>followUser(trip.user_id)}
              style={{padding:"4px 10px",borderRadius:20,background:isFollowing?T.paper:`linear-gradient(135deg,${T.accent},#9b2020)`,border:`1px solid ${isFollowing?T.dust:"transparent"}`,color:isFollowing?T.inkLight:T.white,fontSize:11,fontWeight:700,cursor:"pointer",transition:"all 0.15s"}}>
              {isFollowing ? "Following" : "+ Follow"}
            </button>
          )}
        </div>
      </div>

      {/* City hero */}
      <div style={{margin:"10px 14px",borderRadius:14,overflow:"hidden",position:"relative",height:130,background:`linear-gradient(135deg,${T.ink},#2d1f10)`}}>
        {photo && <img src={photo} alt={cityKey} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.75}} onError={e=>e.target.style.display="none"}/>}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0) 30%,rgba(0,0,0,0.65) 100%)"}}/>
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"10px 12px"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:"white",lineHeight:1}}>{cityKey}</div>
          {dayCount > 0 && <div style={{fontSize:10,color:"rgba(255,255,255,0.55)",marginTop:2}}>{dayCount} day{dayCount!==1?"s":""}</div>}
        </div>
        <div style={{position:"absolute",top:8,right:8,background:status==="active"?"rgba(74,124,89,0.85)":"rgba(0,0,0,0.45)",backdropFilter:"blur(6px)",borderRadius:8,padding:"3px 8px",fontSize:10,color:"white",fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
          {status==="active" && <span style={{width:6,height:6,borderRadius:"50%",background:"#7cfc00",display:"inline-block",animation:"pulse 1.5s ease infinite"}}/>}
          {status==="active" ? "Live now" : status==="upcoming" ? "Upcoming" : `${dayCount}d trip`}
        </div>
      </div>

      {/* Day themes */}
      {themes.length > 0 && (
        <div style={{padding:"0 14px 8px",display:"flex",flexDirection:"column",gap:3}}>
          {themes.map((t, i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:10,fontWeight:700,color:T.gold,minWidth:28}}>Day {i+1}</span>
              <span style={{fontSize:12,color:T.inkLight,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t}</span>
            </div>
          ))}
        </div>
      )}

      {/* Vibes */}
      {vibes.length > 0 && (
        <div style={{padding:"0 14px 10px",display:"flex",gap:5,flexWrap:"wrap"}}>
          {vibes.map(v => {
            const key = v.toLowerCase().replace(/ /g,"-");
            const color = VIBE_COLORS_MAP[key] || T.inkFaint;
            return <span key={v} style={{padding:"3px 8px",borderRadius:8,background:`${color}15`,fontSize:11,fontWeight:700,color}}>{v}</span>;
          })}
        </div>
      )}

      {/* Actions */}
      <div style={{borderTop:`1px solid ${T.dust}`,padding:"10px 14px"}}>
        {!isOwnTrip ? (
          <button onClick={()=>onRemix(trip)}
            style={{background:"none",border:"none",color:T.accent,fontSize:12,fontWeight:700,cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:4}}>
            ✦ Remix this trip →
          </button>
        ) : (
          <span style={{fontSize:12,color:T.inkFaint}}>Your trip ✦</span>
        )}
      </div>
    </div>
  );
}

// Curated seed trips — shown when Discover feed is sparse
const _d = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString();
const SEED_TRIPS = [
  { id:"s1", city:"Tokyo, Japan", dates:"May 10 – May 15, 2026", saved_at:_d(1), mood_context:"Day 1: Street food, Cultural\nDay 2: Nightlife\nDay 3: Off the beaten path", days:[{day:1,theme:"Temples, Tsukiji fish market & Shibuya crossing"},{day:2,theme:"Golden Gai jazz bars & ramen at midnight"},{day:3,theme:"Yanaka old town & hidden Shinto shrines"}], profiles:{name:"Maya T.",travel_dna:"The Immersive Explorer"}, user_id:"s-u1", is_public:true },
  { id:"s2", city:"Barcelona, Spain", dates:"Apr 28 – May 2, 2026", saved_at:_d(2), mood_context:"Day 1: Fine dining\nDay 2: Cultural\nDay 3: Beach, Laid back", days:[{day:1,theme:"Boqueria mornings & rooftop pintxos at dusk"},{day:2,theme:"Gaudí, Gothic Quarter & vermouth hour"},{day:3,theme:"Barceloneta beach & chiringuito sundowners"}], profiles:{name:"Carlos R.",travel_dna:"The Culture Chaser"}, user_id:"s-u2", is_public:true },
  { id:"s3", city:"New York, USA", dates:"May 5 – May 8, 2026", saved_at:_d(1), mood_context:"Day 1: Street food, Cultural\nDay 2: Nightlife, Fine dining", days:[{day:1,theme:"Lower East Side bagels, the High Line & Chelsea galleries"},{day:2,theme:"West Village dinner crawl & rooftop cocktails"}], profiles:{name:"Jordan K.",travel_dna:"The Foodie Explorer"}, user_id:"s-u3", is_public:true },
  { id:"s4", city:"Lisbon, Portugal", dates:"Jun 3 – Jun 7, 2026", saved_at:_d(3), mood_context:"Day 1: Cultural, Slow mornings\nDay 2: Off the beaten path\nDay 3: Fine dining", days:[{day:1,theme:"Pastéis de Belém, Alfama tram & fado at sundown"},{day:2,theme:"LX Factory, Mouraria & hidden miradouros"},{day:3,theme:"Wine tasting & long dinner in Chiado"}], profiles:{name:"Sofia L.",travel_dna:"The Slow Traveler"}, user_id:"s-u4", is_public:true },
  { id:"s5", city:"Kyoto, Japan", dates:"Apr 20 – Apr 24, 2026", saved_at:_d(4), mood_context:"Day 1: Cultural\nDay 2: Off the beaten path\nDay 3: Slow mornings, Cultural", days:[{day:1,theme:"Fushimi Inari at dawn & Gion tea houses"},{day:2,theme:"Arashiyama bamboo & hidden temple trails"},{day:3,theme:"Morning zazen, Nishiki Market & kaiseki dinner"}], profiles:{name:"Emma W.",travel_dna:"The Mindful Wanderer"}, user_id:"s-u5", is_public:true },
  { id:"s6", city:"New Orleans, USA", dates:"May 18 – May 21, 2026", saved_at:_d(2), mood_context:"Day 1: Street food, Nightlife\nDay 2: Cultural, Street food", days:[{day:1,theme:"Café du Monde beignets, jazz brunch & Frenchmen St at midnight"},{day:2,theme:"Magazine Street, NOMA & crawfish étouffée dinner"}], profiles:{name:"Marcus D.",travel_dna:"The Night Owl"}, user_id:"s-u6", is_public:true },
  { id:"s7", city:"Marrakech, Morocco", dates:"Jun 10 – Jun 14, 2026", saved_at:_d(1), mood_context:"Day 1: Cultural, Off the beaten path\nDay 2: Street food\nDay 3: Laid back", days:[{day:1,theme:"Djemaa el-Fna at dusk & riad rooftop dinner"},{day:2,theme:"Souks, spice markets & tannery quarter"},{day:3,theme:"Palmeraie sunrise ride & hammam afternoon"}], profiles:{name:"Aisha B.",travel_dna:"The Culture Chaser"}, user_id:"s-u7", is_public:true },
  { id:"s8", city:"Seoul, South Korea", dates:"May 25 – May 29, 2026", saved_at:_d(3), mood_context:"Day 1: Street food, Cultural\nDay 2: Nightlife\nDay 3: Off the beaten path", days:[{day:1,theme:"Gyeongbokgung Palace, Insadong & KBBQ feast"},{day:2,theme:"Hongdae clubs, pojangmacha & 3am jjajangmyeon"},{day:3,theme:"Bukchon hanok village & hidden makgeolli bars"}], profiles:{name:"Ji-Woo P.",travel_dna:"The Urban Explorer"}, user_id:"s-u8", is_public:true },
  { id:"s9", city:"Amsterdam, Netherlands", dates:"May 12 – May 15, 2026", saved_at:_d(2), mood_context:"Day 1: Cultural, Slow mornings\nDay 2: Nightlife, Off the beaten path", days:[{day:1,theme:"Rijksmuseum, Jordaan canal walk & jenever tasting"},{day:2,theme:"De Pijp market, Amsterdam Noord & late-night Leidseplein"}], profiles:{name:"Lars V.",travel_dna:"The Laid-Back Traveler"}, user_id:"s-u9", is_public:true },
  { id:"s10", city:"Cape Town, South Africa", dates:"Jun 20 – Jun 25, 2026", saved_at:_d(4), mood_context:"Day 1: Adventure\nDay 2: Cultural, Fine dining\nDay 3: Laid back, Off the beaten path", days:[{day:1,theme:"Table Mountain hike & Camps Bay sunset cocktails"},{day:2,theme:"Bo-Kaap spice tour & waterfront wine dinner"},{day:3,theme:"Cape Point drive & hidden coves of Simonstown"}], profiles:{name:"Nomvula S.",travel_dna:"The Adventurer"}, user_id:"s-u10", is_public:true },
  { id:"s11", city:"Nashville, USA", dates:"May 8 – May 11, 2026", saved_at:_d(1), mood_context:"Day 1: Nightlife, Street food\nDay 2: Cultural, Laid back", days:[{day:1,theme:"Hattie B's hot chicken, honky-tonks & Broadway dive bars"},{day:2,theme:"12 South brunch, Centennial Park & rooftop whiskey"}], profiles:{name:"Tyler H.",travel_dna:"The Music Lover"}, user_id:"s-u11", is_public:true },
  { id:"s12", city:"Mexico City, Mexico", dates:"Jun 5 – Jun 9, 2026", saved_at:_d(2), mood_context:"Day 1: Street food, Cultural\nDay 2: Fine dining\nDay 3: Off the beaten path", days:[{day:1,theme:"Mercado de Jamaica, Frida Kahlo museum & mezcal bar hop"},{day:2,theme:"Pujol tasting menu & Roma Norte wine evening"},{day:3,theme:"Xochimilco chinampas & hidden Coyoacán cafés"}], profiles:{name:"Isabella F.",travel_dna:"The Foodie Explorer"}, user_id:"s-u12", is_public:true },
];

function SocialScreen({ supabase, user, onRemix, onPlanCity }) {
  const [tab, setTab]           = useState("discover");
  const [feed, setFeed]         = useState([]);
  const [discover, setDiscover] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [search, setSearch]     = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [placeRatings, setPlaceRatings] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { loadData(); }, []);

  // Clear all personal data immediately when user signs out
  useEffect(() => {
    if (!user) {
      setFeed([]);
      setDiscover([]);
      setFollowing([]);
      setFollowingList([]);
      setFollowers([]);
      setPlaceRatings([]);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const onFocus = () => loadData();
    const onRating = () => loadData();
    window.addEventListener("focus", onFocus);
    window.addEventListener("wandr:rating-saved", onRating);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("wandr:rating-saved", onRating);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    if (user) {
      const [{ data: fwing }, { data: fwers }] = await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id", user.id),
        supabase.from("follows").select("follower_id, profiles(name, travel_dna)").eq("following_id", user.id)
      ]);
      const followingIds = (fwing || []).map(f => f.following_id);
      setFollowing(followingIds);
      setFollowers(fwers || []);

      if (followingIds.length > 0) {
        const { data: fwingProfiles } = await supabase
          .from("profiles").select("id, name, travel_dna").in("id", followingIds);
        setFollowingList(fwingProfiles || []);

        const { data } = await supabase.from("trips")
          .select("*, profiles(name, travel_dna)")
          .in("user_id", [...followingIds, user.id])
          .eq("is_public", true)
          .order("saved_at", { ascending: false })
          .limit(20);
        const dedupFeed = (data || []).filter((t,_,arr) => arr.findIndex(x => x.city?.split(",")[0] === t.city?.split(",")[0] && x.user_id === t.user_id) === arr.indexOf(t));
        setFeed(dedupFeed);
      }
    }

    if (user) {
      const { data: all } = await supabase.from("trips")
        .select("*, profiles(name, travel_dna)")
        .eq("is_public", true)
        .neq("user_id", user.id)
        .order("saved_at", { ascending: false })
        .limit(30);
      const dedupDiscover = (all || []).filter((t,_,arr) => arr.findIndex(x => x.city?.split(",")[0] === t.city?.split(",")[0]) === arr.indexOf(t));
      setDiscover(dedupDiscover);
    } else {
      setDiscover([]);
    }
    if (user) {
      const { data: ratingsData } = await supabase
        .from("place_ratings")
        .select("*")
        .eq("is_public", true)
        .order("rated_at", { ascending: false })
        .limit(40);

      if (ratingsData?.length) {
        const userIds = [...new Set(ratingsData.map(r => r.user_id))];
        const { data: ratingProfiles } = await supabase
          .from("profiles").select("id, name, travel_dna").in("id", userIds);
        const profileMap = Object.fromEntries((ratingProfiles||[]).map(p => [p.id, p]));
        setPlaceRatings(ratingsData.map(r => ({ ...r, profiles: profileMap[r.user_id] || null })));
      } else {
        setPlaceRatings([]);
      }
    }
    setLoading(false);
  };

  const followUser = async (userId) => {
    if (!user) return;
    if (following.includes(userId)) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      setFollowing(prev => prev.filter(id => id !== userId));
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
      setFollowing(prev => [...prev, userId]);
    }
  };

  const searchUsers = async (q) => {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase.from("profiles").select("id, name, travel_dna").ilike("name", `%${q}%`).limit(8);
    setSearchResults(data || []);
  };

  const tabs = [
    { id:"discover", label:"Discover" },
    ...(user && feed.length > 0 ? [{ id:"friends", label:"Friends" }] : []),
    { id:"find", label:"Find people" },
  ];

  // Bucket trips by status
  const bucketTrips = (trips) => {
    const active = [], upcoming = [], past = [];
    trips.forEach(t => {
      const s = getTripStatus(t);
      if (s === "active") active.push(t);
      else if (s === "upcoming") upcoming.push(t);
      else past.push(t);
    });
    return { active, upcoming, past };
  };

  const sourceTrips = tab === "friends" ? feed : (
    discover.length < 5
      ? [...discover, ...SEED_TRIPS.filter(s => !discover.find(d => d.city?.split(",")[0] === s.city?.split(",")[0]))]
      : discover
  );
  const { active: activeTrips, upcoming: upcomingTrips, past: pastTrips } = bucketTrips(sourceTrips);

  // Signed-out gate — show nothing personal
  if (!user) return (
    <div style={{minHeight:"100vh",background:T.cream,fontFamily:"'DM Sans',sans-serif",paddingBottom:NAV_H+20}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{background:`linear-gradient(160deg,${T.ink} 0%,#2d1f10 100%)`,padding:"52px 20px 40px",textAlign:"center"}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(196,154,60,0.7)",marginBottom:12}}>✦ COMMUNITY</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700,color:"white",marginBottom:8,lineHeight:1.2}}>Where travelers wander.</h1>
        <p style={{fontSize:13,color:"rgba(255,255,255,0.38)",lineHeight:1.6,maxWidth:280,margin:"0 auto"}}>Sign in to discover trips, follow travelers, and share your adventures.</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 24px",gap:16}}>
        <div style={{fontSize:48,lineHeight:1}}>✈️</div>
        <div style={{fontSize:15,fontWeight:700,color:T.ink,textAlign:"center"}}>Join the community</div>
        <div style={{fontSize:13,color:T.inkFaint,textAlign:"center",lineHeight:1.6,maxWidth:260}}>See where other travelers are going, remix their plans, and share your own trips.</div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:T.cream,fontFamily:"'DM Sans',sans-serif",paddingBottom:NAV_H+20}}>
      <style>{GLOBAL_CSS}</style>

      {/* Header */}
      <div style={{background:T.ink,padding:"52px 20px 0"}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(196,154,60,0.7)",marginBottom:8}}>✦ COMMUNITY</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,color:"white",marginBottom:4,lineHeight:1.1}}>Where travelers wander.</h1>
        <p style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginBottom:16,lineHeight:1.5}}>Discover trips, remix plans, follow people with your travel style.</p>

        {user && (
          <div style={{display:"flex",gap:20,marginBottom:16}}>
            <div style={{textAlign:"center",cursor:"pointer"}} onClick={()=>setTab("find")}>
              <div style={{fontSize:18,fontWeight:800,color:"white"}}>{following.length}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Following</div>
            </div>
            <div style={{width:1,background:"rgba(255,255,255,0.1)"}}/>
            <div style={{textAlign:"center",cursor:"pointer"}} onClick={()=>setTab("find")}>
              <div style={{fontSize:18,fontWeight:800,color:"white"}}>{followers.length}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Followers</div>
            </div>
            <div style={{width:1,background:"rgba(255,255,255,0.1)"}}/>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:800,color:"white"}}>{placeRatings.length}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Reviews</div>
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:0,borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
          {tabs.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:"10px 16px",background:"none",border:"none",borderBottom:`2px solid ${tab===t.id?T.gold:"transparent"}`,color:tab===t.id?"white":"rgba(255,255,255,0.4)",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.15s",marginBottom:-1}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sign-in nudge */}
      {!user && tab === "discover" && (
        <div style={{margin:"16px 16px 0",background:T.ink,borderRadius:18,padding:"16px 18px",display:"flex",alignItems:"center",gap:14}}>
          <div style={{fontSize:28}}>👋</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:"white",marginBottom:3}}>Sign in to follow friends</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>See their trips, remix their mood boards.</div>
          </div>
          <button onClick={()=>window.location.hash="#profile"}
            style={{padding:"8px 14px",borderRadius:12,background:T.accent,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>
            Sign in
          </button>
        </div>
      )}

      {/* Feed */}
      {(tab === "discover" || tab === "friends") && (
        <div style={{padding:"14px 14px 0"}}>
          {loading ? (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[1,2,3].map(i=>(
                <div key={i} style={{background:T.white,borderRadius:18,height:200,border:`1px solid ${T.dust}`,animation:"pulse 1.5s ease infinite"}}/>
              ))}
            </div>
          ) : (activeTrips.length + upcomingTrips.length + pastTrips.length + placeRatings.length) === 0 ? (
            <div style={{paddingBottom:16}}>
              {tab === "friends" ? (
                <div style={{textAlign:"center",padding:"48px 20px"}}>
                  <div style={{fontSize:40,marginBottom:12}}>👀</div>
                  <div style={{fontSize:16,fontWeight:700,color:T.ink,marginBottom:8}}>Nothing from your friends yet</div>
                  <div style={{fontSize:13,color:T.inkFaint,lineHeight:1.6,marginBottom:20,maxWidth:260,margin:"0 auto 20px"}}>Follow people to see where they're traveling.</div>
                  <button onClick={()=>setTab("find")} style={{padding:"12px 24px",borderRadius:14,background:T.ink,border:"none",color:"white",fontSize:13,fontWeight:700,cursor:"pointer"}}>Find people to follow →</button>
                </div>
              ) : (
                <>
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:11,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:T.gold,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                      🔥 Trending destinations
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      {EXPLORE_CITIES.slice(0, 8).map(c => {
                        const photo = CITY_PHOTOS[c.city];
                        return (
                          <div key={c.city} style={{background:T.white,borderRadius:16,overflow:"hidden",border:`1px solid ${T.dust}`,boxShadow:"0 2px 10px rgba(28,22,18,0.06)"}}>
                            <div style={{position:"relative",height:100,background:`linear-gradient(135deg,${c.bg},${c.accent}40)`}}>
                              {photo && <img src={photo} alt={c.city} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.75}} onError={e=>e.target.style.display="none"}/>}
                              <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0) 30%,rgba(0,0,0,0.6) 100%)"}}/>
                              <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"8px 12px"}}>
                                <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:"white"}}>{c.city}</div>
                                <div style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>{c.tag}</div>
                              </div>
                              <div style={{position:"absolute",top:8,right:8,fontSize:20}}>{c.emoji}</div>
                            </div>
                            <div style={{padding:"10px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                              <div style={{fontSize:12,color:T.inkFaint}}>Plan a trip here →</div>
                              <button onClick={()=>onPlanCity(c.city)}
                                style={{padding:"7px 14px",borderRadius:10,background:T.ink,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                                ✦ Plan
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {/* 🟢 Live now */}
              {activeTrips.length > 0 && (
                <FeedSection label="🟢 Happening now" accent={T.sage}>
                  {activeTrips.map(t => <TripCard key={t.id} trip={t} user={user} following={following} followUser={followUser} onRemix={onRemix} status="active"/>)}
                </FeedSection>
              )}

              {/* 📅 Upcoming */}
              {upcomingTrips.length > 0 && (
                <FeedSection label="📅 Upcoming trips">
                  {upcomingTrips.map(t => <TripCard key={t.id} trip={t} user={user} following={following} followUser={followUser} onRemix={onRemix} status="upcoming"/>)}
                </FeedSection>
              )}

              {/* 🗺 Past trips */}
              {pastTrips.length > 0 && (
                <FeedSection label="🗺 Past trips">
                  {pastTrips.map(t => <TripCard key={t.id} trip={t} user={user} following={following} followUser={followUser} onRemix={onRemix} status="past"/>)}
                </FeedSection>
              )}

              {/* ⭐ Reviews — only in Friends tab (has context), or as secondary section in Discover */}
              {placeRatings.length > 0 && (
                <FeedSection label={tab === "friends" ? "⭐ What they're rating" : "⭐ Community reviews"} accent={tab === "friends" ? T.gold : T.inkFaint}>
                  {(tab === "friends" ? placeRatings : placeRatings.slice(0, 3)).map(r => <RatingCard key={r.id} rating={r} onPlanCity={onPlanCity}/>)}
                  {tab !== "friends" && placeRatings.length > 3 && (
                    <div style={{textAlign:"center",padding:"4px 0 8px"}}>
                      <span style={{fontSize:12,color:T.inkFaint}}>+ {placeRatings.length - 3} more reviews</span>
                    </div>
                  )}
                </FeedSection>
              )}
            </>
          )}
        </div>
      )}

      {/* Find people */}
      {tab === "find" && (
        <div style={{padding:"16px"}}>
          <div style={{marginBottom:16}}>
            <input value={search} onChange={e=>searchUsers(e.target.value)}
              placeholder="Search by name…"
              style={{width:"100%",padding:"13px 16px",borderRadius:14,border:`1.5px solid ${search?T.accent:T.dust}`,background:T.white,color:T.ink,fontSize:14,outline:"none",transition:"border-color 0.2s"}}/>
          </div>

          {search.length >= 2 && searchResults.length === 0 && (
            <div style={{textAlign:"center",padding:"24px 0",color:T.inkFaint,fontSize:13}}>No users found for "{search}"</div>
          )}

          {searchResults.map(u => (
            <div key={u.id} style={{background:T.white,borderRadius:14,padding:"13px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:12,border:`1px solid ${T.dust}`}}>
              <Avatar name={u.name} size={40} color={T.accent}/>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:T.ink}}>{u.name}</div>
                {u.travel_dna && <div style={{fontSize:11,color:T.inkFaint,marginTop:1}}>{u.travel_dna}</div>}
              </div>
              {user && u.id !== user.id && (
                <button onClick={()=>followUser(u.id)}
                  style={{padding:"7px 14px",borderRadius:20,background:following.includes(u.id)?T.paper:`linear-gradient(135deg,${T.accent},#9b2020)`,border:`1px solid ${following.includes(u.id)?T.dust:"transparent"}`,color:following.includes(u.id)?T.inkLight:T.white,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  {following.includes(u.id) ? "Following" : "+ Follow"}
                </button>
              )}
            </div>
          ))}

          {search.length < 2 && followingList.length > 0 && (
            <>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:T.inkFaint,marginBottom:10}}>People you follow</div>
              {followingList.map(u => (
                <div key={u.id} style={{background:T.white,borderRadius:14,padding:"13px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:12,border:`1px solid ${T.dust}`}}>
                  <Avatar name={u.name} size={40} color={T.accent}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:T.ink}}>{u.name}</div>
                    {u.travel_dna && <div style={{fontSize:11,color:T.inkFaint,marginTop:1}}>{u.travel_dna}</div>}
                  </div>
                  <button onClick={()=>followUser(u.id)}
                    style={{padding:"7px 14px",borderRadius:20,background:T.paper,border:`1px solid ${T.dust}`,color:T.inkLight,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    Following
                  </button>
                </div>
              ))}
              <div style={{height:1,background:T.dust,margin:"12px 0"}}/>
            </>
          )}

          {search.length < 2 && followers.length > 0 && (
            <>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:T.inkFaint,marginBottom:10,marginTop:8}}>Your followers</div>
              {followers.map(f => (
                <div key={f.follower_id} style={{background:T.white,borderRadius:14,padding:"13px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:12,border:`1px solid ${T.dust}`}}>
                  <Avatar name={f.profiles?.name} size={40} color={T.sage}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:T.ink}}>{f.profiles?.name || "Wanderer"}</div>
                    {f.profiles?.travel_dna && <div style={{fontSize:11,color:T.inkFaint,marginTop:1}}>{f.profiles.travel_dna}</div>}
                  </div>
                  <span style={{fontSize:11,color:T.inkFaint}}>follows you</span>
                </div>
              ))}
            </>
          )}

          {search.length < 2 && followers.length === 0 && followingList.length === 0 && (
            <div style={{textAlign:"center",padding:"32px 20px"}}>
              <div style={{fontSize:32,marginBottom:12}}>{user ? "🔍" : "👥"}</div>
              <div style={{fontSize:14,fontWeight:700,color:T.ink,marginBottom:6}}>
                {user ? "Find your people" : "Sign in to find friends"}
              </div>
              <div style={{fontSize:12,color:T.inkFaint,lineHeight:1.6}}>
                {user ? "Search for friends by name to follow them and see their trips." : "Create an account to follow friends and see where they wander."}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { parseVibesFromContext, TripCard, SocialScreen };
