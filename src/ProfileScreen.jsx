import { useState } from "react";
import { GLOBAL_CSS, NAV_H, T } from "./constants.jsx";

// Travel DNA types
const TRAVEL_DNAS = {
  slow_savourer: { label:"The Slow Savourer", emoji:"☕", color:"#a0522d", bg:"linear-gradient(135deg,#2d1a0e,#4a2810)", description:"You believe the best trips aren't measured in miles but in moments. A perfect morning is a two-hour breakfast watching the city wake up.", traits:["Unhurried","Atmosphere seeker","Late riser","Moment collector"] },
  hyper_planner:  { label:"The Hyper-Planner",  emoji:"📋", color:"#1a3a6b", bg:"linear-gradient(135deg,#0e1a2d,#1a2d4a)", description:"You've read every review, mapped every route. Spontaneity makes you nervous — and that's okay, because your trips are genuinely incredible.", traits:["Meticulous","Research-driven","Maximizer","Detail obsessed"] },
  food_explorer:  { label:"The Food-First Explorer", emoji:"🍷", color:"#8b1a2f", bg:"linear-gradient(135deg,#2d0e1a,#4a1a28)", description:"Every trip you've taken has been secretly organized around where you'll eat. Food is your love language.", traits:["Culinary obsessed","Reservation hunter","Market wanderer","Never skips dessert"] },
  off_path:       { label:"The Off-Path Wanderer", emoji:"🔮", color:"#5a2d82", bg:"linear-gradient(135deg,#1a0e2d,#2d1a4a)", description:"Tourist traps make you cringe. You'd rather spend an afternoon in a neighborhood nobody's heard of than see one more famous landmark.", traits:["Crowd avoider","Hidden gem hunter","Local seeker","Anti-tourist"] },
  free_spirit:    { label:"The Free Spirit",    emoji:"🎲", color:"#255c3f", bg:"linear-gradient(135deg,#0e2d1a,#1a4a2d)", description:"You booked this trip three days ago and still don't have a hotel for Tuesday. Your best memories were completely unplanned.", traits:["Spontaneous","Adaptable","Serendipity believer","Goes with the flow"] },
  balanced:       { label:"The Balanced Traveller", emoji:"⚖", color:"#4a3a10", bg:"linear-gradient(135deg,#1a1a0e,#2d2a1a)", description:"You've figured out how to have a plan without being enslaved by it. Research, room for surprises, see everything worth seeing.", traits:["Thoughtful","Flexible","Experienced","Best of both worlds"] },
};

// Derive DNA from saved trips (vibes used most)
const getDNAFromTrips = (savedTrips = []) => {
  if (!savedTrips?.length) return null;
  const allVibes = savedTrips.flatMap(t => {
    const ctx = t.moodContext || t.mood_context || "";
    return ctx.split("\n").flatMap(l => l.split(":")[1]?.split(",").map(v => v.trim().toLowerCase()) || []);
  }).filter(Boolean);
  if (!allVibes.length) return null;

  const counts = allVibes.reduce((acc, v) => { acc[v] = (acc[v]||0)+1; return acc; }, {});
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);

  if (top.some(v => v.includes("slow morning") || v.includes("chill") || v.includes("spa"))) return TRAVEL_DNAS.slow_savourer;
  if (top.some(v => v.includes("street food") || v.includes("splurge dinner") || v.includes("brunch") || v.includes("coffee"))) return TRAVEL_DNAS.food_explorer;
  if (top.some(v => v.includes("local") || v.includes("hidden") || v.includes("weird"))) return TRAVEL_DNAS.off_path;
  if (top.some(v => v.includes("nightlife") || v.includes("adventur"))) return TRAVEL_DNAS.free_spirit;
  if (top.some(v => v.includes("cultural") || v.includes("art") || v.includes("museum"))) return TRAVEL_DNAS.balanced;
  return TRAVEL_DNAS.balanced;
};

