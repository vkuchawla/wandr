import { useState, useEffect, lazy, Suspense } from "react";
import { OnboardingSplash } from "./OnboardingSplash.jsx";
import { PublicTrip } from "./PublicTrip.jsx";

const BACKEND = import.meta.env.VITE_BACKEND || (import.meta.env.PROD ? "https://wandr-62i6.onrender.com" : "");

// Keep Render backend warm — ping on load and every 5 minutes (Render sleeps after 15 min)
const pingBackend = () => fetch(`${BACKEND}/health`).catch(()=>{});
pingBackend();
setInterval(pingBackend, 5 * 60 * 1000);
import { createClient } from "@supabase/supabase-js";
import { T, GLOBAL_CSS, NAV_H } from "./constants.jsx";
import { NavBar } from "./NavBar.jsx";
import { HomeScreen } from "./HomeScreen.jsx";
import { ProfileScreen } from "./ProfileScreen.jsx";
import { ExploreScreen } from "./ExploreScreen.jsx";
import { MoodBoard } from "./MoodBoard.jsx";
import { CityPage } from "./CityPage.jsx";
import { AuthGateModal, AuthScreen, SignInPrompt } from "./Auth.jsx";

// Heavy screens — code split so they don't block initial load
const ItineraryView  = lazy(() => import("./ItineraryView.jsx").then(m => ({ default: m.ItineraryView })));
const SavedTripsScreen = lazy(() => import("./SavedTripsScreen.jsx").then(m => ({ default: m.SavedTripsScreen })));
const SocialScreen   = lazy(() => import("./Social.jsx").then(m => ({ default: m.SocialScreen })));

const LazyFallback = () => (
  <div style={{minHeight:"100vh",background:T.cream,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{fontFamily:"'Playfair Display',serif",fontSize:40,color:T.inkFaint,animation:"pulse 1.5s ease infinite"}}>✦</div>
  </div>
);

const supabase = createClient(
  "https://ejutttjjptmkhyqxoytl.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdXR0dGpqcHRta2h5cXhveXRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NTA4MzgsImV4cCI6MjA4OTAyNjgzOH0.kac5jh8nTs_IoruG2GlNkGWpRWZsyw_XcUj0hQmcdZ4"
);

// Public trip URL detection — module-level so it's stable across renders
const publicTripId = window.location.pathname.match(/^\/trip\/([^/]+)$/)?.[1] || null;

// Free tier limit
const FREE_TRIP_LIMIT = 3;

// UpgradeModal — shown when free user hits trip limit
function UpgradeModal({ onClose }) {
  const PERKS = [
    ["✦", "Unlimited trips", "Save as many itineraries as you want"],
    ["🗺", "Offline maps", "Access your route anywhere, no wifi needed"],
    ["📅", "Calendar export", "Sync every stop to Google Calendar"],
    ["⚡", "Priority generation", "Shorter waits, faster AI"],
    ["🎨", "Exclusive moods", "Unlock hidden vibe categories"],
  ];
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(28,22,18,0.72)", zIndex:2000, display:"flex", alignItems:"flex-end", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.cream, borderRadius:"28px 28px 0 0", padding:"32px 24px 48px", width:"100%", maxWidth:480, boxShadow:"0 -8px 48px rgba(28,22,18,0.25)" }}>
        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:44, lineHeight:1, marginBottom:10 }}>✦</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:900, color:T.ink, marginBottom:4 }}>WANDR Pro</div>
          <div style={{ fontSize:13, color:T.inkFaint }}>You've used your 3 free trips. Upgrade to keep exploring.</div>
        </div>
        {/* Perks */}
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:22 }}>
          {PERKS.map(([icon, title, desc]) => (
            <div key={title} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", background:T.white, borderRadius:14, border:`1px solid ${T.dust}` }}>
              <span style={{ fontSize:18, width:24, textAlign:"center" }}>{icon}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{title}</div>
                <div style={{ fontSize:11, color:T.inkFaint }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
        {/* Pricing */}
        <div style={{ textAlign:"center", marginBottom:18 }}>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:40, fontWeight:900, color:T.ink }}>$4.99</span>
          <span style={{ fontSize:15, color:T.inkFaint }}> / month</span>
          <div style={{ fontSize:11, color:T.inkFaint, marginTop:4 }}>Cancel anytime · Billed monthly</div>
        </div>
        {/* CTA */}
        <button
          onClick={() => window.open("https://buy.stripe.com/wandr-pro", "_blank")}
          style={{ width:"100%", padding:"16px 0", borderRadius:16, background:`linear-gradient(135deg, ${T.gold}, #8a6520)`, border:"none", color:"white", fontSize:16, fontWeight:800, cursor:"pointer", marginBottom:10, boxShadow:"0 6px 24px rgba(196,154,60,0.35)" }}>
          Upgrade to Pro →
        </button>
        <button onClick={onClose} style={{ width:"100%", padding:"13px 0", borderRadius:14, background:"transparent", border:`1.5px solid ${T.dust}`, color:T.inkLight, fontSize:14, fontWeight:600, cursor:"pointer" }}>
          Maybe later
        </button>
      </div>
    </div>
  );
}

