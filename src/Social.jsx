import { useState, useEffect } from "react";
import { GLOBAL_CSS, NAV_H, T, VIBE_COLORS_MAP } from "./constants.jsx";

const CITY_PHOTOS = {
  "New Orleans":"https://images.unsplash.com/photo-1571893544028-06b07af6dade?w=400&q=70",
  "Tokyo":      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=70",
  "Barcelona":  "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&q=70",
  "Nashville":  "https://images.unsplash.com/photo-1545579133-99bb5ab189bd?w=400&q=70",
  "Lisbon":     "https://images.unsplash.com/photo-1558370781-d6196949e317?w=400&q=70",
  "Miami":      "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=400&q=70",
  "Paris":      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=70",
  "Mexico City":"https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?w=400&q=70",
  "New York":   "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&q=70",
  "Kyoto":      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&q=70",
  "Amsterdam":  "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=400&q=70",
  "London":     "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=70",
  "Seoul":      "https://images.unsplash.com/photo-1601621915196-2621bfb0cd6e?w=400&q=70",
  "Istanbul":   "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=400&q=70",
  "Bali":       "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&q=70",
  "Bangkok":    "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=400&q=70",
};

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

function Avatar({ name, size = 36, color = T.accent }) {
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.38,fontWeight:800,color:"white",flexShrink:0}}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

