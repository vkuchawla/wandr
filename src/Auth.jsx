import { useState } from "react";
import { T, GLOBAL_CSS, NAV_H } from "./constants.jsx";
function AuthGateModal({ supabase, reason, onClose }) {
  const [email, setEmail] = useState("");
  const [sent, setSent]   = useState(false);
  const [loading, setLoading] = useState(false);

  const sendLink = async () => {
    if (!email.trim()) return;
    setLoading(true);
    await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin }
    });
    setSent(true);
    setLoading(false);
  };

  const reasons = {
    save:    { emoji:"♥", title:"Save this trip", desc:"Create a free account to save your itineraries and access them anywhere." },
    social:  { emoji:"👥", title:"See where friends wander", desc:"Sign in to follow friends, see their trips, and remix their mood boards." },
    default: { emoji:"✦", title:"Join Wandr", desc:"Create a free account to save trips and connect with friends." }
  };
  const r = reasons[reason] || reasons.default;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(28,22,18,0.75)",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn 0.2s ease"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.white,borderRadius:"28px 28px 0 0",width:"100%",maxWidth:480,padding:"28px 24px 48px",animation:"slideUp 0.3s ease",fontFamily:"'DM Sans',sans-serif"}}>
        <div style={{width:36,height:4,borderRadius:2,background:T.dust,margin:"0 auto 24px"}}/>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:40,marginBottom:12}}>{r.emoji}</div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:T.ink,marginBottom:8}}>{r.title}</h2>
          <p style={{fontSize:14,color:T.inkFaint,lineHeight:1.6}}>{r.desc}</p>
        </div>
        {!sent ? (
          <>
            <input value={email} onChange={e=>setEmail(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&sendLink()}
              placeholder="your@email.com" type="email"
              style={{width:"100%",padding:"14px 16px",borderRadius:14,border:`1.5px solid ${T.dust}`,background:T.cream,color:T.ink,fontSize:15,outline:"none",marginBottom:12,textAlign:"center"}}/>
            <button onClick={sendLink} disabled={!email.trim()||loading}
              style={{width:"100%",padding:15,borderRadius:16,background:email.trim()?T.ink:T.dust,border:"none",color:T.white,fontSize:15,fontWeight:800,cursor:email.trim()?"pointer":"default",marginBottom:10}}>
              {loading ? "Sending…" : "Send magic link →"}
            </button>
            <button onClick={onClose} style={{width:"100%",padding:12,borderRadius:14,background:"none",border:"none",color:T.inkFaint,fontSize:13,cursor:"pointer"}}>
              Maybe later
            </button>
          </>
        ) : (
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:12}}>📬</div>
            <p style={{fontSize:14,color:T.inkLight,lineHeight:1.6}}>Check your email for a magic link to sign in.</p>
            <button onClick={onClose} style={{marginTop:20,padding:"12px 28px",borderRadius:14,background:T.ink,border:"none",color:T.white,fontSize:14,fontWeight:700,cursor:"pointer"}}>Got it</button>
          </div>
        )}
      </div>
    </div>
  );
}

function AuthScreen({ supabase, onSkip }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMagicLink = async () => {
    if (!email.trim()) return;
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) { setError(error.message); setLoading(false); }
    else { setSent(true); setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:T.ink,fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 28px",position:"relative",overflow:"hidden"}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{position:"absolute",top:-40,right:-40,fontSize:180,opacity:0.03,fontFamily:"serif"}}>✦</div>

      <div style={{width:"100%",maxWidth:340,textAlign:"center"}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:48,color:T.white,marginBottom:8,animation:"pulse 3s ease infinite"}}>✦</div>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(196,154,60,0.7)",marginBottom:16}}>WANDR</div>

        {!sent ? (
          <>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:700,color:T.white,lineHeight:1.2,marginBottom:12}}>Save your trips.<br/>Find your people.</h1>
            <p style={{fontSize:14,color:"rgba(255,255,255,0.45)",lineHeight:1.7,marginBottom:36}}>Sign in to save itineraries, follow friends, and see where they've been.</p>

            <input value={email} onChange={e=>setEmail(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&sendMagicLink()}
              placeholder="your@email.com"
              type="email"
              style={{width:"100%",padding:"15px 18px",borderRadius:14,border:"1.5px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.06)",color:T.white,fontSize:16,outline:"none",marginBottom:12,textAlign:"center"}}/>

            {error && <div style={{fontSize:12,color:"#f87",marginBottom:12}}>{error}</div>}

            <button onClick={sendMagicLink} disabled={!email.trim()||loading}
              style={{width:"100%",padding:16,borderRadius:16,background:email.trim()?T.accent:T.inkLight,border:"none",color:T.white,fontSize:15,fontWeight:800,cursor:email.trim()?"pointer":"default",marginBottom:16}}>
              {loading ? "Sending…" : "Send magic link →"}
            </button>

            <button onClick={onSkip}
              style={{background:"none",border:"none",color:"rgba(255,255,255,0.3)",fontSize:13,cursor:"pointer",textDecoration:"underline"}}>
              Skip for now
            </button>
          </>
        ) : (
          <>
            <div style={{fontSize:48,marginBottom:16}}>📬</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,color:T.white,marginBottom:12}}>Check your email</h2>
            <p style={{fontSize:14,color:"rgba(255,255,255,0.5)",lineHeight:1.7,marginBottom:28}}>We sent a magic link to <strong style={{color:T.white}}>{email}</strong>. Click it to sign in.</p>
            <button onClick={onSkip}
              style={{background:"none",border:"none",color:"rgba(255,255,255,0.3)",fontSize:13,cursor:"pointer",textDecoration:"underline"}}>
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export { AuthGateModal, AuthScreen };