// 3 quick onboarding questions only
const QUICK_QUESTIONS = [
  {
    id:"pace", question:"How do you like to travel?",
    options:[
      { v:"slow", e:"🚶", l:"Slow & savour", sub:"Fewer stops, deeper experience" },
      { v:"balanced", e:"⚡", l:"Mix it up", sub:"A bit of everything" },
      { v:"fast", e:"🚀", l:"Pack it in", sub:"Maximize every hour" },
    ]
  },
  {
    id:"food", question:"What's your relationship with food?",
    options:[
      { v:"everything", e:"🍜", l:"Food is the trip", sub:"I plan restaurants before hotels" },
      { v:"local", e:"🥘", l:"Whatever's local", sub:"I eat where the locals eat" },
      { v:"fuel", e:"⚡", l:"Food is fuel", sub:"Quick and easy, let's keep moving" },
    ]
  },
  {
    id:"vibe", question:"What does a perfect trip feel like?",
    options:[
      { v:"immerse", e:"🌍", l:"Living like a local", sub:"Off the beaten path" },
      { v:"discover", e:"✨", l:"Discovering everything", sub:"Mix of classics and hidden gems" },
      { v:"relax", e:"🌊", l:"Totally unwinding", sub:"No agenda, pure rest" },
    ]
  },
];