function RatingCard({ rating, onPlanCity }) {
  const stars = rating.stars || 0;
  const labels = ["","Didn't enjoy it","It was okay","Good spot","Really liked it","Absolutely loved it"];
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{background:T.white,borderRadius:20,marginBottom:12,overflow:"hidden",boxShadow:"0 2px 12px rgba(28,22,18,0.07)",border:`1px solid ${T.dust}`,cursor:"pointer"}}
      onClick={()=>setExpanded(e=>!e)}>

      {/* Author row */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <Avatar name={rating.profiles?.name} size={32} color={T.sage}/>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:T.ink}}>{rating.profiles?.name || "Wanderer"}</div>
            {rating.profiles?.travel_dna && <div style={{fontSize:10,color:T.inkFaint}}>{rating.profiles.travel_dna}</div>}
          </div>
        </div>
        <div style={{fontSize:11,color:T.inkFaint}}>{timeAgo(rating.rated_at)}</div>
      </div>

      {/* Rating content */}
      <div style={{padding:"12px 14px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700,color:T.ink,marginBottom:2}}>{rating.place_name}</div>
          <div style={{fontSize:12,color:T.inkFaint}}>📍 {rating.city}</div>
        </div>
        <div style={{flexShrink:0,textAlign:"right"}}>
          <div style={{display:"flex",gap:2,justifyContent:"flex-end"}}>
            {[1,2,3,4,5].map(s=>(
              <span key={s} style={{fontSize:18,color:s<=stars?T.gold:T.dust}}>★</span>
            ))}
          </div>
          <div style={{fontSize:10,color:T.inkFaint,marginTop:2}}>{labels[stars]}</div>
        </div>
      </div>

      {/* Note */}
      {rating.note && (
        <div style={{margin:"0 14px",marginBottom:expanded?0:14,background:T.paper,borderRadius:12,padding:"10px 12px",fontSize:13,color:T.inkLight,fontStyle:"italic",lineHeight:1.5,borderLeft:`3px solid ${T.gold}`}}>
          "{rating.note}"
        </div>
      )}

      {/* Expanded CTA */}
      {expanded && (
        <div style={{padding:"12px 14px 14px",display:"flex",gap:8}} onClick={e=>e.stopPropagation()}>
          <button onClick={()=>onPlanCity(rating.city)}
            style={{flex:1,padding:"11px 0",borderRadius:14,background:T.ink,border:"none",color:T.white,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            ✦ Plan a trip to {rating.city}
          </button>
        </div>
      )}
    </div>
  );
}

function TripCard({ trip, user, following, followUser, onRemix }) {
  const vibes = parseVibesFromContext(trip.mood_context);
  const isFollowing = following.includes(trip.user_id);
  const isOwnTrip = user && trip.user_id === user.id;
  const photo = CITY_PHOTOS[trip.city?.split(",")[0].trim()];
  const dayCount = Array.isArray(trip.days) ? trip.days.length : 0;
  const topTheme = trip.days?.[0]?.theme;

  return (
    <div style={{background:T.white,borderRadius:20,marginBottom:12,overflow:"hidden",boxShadow:"0 2px 12px rgba(28,22,18,0.07)",border:`1px solid ${T.dust}`}}>

      {/* Author row */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <Avatar name={isOwnTrip ? (user?.email?.split("@")[0]) : trip.profiles?.name} size={32} color={isOwnTrip ? T.gold : T.accent}/>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:T.ink,lineHeight:1.2}}>
              {isOwnTrip ? "You" : (trip.profiles?.name || "Wanderer")}
            </div>
            {trip.profiles?.travel_dna && (
              <div style={{fontSize:10,color:T.inkFaint}}>{trip.profiles.travel_dna}</div>
            )}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:11,color:T.inkFaint}}>{timeAgo(trip.saved_at)}</div>
          {user && !isOwnTrip && (
            <button onClick={()=>followUser(trip.user_id)}
              style={{padding:"5px 12px",borderRadius:20,background:isFollowing?T.paper:`linear-gradient(135deg,${T.accent},#9b2020)`,border:`1px solid ${isFollowing?T.dust:"transparent"}`,color:isFollowing?T.inkLight:T.white,fontSize:11,fontWeight:700,cursor:"pointer",transition:"all 0.15s",boxShadow:isFollowing?"none":"0 2px 8px rgba(200,75,47,0.2)"}}>
              {isFollowing ? "Following" : "+ Follow"}
            </button>
          )}
        </div>
      </div>

      {/* City hero */}
      <div style={{margin:"10px 14px",borderRadius:14,overflow:"hidden",position:"relative",height:140,background:`linear-gradient(135deg,${T.ink},#2d1f10)`}}>
        {photo && <img src={photo} alt={trip.city} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.6) 100%)"}}/>
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"10px 14px"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"white",lineHeight:1.1}}>{trip.city?.split(",")[0]}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",marginTop:2}}>{dayCount} day{dayCount!==1?"s":""}{trip.dates ? ` · ${trip.dates}` : ""}</div>
        </div>
        {dayCount > 0 && (
          <div style={{position:"absolute",top:10,right:10,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(6px)",borderRadius:10,padding:"3px 8px",fontSize:10,color:"white",fontWeight:700}}>
            {dayCount}d trip
          </div>
        )}
      </div>

      {/* Day theme preview */}
      {topTheme && (
        <div style={{padding:"0 14px 8px",fontSize:12,color:T.inkFaint,fontStyle:"italic",lineHeight:1.4}}>
          "{topTheme}"
        </div>
      )}

      {/* Vibe chips */}
      {vibes.length > 0 && (
        <div style={{padding:"0 14px 10px",display:"flex",gap:6,flexWrap:"wrap"}}>
          {vibes.map(v => {
            const key = v.toLowerCase().replace(/ /g,"-");
            const color = VIBE_COLORS_MAP[key] || T.inkFaint;
            return <span key={v} style={{padding:"3px 9px",borderRadius:10,background:`${color}15`,fontSize:11,fontWeight:700,color}}>{v}</span>;
          })}
        </div>
      )}

      {/* Actions */}
      <div style={{padding:"0 14px 14px",display:"flex",gap:8}}>
        {!isOwnTrip ? (
          <button onClick={()=>onRemix(trip)} style={{flex:1,padding:"11px 0",borderRadius:14,background:`linear-gradient(135deg,${T.accent},#9b2020)`,border:"none",color:T.white,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:"0 4px 14px rgba(200,75,47,0.2)"}}>
            <span>✦</span> Remix this trip
          </button>
        ) : (
          <div style={{flex:1,padding:"11px 0",borderRadius:14,background:T.paper,fontSize:13,fontWeight:600,color:T.inkFaint,textAlign:"center",border:`1px solid ${T.dust}`}}>
            Your trip ✦
          </div>
        )}
      </div>
    </div>
  );
}