// ─────────────────────────────────────────────
// SIGN IN PROMPT — shown on Profile tab when logged out
// ─────────────────────────────────────────────
function SignInPrompt({ supabase }) {
  const [email, setEmail] = useState("");
  const [sent, setSent]   = useState(false);
  const [loading, setLoading] = useState(false);

  const sendLink = async () => {
    if (!email.trim()) return;
    setLoading(true);
    await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin }
    });
    setSent(true);
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:T.cream,fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",paddingBottom:NAV_H}}>
      <style>{GLOBAL_CSS}</style>

      {/* Hero */}
      <div style={{background:`linear-gradient(160deg,#1c1612 0%,#2d1f10 100%)`,padding:"72px 24px 40px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 30% 50%,rgba(196,154,60,0.08) 0%,transparent 60%)",pointerEvents:"none"}}/>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(196,154,60,0.7)",marginBottom:14}}>✦ WANDR</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:34,fontWeight:900,color:"white",lineHeight:1.1,marginBottom:10}}>
          Travel with taste.
        </h1>
        <p style={{fontSize:13,color:"rgba(255,255,255,0.4)",lineHeight:1.6,maxWidth:260,margin:"0 auto"}}>
          Save trips, follow friends, build your travel identity.
        </p>
      </div>

      {/* Benefits — no icons, just clean text rows */}
      <div style={{padding:"24px 24px 0"}}>
        {[
          { label:"Save & access your trips anywhere", sub:"No more lost itineraries" },
          { label:"See where friends are wandering", sub:"Follow and remix their plans" },
          { label:"Build your travel DNA over time", sub:"Wandr learns your taste" },
        ].map((b, i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:i<2?`1px solid ${T.dust}`:"none"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:T.gold,flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:T.ink,lineHeight:1.3}}>{b.label}</div>
              <div style={{fontSize:11,color:T.inkFaint,marginTop:2}}>{b.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Sign in form */}
      <div style={{padding:"24px 24px",marginTop:"auto"}}>
        {!sent ? (
          <>
            {/* Magic link badge */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:14}}>
              <div style={{height:1,flex:1,background:T.dust}}/>
              <span style={{fontSize:11,fontWeight:700,color:T.inkFaint,letterSpacing:"0.08em",textTransform:"uppercase"}}>No password needed</span>
              <div style={{height:1,flex:1,background:T.dust}}/>
            </div>
            <input
              value={email}
              onChange={e=>setEmail(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&sendLink()}
              placeholder="your@email.com"
              type="email"
              style={{width:"100%",padding:"14px 16px",borderRadius:14,border:`1.5px solid ${email?T.accent:T.dust}`,background:T.white,color:T.ink,fontSize:15,outline:"none",marginBottom:10,textAlign:"center",transition:"border-color 0.2s"}}/>
            <button
              onClick={sendLink}
              disabled={!email.trim()||loading}
              style={{width:"100%",padding:15,borderRadius:16,background:email.trim()?`linear-gradient(135deg,${T.accent},#9b2020)`:T.dust,border:"none",color:"white",fontSize:15,fontWeight:800,cursor:email.trim()?"pointer":"default",boxShadow:email.trim()?"0 6px 20px rgba(200,75,47,0.3)":"none",transition:"all 0.2s"}}>
              {loading ? "Sending…" : "Send magic link →"}
            </button>
            <div style={{fontSize:11,color:T.inkFaint,textAlign:"center",marginTop:10}}>
              We'll email you a one-tap sign-in link.
            </div>
          </>
        ) : (
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:48,marginBottom:16}}>📬</div>
            <div style={{fontSize:17,fontWeight:700,color:T.ink,marginBottom:8}}>Check your email</div>
            <div style={{fontSize:13,color:T.inkFaint,lineHeight:1.7}}>
              We sent a link to <strong>{email}</strong>.<br/>Tap it to sign in instantly.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { SignInPrompt };