function ProfileScreen({ profile, onSaveProfile, isOnboarding = false, supabase, savedTrips = [], onOpenTrip }) {
  const [step, setStep] = useState(profile ? "done" : "name");
  const [name, setName] = useState(profile?.name || "");
  const [answers, setAnswers] = useState(profile?.answers || {});
  const [qIdx, setQIdx] = useState(0);
  const [editingNameOnly, setEditingNameOnly] = useState(false);

  const answer = (qId, val) => {
    const next = { ...answers, [qId]: val };
    setAnswers(next);
    if (qIdx < QUICK_QUESTIONS.length - 1) {
      setQIdx(q => q + 1);
    } else {
      onSaveProfile({ name: profile?.name || name || "Traveller", answers: next });
      setStep("done");
    }
  };

  // ── NAME-ONLY EDIT ─────────────────────────────
  if (step === "edit-name") return (
    <div style={{minHeight:"100vh",background:T.cream,fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",padding:`64px 24px ${NAV_H+28}px`}}>
      <style>{GLOBAL_CSS}</style>
      <button onClick={()=>setStep("done")} style={{background:"none",border:"none",color:T.inkFaint,fontSize:22,cursor:"pointer",padding:0,marginBottom:24,alignSelf:"flex-start"}}>←</button>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:700,color:T.ink,marginBottom:8}}>Edit your name</h1>
      <p style={{fontSize:14,color:T.inkFaint,marginBottom:28}}>This is how you appear to friends.</p>
      <input value={name} onChange={e=>setName(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&name.trim()&&(onSaveProfile({name:name.trim(),answers:profile?.answers||answers}),setStep("done"))}
        placeholder="Your name…"
        style={{width:"100%",padding:"15px 18px",borderRadius:14,border:`1.5px solid ${name?T.accent:T.dust}`,background:T.white,color:T.ink,fontSize:16,fontWeight:600,outline:"none",marginBottom:16,transition:"border-color 0.2s"}}/>
      <button onClick={()=>{if(name.trim()){onSaveProfile({name:name.trim(),answers:profile?.answers||answers});setStep("done");}}}
        disabled={!name.trim()}
        style={{width:"100%",padding:15,borderRadius:16,background:name.trim()?T.ink:T.dust,border:"none",color:"white",fontSize:15,fontWeight:800,cursor:name.trim()?"pointer":"default"}}>
        Save name
      </button>
    </div>
  );

  // ── NAME STEP ──────────────────────────────────
  if (step === "name") return (
    <div style={{minHeight:"100vh",background:T.cream,fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",padding:`64px 24px ${NAV_H+28}px`}}>
      <style>{GLOBAL_CSS}</style>
      {!isOnboarding && <button onClick={()=>setStep("done")} style={{background:"none",border:"none",color:T.inkFaint,fontSize:22,cursor:"pointer",padding:0,marginBottom:24,alignSelf:"flex-start"}}>←</button>}
      <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase",color:T.gold,marginBottom:14}}>✦ WANDR</div>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:34,fontWeight:700,color:T.ink,lineHeight:1.2,marginBottom:8}}>
        {isOnboarding ? "Welcome." : "Let's update your profile."}
      </h1>
      <p style={{fontSize:14,color:T.inkFaint,lineHeight:1.7,marginBottom:32}}>
        {isOnboarding ? "3 quick questions and we'll personalise every itinerary to your style." : "Answer 3 questions to refresh your travel style."}
      </p>
      <div style={{fontSize:13,fontWeight:600,color:T.inkLight,marginBottom:10}}>What should we call you?</div>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name…"
        onKeyDown={e=>e.key==="Enter"&&name.trim()&&setStep("quiz")}
        style={{width:"100%",padding:"15px 18px",borderRadius:14,border:`1.5px solid ${name?T.accent:T.dust}`,background:T.white,color:T.ink,fontSize:16,fontWeight:600,outline:"none",marginBottom:20,transition:"border-color 0.2s"}}/>
      <button onClick={()=>name.trim()&&setStep("quiz")} disabled={!name.trim()}
        style={{width:"100%",padding:16,borderRadius:16,background:name.trim()?T.ink:T.dust,border:"none",color:name.trim()?T.white:T.inkFaint,fontSize:15,fontWeight:800,cursor:name.trim()?"pointer":"default",marginBottom:12}}>
        Next →
      </button>
      {isOnboarding && (
        <button onClick={()=>onSaveProfile({name:name.trim()||"Traveller",answers:{}})}
          style={{width:"100%",padding:13,borderRadius:16,background:"none",border:`1.5px solid ${T.dust}`,color:T.inkFaint,fontSize:14,cursor:"pointer"}}>
          Skip for now
        </button>
      )}
    </div>
  );

  // ── QUIZ STEP (3 questions) ────────────────────
  if (step === "quiz") {
    const q = QUICK_QUESTIONS[qIdx];
    const selected = answers[q.id];
    const isLast = qIdx === QUICK_QUESTIONS.length - 1;

    const goNext = () => {
      if (isLast) {
        onSaveProfile({ name: profile?.name || name || "Traveller", answers });
        setStep("done");
      } else {
        setQIdx(i => i + 1);
      }
    };

    const goBack = () => {
      if (qIdx > 0) setQIdx(i => i - 1);
      else if (isOnboarding) setStep("name");
      else setStep("done");
    };

    return (
      <div style={{minHeight:"100vh",background:"#f4f0e8",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column"}}>
        <style>{GLOBAL_CSS}</style>

        {/* Top bar — ← progress → */}
        <div style={{padding:"52px 24px 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <button onClick={goBack}
            style={{background:"none",border:"none",color:T.inkFaint,fontSize:22,cursor:"pointer",padding:0,width:40,textAlign:"left"}}>←</button>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {QUICK_QUESTIONS.map((_,i)=>(
              <div key={i} style={{width:i===qIdx?24:8,height:8,borderRadius:4,background:i<qIdx?T.accent:i===qIdx?T.ink:T.dust,transition:"all 0.3s"}}/>
            ))}
          </div>
          <button onClick={goNext}
            style={{background:"none",border:"none",color:selected?T.ink:T.dust,fontSize:22,cursor:selected?"pointer":"default",padding:0,width:40,textAlign:"right",fontWeight:700,transition:"color 0.2s",visibility:isLast?"hidden":"visible"}}>→</button>
        </div>

        {/* Question */}
        <div style={{padding:"32px 24px",paddingBottom:NAV_H+24,flex:1,display:"flex",flexDirection:"column"}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",color:T.gold,marginBottom:10}}>
            {qIdx+1} of {QUICK_QUESTIONS.length}
          </div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:700,color:T.ink,lineHeight:1.2,marginBottom:28}}>
            {q.question}
          </h2>
          <div style={{display:"flex",flexDirection:"column",gap:12,flex:1}}>
            {q.options.map((opt,i)=>{
              const isSel = selected === opt.v;
              return (
                <button key={opt.v}
                  onClick={()=>setAnswers(prev=>({...prev,[q.id]:opt.v}))}
                  style={{padding:"20px 22px",borderRadius:20,border:`2.5px solid ${isSel?T.accent:"rgba(28,22,18,0.08)"}`,background:isSel?T.ink:T.white,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:16,boxShadow:isSel?"0 8px 24px rgba(28,22,18,0.15)":"0 2px 8px rgba(28,22,18,0.04)",transition:"all 0.2s",animation:`fadeUp 0.3s ease ${i*0.06}s both`}}>
                  <div style={{width:52,height:52,borderRadius:16,background:isSel?"rgba(255,255,255,0.12)":"#f4ede4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>
                    {opt.e}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:700,color:isSel?T.white:T.ink,lineHeight:1.2,marginBottom:2}}>{opt.l}</div>
                    {opt.sub && <div style={{fontSize:12,color:isSel?"rgba(255,255,255,0.5)":T.inkFaint}}>{opt.sub}</div>}
                  </div>
                  <div style={{width:24,height:24,borderRadius:"50%",background:isSel?T.accent:"transparent",border:`2px solid ${isSel?T.accent:T.dust}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s"}}>
                    {isSel && <span style={{color:"white",fontSize:13,fontWeight:700}}>✓</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Save button on last question only */}
          {isLast && (
            <button onClick={goNext} disabled={!selected}
              style={{width:"100%",padding:15,borderRadius:16,background:selected?T.ink:T.dust,border:"none",color:"white",fontSize:15,fontWeight:800,cursor:selected?"pointer":"default",marginTop:16,transition:"background 0.2s",boxShadow:selected?"0 6px 20px rgba(28,22,18,0.15)":"none"}}>
              Save preferences ✦
            </button>
          )}
        </div>
      </div>
    );
  }


  // ── DONE / PROFILE VIEW ────────────────────────
  // Derive DNA from actual trip behavior, fall back to preferences
  const tripDNA = getDNAFromTrips(savedTrips);
  const prefDNA = (() => {
    const a = profile?.answers || answers;
    if (!a || Object.keys(a).length === 0) return null;
    if (a.food === "everything") return TRAVEL_DNAS.food_explorer;
    if (a.vibe === "immerse") return TRAVEL_DNAS.off_path;
    if (a.vibe === "relax" && a.pace === "slow") return TRAVEL_DNAS.slow_savourer;
    if (a.vibe === "relax") return TRAVEL_DNAS.balanced;
    if (a.pace === "fast") return TRAVEL_DNAS.hyper_planner;
    if (a.pace === "slow") return TRAVEL_DNAS.slow_savourer;
    return TRAVEL_DNAS.balanced;
  })();

  const dnaData = tripDNA || prefDNA || TRAVEL_DNAS.balanced;
  const tripCount = savedTrips?.length || 0;
  const cityCount = new Set((savedTrips||[]).map(t => t.city?.split(",")[0].trim())).size;
  const dayCount = (savedTrips||[]).reduce((sum,t) => sum + (Array.isArray(t.days)?t.days.length:0), 0);

  return (
    <div style={{minHeight:"100vh",background:T.cream,fontFamily:"'DM Sans',sans-serif",paddingBottom:NAV_H+20}}>
      <style>{GLOBAL_CSS}</style>

      {/* Hero */}
      <div style={{background:`linear-gradient(160deg,#1c1612 0%,#2d1f10 100%)`,padding:"52px 20px 24px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 20% 50%,rgba(196,154,60,0.08) 0%,transparent 60%)",pointerEvents:"none"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20}}>
            <div style={{width:68,height:68,borderRadius:"50%",background:`linear-gradient(135deg,${T.accent},#9b2020)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:800,color:"white",flexShrink:0,border:"3px solid rgba(255,255,255,0.1)"}}>
              {(profile?.name||name)?.[0]?.toUpperCase()||"?"}
            </div>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"white",lineHeight:1.1,marginBottom:6}}>{profile?.name||name}</div>
              <div style={{display:"inline-flex",alignItems:"center",gap:5,background:"rgba(255,255,255,0.08)",borderRadius:20,padding:"3px 10px",border:"1px solid rgba(255,255,255,0.1)"}}>
                <span style={{fontSize:12}}>{dnaData.emoji}</span>
                <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.7)"}}>{dnaData.label}</span>
              </div>
            </div>
          </div>
          {/* Stats */}
          <div style={{display:"flex",background:"rgba(255,255,255,0.05)",borderRadius:14,overflow:"hidden",border:"1px solid rgba(255,255,255,0.08)"}}>
            {[{val:tripCount,label:"Trips"},{val:cityCount,label:"Cities"},{val:dayCount,label:"Days planned"}].map((s,i)=>(
              <div key={i} style={{flex:1,padding:"12px 8px",textAlign:"center",borderLeft:i>0?"1px solid rgba(255,255,255,0.08)":"none"}}>
                <div style={{fontSize:22,fontWeight:800,color:"white",lineHeight:1}}>{s.val}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:3,textTransform:"uppercase",letterSpacing:"0.08em"}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{padding:"16px 20px 0"}}>

        {/* DNA card */}
        <div style={{borderRadius:18,overflow:"hidden",marginBottom:14,border:`1px solid ${T.dust}`}}>
          <div style={{background:dnaData.bg,padding:"18px 18px 14px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-10,right:-10,fontSize:80,opacity:0.07}}>{dnaData.emoji}</div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(255,255,255,0.4)",marginBottom:5}}>
              Your travel DNA {tripDNA ? "· Based on your trips" : ""}
            </div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:"white",marginBottom:6}}>{dnaData.label}</div>
            <p style={{fontSize:12,color:"rgba(255,255,255,0.6)",lineHeight:1.6,margin:0}}>{dnaData.description}</p>
          </div>
          <div style={{background:T.white,padding:"10px 16px",display:"flex",gap:6,flexWrap:"wrap"}}>
            {(dnaData.traits||[]).map(t=>(
              <span key={t} style={{padding:"3px 9px",borderRadius:20,background:T.paper,fontSize:11,fontWeight:600,color:T.inkLight,border:`1px solid ${T.dust}`}}>{t}</span>
            ))}
          </div>
        </div>

        {/* Recent trips */}
        {tripCount > 0 && (
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.inkFaint}}>Your trips</div>
              {tripCount > 3 && <button onClick={()=>onOpenTrip&&onOpenTrip(null)} style={{background:"none",border:"none",fontSize:12,color:T.accent,fontWeight:700,cursor:"pointer",padding:0}}>See all →</button>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {(savedTrips||[]).slice(0,3).map((trip,i)=>(
                <div key={i} onClick={()=>onOpenTrip&&onOpenTrip(trip)}
                  style={{background:T.white,borderRadius:14,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",border:`1px solid ${T.dust}`}}>
                  <div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${T.ink},#2d1f10)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{trip.emoji||"✦"}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{trip.city?.split(",")[0]}</div>
                    <div style={{fontSize:11,color:T.inkFaint}}>{trip.dates||"No dates"} · {Array.isArray(trip.days)?trip.days.length:0}d</div>
                  </div>
                  <div style={{color:T.dust}}>›</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {!isOnboarding && (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button onClick={()=>{setName(profile?.name||"");setStep("edit-name");}}
              style={{width:"100%",padding:13,borderRadius:14,background:T.white,border:`1.5px solid ${T.dust}`,color:T.inkLight,fontSize:13,fontWeight:600,cursor:"pointer"}}>
              ✏ Edit name
            </button>
            <button onClick={()=>{setAnswers(profile?.answers||{});setQIdx(0);setStep("quiz");}}
              style={{width:"100%",padding:13,borderRadius:14,background:T.white,border:`1.5px solid ${T.dust}`,color:T.inkLight,fontSize:13,fontWeight:600,cursor:"pointer"}}>
              🔄 Update travel preferences
            </button>
            {supabase && (
              <button onClick={async()=>{await supabase.auth.signOut();window.location.reload();}}
                style={{width:"100%",padding:13,borderRadius:14,background:"#fef2f2",border:"1.5px solid #fcc",color:"#c84b2f",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                Sign out
              </button>
            )}
          </div>
        )}
        {isOnboarding && (
          <button onClick={()=>onSaveProfile({name:name.trim()||"Traveller",answers})}
            style={{width:"100%",padding:16,borderRadius:16,background:T.ink,border:"none",color:T.white,fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:"0 6px 20px rgba(28,22,18,0.15)"}}>
            Start planning ✦
          </button>
        )}
      </div>
    </div>
  );
}

export { ProfileScreen };
