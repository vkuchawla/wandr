import { useState, useEffect } from "react";

const BACKEND = "https://wandr-62i6.onrender.com";

// Keep Render backend warm — ping on load and every 14 minutes
const pingBackend = () => fetch(`${BACKEND}/health`).catch(()=>{});
pingBackend();
setInterval(pingBackend, 14 * 60 * 1000);
import { createClient } from "@supabase/supabase-js";
import { T, GLOBAL_CSS, NAV_H } from "./constants.jsx";
import { NavBar } from "./NavBar.jsx";
import { HomeScreen } from "./HomeScreen.jsx";
import { ProfileScreen } from "./ProfileScreen.jsx";
import { ExploreScreen } from "./ExploreScreen.jsx";
import { MoodBoard } from "./MoodBoard.jsx";
import { ItineraryView } from "./ItineraryView.jsx";
import { CityPage } from "./CityPage.jsx";
import { SavedTripsScreen } from "./SavedTripsScreen.jsx";
import { SocialScreen } from "./Social.jsx";
import { AuthGateModal, AuthScreen, SignInPrompt } from "./Auth.jsx";

const supabase = createClient(
  "https://ejutttjjptmkhyqxoytl.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdXR0dGpqcHRta2h5cXhveXRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NTA4MzgsImV4cCI6MjA4OTAyNjgzOH0.kac5jh8nTs_IoruG2GlNkGWpRWZsyw_XcUj0hQmcdZ4"
);

export default function App() {
  const [screen, setScreen]         = useState("loading");
  const [city, setCity]             = useState("");
  const [dates, setDates]           = useState("");
  const [moodContext, setMoodContext] = useState("");
  const [savedTrips, setSavedTrips] = useState(() => {
    try { return JSON.parse(localStorage.getItem("wandr_trips") || "[]"); } catch(e) { return []; }
  });

  // Persist trips to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem("wandr_trips", JSON.stringify(savedTrips)); } catch(e) {}
  }, [savedTrips]);
  const [profile, setProfile]       = useState(null);
  const [openTrip, setOpenTrip]     = useState(null);
  const [user, setUser]             = useState(null);
  const [authGate, setAuthGate]     = useState(null); // null | "save" | "social"

  // Auth state listener
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (screen === "loading") setScreen("home");
    }, 3000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        loadTrips(session.user.id);
      } else {
        setScreen(prev => prev === "loading" ? "home" : prev);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        loadTrips(session.user.id);
      } else {
        // Don't redirect — let them stay where they are
      }
    });
    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  const loadProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) {
      setProfile({ name: data.name, answers: data.answers, travelDna: data.travel_dna });
      // Only navigate to home if on a loading/auth screen
      setScreen(prev => ["loading","auth","onboarding"].includes(prev) ? "home" : prev);
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
    if (data) setSavedTrips(data.map(t => ({ ...t, days: t.days, moodContext: t.mood_context })));
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
    // Always save locally first
    const localTrip = { ...trip, saved_at: new Date().toISOString() };
    setSavedTrips(prev => [localTrip, ...prev.filter(t => !(t.city === trip.city && t.dates === trip.dates))]);

    // If logged in, also save to Supabase
    if (user) {
      await supabase.from("trips").upsert({
        user_id: user.id,
        city: trip.city,
        dates: trip.dates,
        mood_context: trip.moodContext,
        days: trip.days,
        emoji: trip.emoji || "✦",
        saved_at: new Date().toISOString(),
        is_public: true
      });
    }
    // Not logged in — trip is saved locally, will sync when they sign in
  };

  const handleStart = (c, d) => { setCity(c); setDates(d); setScreen("city"); };
  const handleBuild = (ctx) => { setMoodContext(ctx); setScreen("itinerary"); };
  const handleOpenTrip = (trip) => {
    if (!trip) { setScreen("saved"); return; }
    setOpenTrip(trip);
    setScreen("trip-detail");
  };

  if (screen === "loading") return (
    <div style={{width:"100%",minHeight:"100vh",background:T.ink,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:48,color:T.white,animation:"pulse 1.5s ease infinite"}}>✦</div>
    </div>
  );

  return (
    <div style={{width:"100%",minHeight:"100vh",background:"#e8e0d0",display:"flex",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:480,minHeight:"100vh",background:T.cream,position:"relative",boxShadow:"0 0 80px rgba(28,22,18,0.15)"}}>
        {screen==="auth"        && <AuthScreen supabase={supabase} onSkip={()=>setScreen("onboarding")}/>}
        {screen==="onboarding"  && <ProfileScreen profile={null} onSaveProfile={handleSaveProfile} isOnboarding={true} supabase={supabase}/>}
        {screen==="home"        && <HomeScreen onStart={handleStart} savedTrips={savedTrips} profile={profile} onOpenTrip={handleOpenTrip} supabase={supabase} user={user}/>}
        {screen==="profile"     && !user && <SignInPrompt supabase={supabase}/>}
        {screen==="profile"     && user  && <ProfileScreen profile={profile} onSaveProfile={handleSaveProfile} supabase={supabase} savedTrips={savedTrips} onOpenTrip={handleOpenTrip}/>}
        {screen==="explore"     && <ExploreScreen onSelectCity={(c)=>{setCity(c);setScreen("city");}} supabase={supabase}/>}
        {screen==="social" && <SocialScreen supabase={supabase} user={user} onRemix={(trip)=>{ setCity(trip.city); setDates(trip.dates||""); setMoodContext(trip.mood_context||""); setScreen("mood"); }} onPlanCity={(c)=>{ setCity(c); setDates(""); setScreen("city"); }}/>}
        {screen==="city" && <CityPage city={city} dates={dates} supabase={supabase} user={user} onPlan={()=>setScreen("mood")} onRemix={(trip)=>{ setMoodContext(trip.mood_context||""); setScreen("mood"); }} onBack={()=>setScreen("home")}/>}
        {screen==="mood"        && <MoodBoard city={city} dates={dates} onBuild={handleBuild} onBack={()=>setScreen("city")} profile={profile} remixContext={moodContext}/>}
        {screen==="itinerary"   && <ItineraryView city={city} dates={dates} moodContext={moodContext} profile={profile} onBack={()=>setScreen("mood")} onSave={handleSaveTrip} supabase={supabase} user={user}/>}
        {screen==="saved"       && <SavedTripsScreen savedTrips={savedTrips} onOpenTrip={handleOpenTrip} onPlanNew={()=>setScreen("home")} onDeleteTrip={async (trip) => {
          // Remove from state
          setSavedTrips(prev => prev.filter(t => !(t.city === trip.city && t.dates === trip.dates)));
          // Remove from localStorage
          const local = JSON.parse(localStorage.getItem("wandr-trips") || "[]");
          localStorage.setItem("wandr-trips", JSON.stringify(local.filter(t => !(t.city === trip.city && t.dates === trip.dates))));
          // Remove from Supabase
          if (supabase && user) {
            await supabase.from("trips").delete().eq("user_id", user.id).eq("city", trip.city);
          }
        }}/>}
        {screen==="trip-detail" && openTrip && (
          <ItineraryView city={openTrip.city} dates={openTrip.dates} moodContext={openTrip.moodContext||openTrip.mood_context||""} preloadedDays={openTrip.days||[]} onBack={()=>setScreen("saved")} onSave={()=>{}} supabase={supabase} user={user}/>
        )}
        <NavBar screen={screen} setScreen={setScreen}/>
        {authGate && <AuthGateModal supabase={supabase} reason={authGate} onClose={()=>setAuthGate(null)}/>}
      </div>
    </div>
  );
}