function SocialScreen({ supabase, user, onRemix, onPlanCity }) {
  const [tab, setTab]           = useState("discover");
  const [feed, setFeed]         = useState([]);
  const [discover, setDiscover] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followingList, setFollowingList] = useState([]); // full profiles
  const [followers, setFollowers] = useState([]);
  const [search, setSearch]     = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [placeRatings, setPlaceRatings] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { loadData(); }, []);
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

      // Fetch profiles of people you follow
      if (followingIds.length > 0) {
        const { data: fwingProfiles } = await supabase
          .from("profiles")
          .select("id, name, travel_dna")
          .in("id", followingIds);
        setFollowingList(fwingProfiles || []);
      }

      if (followingIds.length > 0) {
        const { data } = await supabase.from("trips")
          .select("*, profiles(name, travel_dna)")
          .in("user_id", [...followingIds, user.id])
          .eq("is_public", true)
          .order("saved_at", { ascending: false })
          .limit(20);
        setFeed(data || []);
      }
    }

    const { data: all } = await supabase.from("trips")
      .select("*, profiles(name, travel_dna)")
      .eq("is_public", true)
      .order("saved_at", { ascending: false })
      .limit(30);
    setDiscover(all || []);
    setLoading(false);

    // Fetch public place ratings
    // Fetch place ratings then join profiles manually
    const { data: ratingsData } = await supabase
      .from("place_ratings")
      .select("*")
      .eq("is_public", true)
      .order("rated_at", { ascending: false })
      .limit(40);

    if (ratingsData?.length) {
      const userIds = [...new Set(ratingsData.map(r => r.user_id))];
      const { data: ratingProfiles } = await supabase
        .from("profiles")
        .select("id, name, travel_dna")
        .in("id", userIds);
      const profileMap = Object.fromEntries((ratingProfiles||[]).map(p => [p.id, p]));
      setPlaceRatings(ratingsData.map(r => ({ ...r, profiles: profileMap[r.user_id] || null })));
    } else {
      setPlaceRatings([]);
    }
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
    ...(user && feed.length > 0 ? [{ id:"friends", label:`Friends${feed.length > 0 ? ` · ${feed.length}` : ""}` }] : []),
    { id:"find", label:"Find people" },
  ];

  // Merge trips and ratings for discover feed, sorted by recency
  const mergedDiscover = [...discover.map(t => ({...t, _type:"trip", _at: t.saved_at})),
    ...placeRatings.map(r => ({...r, _type:"rating", _at: r.rated_at}))]
    .sort((a,b) => new Date(b._at) - new Date(a._at))
    .slice(0, 40);

  const displayFeed = tab === "friends" ? feed : mergedDiscover;

  return (
    <div style={{minHeight:"100vh",background:T.cream,fontFamily:"'DM Sans',sans-serif",paddingBottom:NAV_H+20}}>
      <style>{GLOBAL_CSS}</style>

      {/* Header */}
      <div style={{background:T.ink,padding:"52px 20px 0"}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(196,154,60,0.7)",marginBottom:8}}>✦ FRIENDS</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,color:"white",marginBottom:16,lineHeight:1.1}}>Where friends wander.</h1>

        {/* Stats row */}
        {user && (
          <div style={{display:"flex",gap:16,marginBottom:16}}>
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
              <div style={{fontSize:18,fontWeight:800,color:"white"}}>{discover.length}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Trips</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{display:"flex",gap:0,borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
          {tabs.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:"10px 16px",background:"none",border:"none",borderBottom:`2px solid ${tab===t.id?T.gold:"transparent"}`,color:tab===t.id?"white":"rgba(255,255,255,0.4)",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.15s",marginBottom:-1}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sign-in nudge for logged out users — only on Discover */}
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
        <div style={{padding:"16px"}}>
          {loading ? (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[1,2,3].map(i=>(
                <div key={i} style={{background:T.white,borderRadius:20,height:260,border:`1px solid ${T.dust}`,animation:"pulse 1.5s ease infinite"}}/>
              ))}
            </div>
          ) : displayFeed.length === 0 ? (
            <div style={{textAlign:"center",padding:"48px 20px"}}>
              <div style={{fontSize:40,marginBottom:12}}>🌍</div>
              <div style={{fontSize:16,fontWeight:700,color:T.ink,marginBottom:8}}>
                {tab==="friends" ? "No trips from friends yet" : "No trips yet"}
              </div>
              <div style={{fontSize:13,color:T.inkFaint,lineHeight:1.6,marginBottom:20}}>
                {tab==="friends" ? "Follow some people to see their trips here." : "Be the first to save a trip!"}
              </div>
              {tab==="friends" && (
                <button onClick={()=>setTab("find")}
                  style={{padding:"12px 24px",borderRadius:14,background:T.ink,border:"none",color:"white",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                  Find friends →
                </button>
              )}
            </div>
          ) : (
            displayFeed.map((item, i) => (
              item._type === "rating"
                ? <RatingCard key={`r-${item.id}`} rating={item} onPlanCity={onPlanCity}/>
                : <TripCard key={`t-${item.id}`} trip={item} user={user} following={following} followUser={followUser} onRemix={onRemix}/>
            ))
          )}
        </div>
      )}

      {/* Find people */}
      {tab === "find" && (
        <div style={{padding:"16px"}}>
          <div style={{position:"relative",marginBottom:16}}>
            <input value={search} onChange={e=>searchUsers(e.target.value)}
              placeholder="Search by name…"
              style={{width:"100%",padding:"13px 16px",borderRadius:14,border:`1.5px solid ${search?T.accent:T.dust}`,background:T.white,color:T.ink,fontSize:14,outline:"none",transition:"border-color 0.2s"}}/>
          </div>

          {search.length >= 2 && searchResults.length === 0 && (
            <div style={{textAlign:"center",padding:"24px 0",color:T.inkFaint,fontSize:13}}>No users found for "{search}"</div>
          )}

          {searchResults.map(u => (
            <div key={u.id} style={{background:T.white,borderRadius:16,padding:"14px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12,border:`1px solid ${T.dust}`}}>
              <Avatar name={u.name} size={42} color={T.accent}/>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:T.ink}}>{u.name}</div>
                {u.travel_dna && <div style={{fontSize:11,color:T.inkFaint,marginTop:2}}>{u.travel_dna}</div>}
              </div>
              {user && u.id !== user.id && (
                <button onClick={()=>followUser(u.id)}
                  style={{padding:"8px 16px",borderRadius:20,background:following.includes(u.id)?T.paper:`linear-gradient(135deg,${T.accent},#9b2020)`,border:`1px solid ${following.includes(u.id)?T.dust:"transparent"}`,color:following.includes(u.id)?T.inkLight:T.white,fontSize:12,fontWeight:700,cursor:"pointer",transition:"all 0.15s",boxShadow:following.includes(u.id)?"none":"0 2px 8px rgba(200,75,47,0.2)"}}>
                  {following.includes(u.id) ? "Following" : "+ Follow"}
                </button>
              )}
            </div>
          ))}

          {/* People you follow */}
          {search.length < 2 && followingList.length > 0 && (
            <>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:T.inkFaint,marginBottom:10}}>
                People you follow
              </div>
              {followingList.map(u => (
                <div key={u.id} style={{background:T.white,borderRadius:16,padding:"14px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12,border:`1px solid ${T.dust}`}}>
                  <Avatar name={u.name} size={42} color={T.accent}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:T.ink}}>{u.name}</div>
                    {u.travel_dna && <div style={{fontSize:11,color:T.inkFaint,marginTop:2}}>{u.travel_dna}</div>}
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

          {/* Followers list */}
          {search.length < 2 && followers.length > 0 && (
            <>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:T.inkFaint,marginBottom:10,marginTop:8}}>
                Your followers
              </div>
              {followers.map(f => (
                <div key={f.follower_id} style={{background:T.white,borderRadius:16,padding:"14px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12,border:`1px solid ${T.dust}`}}>
                  <Avatar name={f.profiles?.name} size={42} color={T.sage}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:T.ink}}>{f.profiles?.name || "Wanderer"}</div>
                    {f.profiles?.travel_dna && <div style={{fontSize:11,color:T.inkFaint,marginTop:2}}>{f.profiles.travel_dna}</div>}
                  </div>
                  <div style={{fontSize:11,color:T.inkFaint}}>follows you</div>
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
