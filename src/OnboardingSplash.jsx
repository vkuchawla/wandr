import { useState } from "react";
import { T, GLOBAL_CSS } from "./constants.jsx";

function OnboardingSlide({ emoji, title, subtitle }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"0 32px",gap:20}}>
      <div style={{fontSize:64,lineHeight:1}}>{emoji}</div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,color:"white",lineHeight:1.2}}>{title}</div>
      <div style={{fontSize:15,color:"rgba(255,255,255,0.55)",lineHeight:1.6,maxWidth:280}}>{subtitle}</div>
    </div>
  );
}

function OnboardingSplash({ onGetStarted }) {
  const [slide, setSlide] = useState(0);

  const slides = [
    {
      emoji: "✦",
      title: "Your AI travel companion.",
      subtitle: "Tell us where you want to go. We build a full itinerary — real places, real neighborhoods, real insider tips."
    },
    {
      emoji: "🗺",
      title: "Not a list. A journey.",
      subtitle: "Morning coffee spots, hidden lunch gems, the bar your friends don't know about. A full day, planned in seconds."
    },
    {
      emoji: "👯",
      title: "Travel with your people.",
      subtitle: "Rate places you've been. See where friends are heading. Remix their trips for your own adventure."
    }
  ];

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#1c1612 0%,#2d1f10 100%)",display:"flex",flexDirection:"column",fontFamily:"'DM Sans',sans-serif",position:"relative",overflow:"hidden"}}>
      <style>{GLOBAL_CSS}</style>

      {/* Background decorations */}
      <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 20% 30%,rgba(196,154,60,0.08) 0%,transparent 50%),radial-gradient(circle at 80% 70%,rgba(200,75,47,0.06) 0%,transparent 50%)",pointerEvents:"none"}}/>

      {/* Skip button */}
      <div style={{padding:"52px 24px 0",display:"flex",justifyContent:"flex-end"}}>
        <button onClick={onGetStarted}
          style={{background:"none",border:"none",color:"rgba(255,255,255,0.35)",fontSize:13,fontWeight:600,cursor:"pointer",padding:"4px 8px"}}>
          Skip
        </button>
      </div>

      {/* Slides */}
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",paddingBottom:40}}>
        <div style={{overflow:"hidden"}}>
          <div style={{display:"flex",transition:"transform 0.4s ease",transform:`translateX(-${slide * 100}%)`}}>
            {slides.map((s,i)=>(
              <div key={i} style={{minWidth:"100%"}}>
                <OnboardingSlide {...s}/>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dots */}
      <div style={{display:"flex",justifyContent:"center",gap:8,paddingBottom:24}}>
        {slides.map((_,i)=>(
          <div key={i} onClick={()=>setSlide(i)}
            style={{width:i===slide?24:8,height:8,borderRadius:4,background:i===slide?T.accent:"rgba(255,255,255,0.2)",transition:"all 0.3s",cursor:"pointer"}}/>
        ))}
      </div>

      {/* CTA */}
      <div style={{padding:"0 20px 48px"}}>
        {slide < slides.length - 1 ? (
          <button onClick={()=>setSlide(s=>s+1)}
            style={{width:"100%",padding:"16px 0",borderRadius:18,background:`linear-gradient(135deg,${T.accent},#9b2020)`,border:"none",color:"white",fontSize:16,fontWeight:800,cursor:"pointer",boxShadow:"0 8px 24px rgba(200,75,47,0.3)"}}>
            Next →
          </button>
        ) : (
          <button onClick={onGetStarted}
            style={{width:"100%",padding:"16px 0",borderRadius:18,background:`linear-gradient(135deg,${T.accent},#9b2020)`,border:"none",color:"white",fontSize:16,fontWeight:800,cursor:"pointer",boxShadow:"0 8px 24px rgba(200,75,47,0.3)"}}>
            Get started ✦
          </button>
        )}
        <div style={{textAlign:"center",marginTop:12,fontSize:12,color:"rgba(255,255,255,0.3)"}}>
          Free to use · No credit card needed
        </div>
      </div>
    </div>
  );
}

export { OnboardingSplash };
