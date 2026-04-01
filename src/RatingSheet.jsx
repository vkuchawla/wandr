import { useState, useRef } from "react";
import { T, CITY_PHOTOS } from "./constants.jsx";

const REACTIONS = [
  { id:"obsessed", emoji:"🔥", label:"Obsessed",       startScore:9 },
  { id:"loved",    emoji:"😍", label:"Loved it",       startScore:7 },
  { id:"worth",    emoji:"👍", label:"Worth it",       startScore:5 },
  { id:"skip",     emoji:"😑", label:"Skip next time", startScore:2 },
];

const SCORE_LABELS = [,"Avoid","Regret it","Disappointing","Underwhelming",
  "It was alright","Worth a visit","Solid pick","Really loved it","Exceptional","One of a kind"];

function scoreColor(s) {
  if (s >= 9) return "#22c55e";
  if (s >= 7) return "#84cc16";
  if (s >= 5) return "#eab308";
  if (s >= 3) return "#f97316";
  return "#ef4444";
}

export function RatingSheet({ slot, dayIdx, slotIdx, ratings, daysData, city, user, onSubmit, onClose }) {
  const [phase, setPhase]             = useState("reaction"); // "reaction" | "score" | "result"
  const [selectedReaction, setReaction] = useState(null);
  const [score, setScore]             = useState(7);
  const [note, setNote]               = useState("");
  const [noteOpen, setNoteOpen]       = useState(false);
  const trackRef  = useRef(null);
  const dragging  = useRef(false);

  const photo = slot?.photo || CITY_PHOTOS[city?.split(",")[0]?.trim()];
  const color = scoreColor(score);
  const thumbPct = ((score - 1) / 9) * 100;

  // ── Drag slider ──
  const scoreFromX = (clientX) => {
    const { left, width } = trackRef.current.getBoundingClientRect();
    return Math.max(1, Math.min(10, Math.round(((clientX - left) / width) * 9 + 1)));
  };
  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    setScore(scoreFromX(e.clientX));
  };
  const onPointerMove = (e) => { if (dragging.current) setScore(scoreFromX(e.clientX)); };
  const onPointerUp   = ()  => { dragging.current = false; };

  // ── Reactions ──
  const pickReaction = (r) => {
    setReaction(r);
    setScore(r.startScore);
    setPhase("score");
  };

  // ── Submit ──
  const submit = () => {
    onSubmit(dayIdx, slotIdx, score, note);
    setPhase("result");
  };

  // ── Trip rank context ──
  const daySlots = daysData[dayIdx]?.slots || [];
  const scores = daySlots.map((_, si) => {
    const k = `${dayIdx}-${si}`;
    return si === slotIdx ? score : (ratings[k] || 0);
  }).filter(s => s > 0).sort((a, b) => b - a);
  const rank       = scores.indexOf(score) + 1;
  const totalRated = scores.length;
  const isTopStop  = rank === 1 && totalRated > 1;

  return (
    <div
      style={{position:"fixed",inset:0,background:"rgba(28,22,18,0.78)",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}
      onClick={phase === "result" ? onClose : undefined}>
      <style>{`
        @keyframes slideUp   { from { transform:translateY(100%) } to { transform:translateY(0) } }
        @keyframes popIn     { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeScore { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        .reaction-btn:active { transform:scale(0.95) !important; }
        .submit-btn:active   { transform:scale(0.98) !important; }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{background:"white",borderRadius:"28px 28px 0 0",width:"100%",maxWidth:480,animation:"slideUp 0.32s cubic-bezier(0.32,0.72,0,1)",paddingBottom:24}}>

        {/* Handle */}
        <div style={{width:40,height:4,borderRadius:2,background:"#e8dcd0",margin:"12px auto 0"}}/>

        {/* Place photo header */}
        <div style={{position:"relative",height:100,margin:"12px 16px 0",borderRadius:18,overflow:"hidden",background:"#1c1612"}}>
          {photo && <img src={photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.45}}/>}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 65%)"}}/>
          <div style={{position:"absolute",bottom:10,left:14,right:14}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700,color:"white",lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{slot?.name}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:1}}>{slot?.neighborhood} · {city?.split(",")[0]}</div>
          </div>
        </div>

        {/* ════ PHASE: REACTION ════ */}
        {phase === "reaction" && (
          <div style={{padding:"20px 16px 32px"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#a89880",textTransform:"uppercase",letterSpacing:"0.14em",textAlign:"center",marginBottom:16}}>
              How was it?
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {REACTIONS.map(r => (
                <button key={r.id} className="reaction-btn" onClick={() => pickReaction(r)}
                  style={{padding:"20px 12px 16px",borderRadius:20,border:"1.5px solid #e8dcd0",background:"#fdf6ed",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:8,transition:"transform 0.1s, background 0.1s, border-color 0.1s",outline:"none"}}>
                  <span style={{fontSize:36,lineHeight:1}}>{r.emoji}</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#1c1612"}}>{r.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => onSubmit(dayIdx, slotIdx, 0, "")}
              style={{marginTop:14,width:"100%",padding:"10px",borderRadius:14,border:"none",background:"transparent",color:"#a89880",fontSize:12,fontWeight:600,cursor:"pointer"}}>
              Skip rating
            </button>
          </div>
        )}

        {/* ════ PHASE: SCORE ════ */}
        {phase === "score" && (
          <div style={{padding:"16px 16px 32px"}}>
            {/* Selected reaction chip */}
            {selectedReaction && (
              <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
                <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"#f5ede0",borderRadius:20,padding:"5px 14px 5px 10px",fontSize:13,fontWeight:600,color:"#5c4f3d"}}>
                  <span style={{fontSize:16}}>{selectedReaction.emoji}</span>
                  <span>{selectedReaction.label}</span>
                  <button onClick={() => setPhase("reaction")}
                    style={{background:"none",border:"none",color:"#a89880",cursor:"pointer",fontSize:12,padding:"0 0 0 2px",lineHeight:1}}>✕</button>
                </div>
              </div>
            )}

            {/* Score display */}
            <div style={{textAlign:"center",marginBottom:20}}>
              <div
                key={score}
                style={{fontSize:88,fontWeight:900,lineHeight:1,color,transition:"color 0.12s",fontVariantNumeric:"tabular-nums",animation:"fadeScore 0.1s ease"}}>
                {score}
              </div>
              <div style={{fontSize:15,fontWeight:600,color:"#5c4f3d",marginTop:4,transition:"all 0.12s"}}>
                {SCORE_LABELS[score]}
              </div>
            </div>

            {/* Drag slider */}
            <div style={{padding:"0 4px",marginBottom:20}}>
              <div
                ref={trackRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{position:"relative",height:56,cursor:"grab",userSelect:"none",touchAction:"none"}}>
                {/* Track bg */}
                <div style={{position:"absolute",top:"50%",left:0,right:0,height:7,borderRadius:4,background:"#e8dcd0",transform:"translateY(-50%)"}}/>
                {/* Colored fill */}
                <div style={{
                  position:"absolute",top:"50%",left:0,
                  width:`calc(${thumbPct}% + 24px)`,
                  height:7,borderRadius:4,
                  background:"linear-gradient(to right,#ef4444 0%,#f97316 22%,#eab308 44%,#84cc16 67%,#22c55e 100%)",
                  transform:"translateY(-50%)",
                  transition:"width 0.04s",
                }}/>
                {/* Thumb */}
                <div style={{
                  position:"absolute",top:"50%",
                  left:`${thumbPct}%`,
                  transform:"translate(-50%,-50%)",
                  width:52,height:52,borderRadius:"50%",
                  background:color,
                  border:"3.5px solid white",
                  boxShadow:"0 4px 16px rgba(0,0,0,0.25)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  transition:"background 0.12s",
                  zIndex:2,pointerEvents:"none",
                }}>
                  <span style={{fontSize:18,fontWeight:900,color:"white",fontVariantNumeric:"tabular-nums"}}>{score}</span>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:0,paddingLeft:2,paddingRight:2}}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <span key={n} style={{fontSize:9,color:n===score?color:"#c8b9a6",fontWeight:n===score?800:500,transition:"color 0.12s"}}>{n}</span>
                ))}
              </div>
            </div>

            {/* Note */}
            {noteOpen ? (
              <input autoFocus value={note} onChange={e => setNote(e.target.value)}
                placeholder="Quick note for your future self… (optional)"
                style={{width:"100%",padding:"12px 14px",borderRadius:14,border:"1.5px solid #e8dcd0",background:"#fdf6ed",color:"#1c1612",fontSize:14,outline:"none",marginBottom:14,boxSizing:"border-box"}}/>
            ) : (
              <button onClick={() => setNoteOpen(true)}
                style={{width:"100%",padding:"11px",borderRadius:14,border:"1.5px dashed #e8dcd0",background:"transparent",color:"#a89880",fontSize:13,fontWeight:600,cursor:"pointer",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <span>✏️</span> Add a note
              </button>
            )}

            {/* Submit */}
            <button className="submit-btn" onClick={submit}
              style={{width:"100%",padding:16,borderRadius:18,background:color,border:"none",color:"white",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:`0 6px 24px ${color}50`,transition:"all 0.15s",outline:"none"}}>
              {user ? "Rate & share ✦" : "Save rating"}
            </button>
          </div>
        )}

        {/* ════ PHASE: RESULT ════ */}
        {phase === "result" && (
          <div style={{padding:"28px 20px 36px",textAlign:"center"}}>
            {/* Big score circle */}
            <div style={{
              width:108,height:108,borderRadius:"50%",
              background:color,
              boxShadow:`0 8px 40px ${color}55`,
              margin:"0 auto 18px",
              display:"flex",alignItems:"center",justifyContent:"center",
              animation:"popIn 0.45s cubic-bezier(0.34,1.56,0.64,1)",
            }}>
              <span style={{fontSize:44,fontWeight:900,color:"white",fontVariantNumeric:"tabular-nums"}}>{score}</span>
            </div>

            <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:"#1c1612",marginBottom:4}}>
              {SCORE_LABELS[score]}
            </div>
            <div style={{fontSize:13,color:"#a89880",marginBottom:6}}>{slot?.name}</div>

            {/* Rank context */}
            {totalRated > 1 && (
              <div style={{display:"inline-flex",alignItems:"center",gap:6,background:isTopStop?"#fef9ec":"#f5ede0",borderRadius:20,padding:"6px 14px",marginBottom:20,marginTop:8}}>
                <span style={{fontSize:14}}>{isTopStop ? "🏆" : "📍"}</span>
                <span style={{fontSize:13,fontWeight:700,color:isTopStop?"#c49a3c":"#5c4f3d"}}>
                  {isTopStop ? "Your top stop today" : `#${rank} of ${totalRated} stops today`}
                </span>
              </div>
            )}
            {totalRated <= 1 && <div style={{marginBottom:20}}/>}

            {/* Note preview */}
            {note && (
              <div style={{fontSize:13,color:"#5c4f3d",fontStyle:"italic",background:"#fdf6ed",borderRadius:12,padding:"10px 14px",marginBottom:20,textAlign:"left",border:"1px solid #e8dcd0"}}>
                "{note}"
              </div>
            )}

            <button onClick={onClose}
              style={{width:"100%",padding:15,borderRadius:18,background:"#1c1612",border:"none",color:"white",fontSize:15,fontWeight:700,cursor:"pointer"}}>
              Done
            </button>

            {user && (
              <div style={{marginTop:10,fontSize:11,color:"#a89880"}}>
                ✦ Shared with your friends
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