// Screens that can be safely restored on reload
const RESTORABLE = new Set(["home","explore","social","saved","profile","itinerary","trip-detail","city","mood"]);

// Read persisted nav state from sessionStorage
const readSession = () => {
  try { return JSON.parse(sessionStorage.getItem("wandr-nav") || "null"); } catch { return null; }
};
const writeSession = (state) => {
  try { sessionStorage.setItem("wandr-nav", JSON.stringify(state)); } catch {}
};

export default function App() {
  const [screen, setScreen]         = useState("loading");
  const [city, setCity]             = useState(() => readSession()?.city || "");
  const [dates, setDates]           = useState(() => readSession()?.dates || "");
  const [moodContext, setMoodContext] = useState(() => readSession()?.moodContext || "");
  const [homeBase, setHomeBase]     = useState(() => readSession()?.homeBase || "");
  const [savedTrips, setSavedTrips] = useState(() => {
    try { return JSON.parse(localStorage.getItem("wandr_trips") || "[]"); } catch(e) { return []; }
  });

  // Persist trips to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem("wandr_trips", JSON.stringify(savedTrips)); } catch(e) {}
  }, [savedTrips]);
  const [profile, setProfile]       = useState(null);
  const [openTrip, setOpenTrip]       = useState(() => readSession()?.openTrip || null);
  const [generatedDays, setGeneratedDays] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [user, setUser]             = useState(null);
  const [authGate, setAuthGate]     = useState(null); // null | "save" | "social"
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Persist nav context to sessionStorage whenever it changes
  useEffect(() => {
    if (screen === "loading" || screen === "splash" || screen === "auth" || screen === "onboarding") return;
    writeSession({ screen, city, dates, moodContext, homeBase, openTrip });
  }, [screen, city, dates, moodContext, homeBase, openTrip]);

  // Auth state listener
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (screen === "loading") setScreen("home");
    }, 3000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout);
      setUser(session?.user ?? null);

      // Deep link: ?trip=<supabase_trip_id> — open shared itinerary directly
      const sharedTripId = new URLSearchParams(window.location.search).get("trip");
      if (sharedTripId) {
        const { data: sharedTrip } = await supabase.from("trips").select("*").eq("id", sharedTripId).single();
        if (sharedTrip) {
          setOpenTrip({ ...sharedTrip, moodContext: sharedTrip.mood_context });
          setScreen("trip-detail");
          // Clean the URL without reloading
          window.history.replaceState({}, "", window.location.pathname);
          if (session?.user) { loadProfile(session.user.id); loadTrips(session.user.id); }
          return;
        }
      }

      if (session?.user) {
        loadProfile(session.user.id);
        loadTrips(session.user.id);
      } else {
        // No active session — clear any stale account trips from localStorage
        // (keeps only local-only trips that were never synced to an account)
        try {
          const local = JSON.parse(localStorage.getItem("wandr_trips") || "[]");
          const anonOnly = local.filter(t => !t.user_id);
          localStorage.setItem("wandr_trips", JSON.stringify(anonOnly));
          setSavedTrips(anonOnly);
        } catch(e) {}
        // Restore last screen or show splash for new users
        const saved = readSession();
        const seen = localStorage.getItem("wandr-seen-splash");
        if (saved?.screen && RESTORABLE.has(saved.screen)) {
          setScreen(prev => prev === "loading" ? saved.screen : prev);
        } else {
          setScreen(prev => prev === "loading" ? (seen ? "home" : "splash") : prev);
        }
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        loadTrips(session.user.id);
      } else if (event === "SIGNED_OUT") {
        // Clear all account data immediately on sign-out
        setSavedTrips([]);
        setProfile(null);
        setOpenTrip(null);
        try { localStorage.removeItem("wandr_trips"); } catch(e) {}
        try { sessionStorage.removeItem("wandr-nav"); } catch(e) {}
        setRefreshKey(k => k + 1); // force HomeScreen community feed to re-fetch without user
      }
    });
    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  const loadProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) {
      setProfile({ name: data.name, answers: data.answers, travelDna: data.travel_dna, isPro: !!data.is_pro });
      // Restore last screen if available, otherwise go home
      setScreen(prev => {
        if (!["loading","auth","onboarding"].includes(prev)) return prev;
        const saved = readSession();
        return (saved?.screen && RESTORABLE.has(saved.screen)) ? saved.screen : "home";
      });
    } else {
      setScreen("onboarding");
    }
  };

  const syncLocalTrips = async (userId) => {
    try {
      const local = JSON.parse(localStorage.getItem("wandr_trips") || "[]");
      if (!local.length) return;
      // Only sync trips that aren't already in Supabase (no user_id means local-only)
      const localOnly = local.filter(t => !t.user_id);
      if (!localOnly.length) return;
      await Promise.all(localOnly.map(t =>
        supabase.from("trips").upsert({
          user_id: userId,
          city: t.city,
          dates: t.dates,
          mood_context: t.moodContext || t.mood_context,
          days: t.days,
          emoji: t.emoji || "✦",
          saved_at: t.saved_at || new Date().toISOString(),
          is_public: true
        })
      ));
      console.log(`Synced ${localOnly.length} local trips to account`);
    } catch(e) { console.error("Sync error:", e); }
  };

  const loadTrips = async (userId) => {
    // First sync any local-only trips
    await syncLocalTrips(userId);
    const { data } = await supabase.from("trips").select("*").eq("user_id", userId).order("saved_at", { ascending: false });
    if (data) {
      // Deduplicate by city+dates — keep the most recent (already sorted newest-first)
      const seen = new Set();
      const deduped = data.filter(t => {
        const key = `${t.city}|${t.dates || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setSavedTrips(deduped.map(t => ({ ...t, days: t.days, moodContext: t.mood_context })));
    }
  };

  const handleSaveProfile = async (p) => {
    setProfile(p);
    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        name: p.name,
        answers: p.answers,
        travel_dna: p.travelDna || null
      });
    }
    // Only redirect to home during initial onboarding, stay on profile when updating
    if (screen === "onboarding") setScreen("home");
  };

  const handleSaveTrip = async (trip) => {
    // Free tier gate: max 3 saved trips for non-Pro users
    const alreadySaved = savedTrips.some(t => t.city === trip.city && t.dates === trip.dates);
    if (!profile?.isPro && !alreadySaved && savedTrips.length >= FREE_TRIP_LIMIT) {
      setShowUpgrade(true);
      return;
    }

    // Always save locally first
    const localTrip = { ...trip, saved_at: new Date().toISOString() };
    setSavedTrips(prev => [localTrip, ...prev.filter(t => !(t.city === trip.city && t.dates === trip.dates))]);

    // If logged in, also save to Supabase — update existing row if city+dates match, else insert
    if (user) {
      const { data: existing } = await supabase.from("trips")
        .select("id")
        .eq("user_id", user.id)
        .eq("city", trip.city)
        .eq("dates", trip.dates || "")
        .maybeSingle();

      const payload = {
        user_id: user.id,
        city: trip.city,
        dates: trip.dates,
        mood_context: trip.moodContext,
        days: trip.days,
        emoji: trip.emoji || "✦",
        saved_at: new Date().toISOString(),
        is_public: true
      };

      if (existing?.id) {
        await supabase.from("trips").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("trips").insert(payload);
      }
    }
    // Not logged in — trip is saved locally, will sync when they sign in
  };

  const handleStart = (c, d, mood, hotel = "") => {
    setCity(c);
    setDates(d || "");
    setHomeBase(hotel || "");
    setGeneratedDays([]); // always clear cached days when starting a new trip
    if (mood !== undefined) {
      // Fast lane — mood explicitly provided (even if empty = AI decides), skip MoodBoard
      setMoodContext(mood);
      setScreen("itinerary");
    } else {
      setScreen("city");
    }
  };
  const handleBuild = (ctx, hotel = "") => { setMoodContext(ctx); setHomeBase(hotel || ""); setGeneratedDays([]); setScreen("itinerary"); };
  const handleOpenTrip = (trip) => {
    if (!trip) { setScreen("saved"); return; }
    setOpenTrip(trip);
    setScreen("trip-detail");
  };

  // Public trip view — render outside normal app shell, no nav/auth required
  if (publicTripId) {
    return (
      <div style={{width:"100%",minHeight:"100vh",background:"#e8e0d0",display:"flex",justifyContent:"center"}}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
        <div style={{width:"100%",maxWidth:480,minHeight:"100vh",background:T.cream,position:"relative",boxShadow:"0 0 80px rgba(28,22,18,0.15)"}}>
          <PublicTrip tripId={publicTripId} supabase={supabase} onPlanOwn={()=>{ window.history.pushState({},"","/"); window.location.reload(); }}/>
        </div>
      </div>
    );
  }

  if (screen === "loading") return (
    <div style={{width:"100%",minHeight:"100vh",background:T.ink,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:48,color:T.white,animation:"pulse 1.5s ease infinite"}}>✦</div>
    </div>
  );

  return (
    <div style={{width:"100%",minHeight:"100vh",background:"#e8e0d0",display:"flex",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:480,minHeight:"100vh",background:T.cream,position:"relative",boxShadow:"0 0 80px rgba(28,22,18,0.15)"}}>
        {screen==="splash"      && <OnboardingSplash onGetStarted={()=>{ localStorage.setItem("wandr-seen-splash","1"); setScreen("auth"); }}/>}
        {screen==="auth"        && <AuthScreen supabase={supabase} onSkip={()=>setScreen("onboarding")}/>}
        {screen==="onboarding"  && <ProfileScreen profile={null} onSaveProfile={handleSaveProfile} isOnboarding={true} supabase={supabase}/>}
        {screen==="home"        && <HomeScreen onStart={handleStart} savedTrips={savedTrips} profile={profile} onOpenTrip={handleOpenTrip} supabase={supabase} user={user} refreshKey={refreshKey}/>}
        {screen==="profile"     && !user && <SignInPrompt supabase={supabase}/>}
        {screen==="profile"     && user  && <ProfileScreen profile={profile} onSaveProfile={handleSaveProfile} supabase={supabase} savedTrips={savedTrips} onOpenTrip={handleOpenTrip}/>}
        {screen==="explore"     && <ExploreScreen onSelectCity={(c)=>{setCity(c);setScreen("city");}} onStart={handleStart} supabase={supabase} user={user}/>}
        {screen==="social" && <Suspense fallback={<LazyFallback/>}><SocialScreen supabase={supabase} user={user} onRemix={(trip)=>{ setCity(trip.city); setDates(trip.dates||""); setMoodContext(trip.mood_context||""); setScreen("mood"); }} onPlanCity={(c)=>{ setCity(c); setDates(""); setScreen("city"); }}/></Suspense>}
        {screen==="city" && <CityPage city={city} dates={dates} supabase={supabase} user={user} onPlan={()=>setScreen("mood")} onSkipMood={(hotel="")=>{ setHomeBase(hotel||""); setMoodContext(""); setGeneratedDays([]); setScreen("itinerary"); }} onRemix={(trip)=>{ setMoodContext(trip.mood_context||""); setScreen("mood"); }} onBack={()=>setScreen("home")} onSetDates={(d)=>setDates(d)}/>}
        {screen==="mood"        && <MoodBoard city={city} dates={dates} onBuild={handleBuild} onBack={()=>setScreen("city")} profile={profile} remixContext={moodContext}/>}
        {screen==="itinerary"   && <Suspense fallback={<LazyFallback/>}><ItineraryView city={city} dates={dates} moodContext={moodContext} homeBase={homeBase} profile={profile} onBack={()=>{ setMoodContext(""); setGeneratedDays([]); setScreen("mood"); }} onSave={handleSaveTrip} preloadedDays={generatedDays.length > 0 ? generatedDays : undefined} onDaysGenerated={setGeneratedDays} supabase={supabase} user={user}/></Suspense>}
        {screen==="saved"       && <Suspense fallback={<LazyFallback/>}><SavedTripsScreen savedTrips={savedTrips} onOpenTrip={handleOpenTrip} onPlanNew={(c)=>{ setCity(c); setDates(""); setScreen("city"); }} onDeleteTrip={async (trip) => {
          // 1. Remove from local state immediately
          setSavedTrips(prev => prev.filter(t => !(t.city === trip.city && t.dates === trip.dates)));
          setRefreshKey(k => k + 1); // trigger home screen re-fetch
          // 2. Clear openTrip if it's the one being deleted
          if (openTrip?.city === trip.city && openTrip?.dates === trip.dates) setOpenTrip(null);
          // 3. Remove from localStorage
          const local = JSON.parse(localStorage.getItem("wandr-trips") || "[]");
          localStorage.setItem("wandr-trips", JSON.stringify(local.filter(t => !(t.city === trip.city && t.dates === trip.dates))));
          // 4. Remove from Supabase — match by city AND dates to avoid deleting other trips to same city
          if (supabase && user) {
            const { data: found } = await supabase.from("trips")
              .select("id")
              .eq("user_id", user.id)
              .eq("city", trip.city)
              .eq("dates", trip.dates || "")
              .limit(1);
            if (found?.[0]?.id) {
              await supabase.from("trips").delete().eq("id", found[0].id);
              // Delete ratings linked by trip_id
              await supabase.from("place_ratings").delete().eq("trip_id", found[0].id);
            } else {
              await supabase.from("trips").delete().eq("user_id", user.id).eq("city", trip.city);
            }
            // Also delete any ratings for this city by this user (catches null trip_id ratings)
            await supabase.from("place_ratings")
              .delete()
              .eq("user_id", user.id)
              .eq("city", trip.city.split(",")[0].trim());
          }
        }}/></Suspense>}
        {screen==="trip-detail" && openTrip && (
          <Suspense fallback={<LazyFallback/>}><ItineraryView city={openTrip.city} dates={openTrip.dates} moodContext={openTrip.moodContext||openTrip.mood_context||""} preloadedDays={openTrip.days||[]} onBack={()=>setScreen("saved")} onSave={()=>{}} supabase={supabase} user={user}/></Suspense>
        )}
        {/* Resume pill — shown when user navigated away from an active itinerary */}
        {city && moodContext && !["itinerary","loading","splash","auth","onboarding"].includes(screen) && (
          <div style={{position:"fixed",bottom:NAV_H+10,left:"50%",transform:"translateX(-50%)",zIndex:200,maxWidth:480,width:"100%",display:"flex",justifyContent:"center",pointerEvents:"none"}}>
            <button onClick={()=>setScreen("itinerary")}
              style={{pointerEvents:"auto",display:"flex",alignItems:"center",gap:8,padding:"10px 18px",borderRadius:99,background:T.ink,color:T.white,border:"none",boxShadow:"0 4px 20px rgba(28,22,18,0.35)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,whiteSpace:"nowrap"}}>
              <span style={{fontSize:15}}>✦</span>
              Resume: {city.split(",")[0]}
              <span style={{fontSize:11,opacity:0.55,fontWeight:400}}>tap to return →</span>
            </button>
          </div>
        )}
        <NavBar screen={screen} setScreen={setScreen}/>
        {authGate && <AuthGateModal supabase={supabase} reason={authGate} onClose={()=>setAuthGate(null)}/>}
        {showUpgrade && <UpgradeModal onClose={()=>setShowUpgrade(false)}/>}
      </div>
    </div>
  );
}
