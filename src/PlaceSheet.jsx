import { useState, useEffect } from "react";
import { T, GLOBAL_CSS } from "./constants.jsx";

// In-memory cache so repeated taps are instant
const placeCache = {};

function PlaceSheet({ place, city, category, BACKEND, onClose }) {
  const cacheKey = `${place}__${city}`;
  const [data, setData]         = useState(placeCache[cacheKey] || null);
  const [loading, setLoading]   = useState(!placeCache[cacheKey]);
  const [error, setError]       = useState(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [activeTab, setActiveTab]     = useState("overview");

  useEffect(() => {
    if (placeCache[cacheKey]) return; // already cached
    fetch(`${BACKEND}/place`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: place, city, category })
    })
      .then(r => r.json())
      .then(d => {
        placeCache[cacheKey] = d; // cache it
        setData(d);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const ratingColor = (r) => {
    if (!r) return T.inkFaint;
    const n = parseFloat(r);
    if (n >= 4.2) return "#2d8a4e";
    if (n >= 3.5) return "#b5600a";
    return "#c84b2f";
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(28,22,18,0.75)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn 0.2s ease"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.white,borderRadius:"28px 28px 0 0",width:"100%",maxWidth:480,maxHeight:"92vh",overflowY:"auto",animation:"slideUp 0.3s ease",fontFamily:"'DM Sans',sans-serif"}}>

        {/* Skeleton loading */}
        {loading && (
          <div>
            <div style={{width:36,height:4,borderRadius:2,background:T.dust,margin:"16px auto 0"}}/>
            {/* Skeleton hero */}
            <div style={{height:220,background:`linear-gradient(135deg,${T.ink},#2d1f10)`,borderRadius:"28px 28px 0 0",display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:"20px 20px 24px"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:"white",marginBottom:6}}>{place}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>Loading details…</div>
            </div>
            {/* Skeleton content */}
            <div style={{padding:"20px 20px"}}>
              {[80,60,90,50,70].map((w,i)=>(
                <div key={i} style={{height:12,borderRadius:6,background:T.paper,width:`${w}%`,marginBottom:10,animation:"pulse 1.5s ease infinite",animationDelay:`${i*0.1}s`}}/>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{padding:"48px 32px",textAlign:"center"}}>
            <div style={{width:36,height:4,borderRadius:2,background:T.dust,margin:"0 auto 24px"}}/>
            <div style={{fontSize:28,marginBottom:12}}>🤷</div>
            <div style={{fontSize:15,fontWeight:700,color:T.ink,marginBottom:6}}>Couldn't find details</div>
            <div style={{fontSize:13,color:T.inkFaint,marginBottom:20}}>We couldn't pull data for this place right now.</div>
            <button onClick={onClose} style={{padding:"12px 28px",borderRadius:14,background:T.ink,border:"none",color:T.white,fontSize:14,fontWeight:700,cursor:"pointer"}}>Got it</button>
          </div>
        )}

        {data && (
          <>
            {/* Hero photo — full bleed */}
            <div style={{position:"relative",height:260,background:T.ink,borderRadius:"28px 28px 0 0",overflow:"hidden"}}>
              {data.photos?.length > 0
                ? <img src={data.photos[activePhoto]} alt={data.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
                : <div style={{width:"100%",height:"100%",background:`linear-gradient(135deg,${T.ink},#2d1f10)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:48,opacity:0.3}}>🏛</div>
              }
              {/* Gradient overlay */}
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,rgba(28,22,18,0.75) 100%)"}}/>

              {/* Close button */}
              <button onClick={onClose} style={{position:"absolute",top:16,right:16,width:32,height:32,borderRadius:"50%",background:"rgba(0,0,0,0.4)",border:"none",color:"white",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>

              {/* Photo dots */}
              {data.photos?.length > 1 && (
                <div style={{position:"absolute",bottom:70,left:"50%",transform:"translateX(-50%)",display:"flex",gap:5}}>
                  {data.photos.map((_,i)=>(
                    <button key={i} onClick={()=>setActivePhoto(i)} style={{width:i===activePhoto?18:5,height:5,borderRadius:3,background:i===activePhoto?"white":"rgba(255,255,255,0.45)",border:"none",cursor:"pointer",padding:0,transition:"all 0.2s"}}/>
                  ))}
                </div>
              )}

              {/* Name + rating on photo */}
              <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"16px 20px"}}>
                <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:12}}>
                  <div style={{flex:1}}>
                    <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"white",lineHeight:1.2,marginBottom:4}}>{data.name}</h2>
                    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      {data.category && <span style={{fontSize:11,color:"rgba(255,255,255,0.65)",fontWeight:600}}>{data.category}</span>}
                      {data.price && <span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>· {data.price}</span>}
                      {data.neighborhood && <span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>· {data.neighborhood}</span>}
                    </div>
                  </div>
                  {data.rating && (
                    <div style={{background:ratingColor(data.rating),borderRadius:12,padding:"8px 12px",textAlign:"center",flexShrink:0}}>
                      <div style={{fontSize:18,fontWeight:900,color:"white",lineHeight:1}}>{data.rating}</div>
                      <div style={{fontSize:9,color:"rgba(255,255,255,0.7)",fontWeight:700,letterSpacing:"0.05em",marginTop:2}}>{data.totalRatings ? `${(data.totalRatings/1000).toFixed(1)}K reviews` : "★ SCORE"}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Open status + action strip */}
            <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.dust}`,display:"flex",alignItems:"center",gap:10}}>
              {data.isOpenNow !== null && data.isOpenNow !== undefined && (
                <span style={{fontSize:12,fontWeight:700,color:data.isOpenNow?"#2d8a4e":"#c84b2f",background:data.isOpenNow?"#e8f7ee":"#fdecea",padding:"4px 10px",borderRadius:20}}>
                  {data.isOpenNow ? "● Open now" : "● Closed"}
                </span>
              )}
              <div style={{flex:1}}/>
              <a href={data.mapsUrl} target="_blank" rel="noreferrer" style={{padding:"8px 14px",borderRadius:20,background:T.ink,color:T.white,fontSize:12,fontWeight:700,textDecoration:"none"}}>
                📍 Directions
              </a>
              {data.website && (
                <a href={data.website} target="_blank" rel="noreferrer" style={{padding:"8px 14px",borderRadius:20,background:T.paper,color:T.ink,fontSize:12,fontWeight:700,textDecoration:"none",border:`1px solid ${T.dust}`}}>
                  🌐 Website
                </a>
              )}
              {data.phone && (
                <a href={`tel:${data.phone}`} style={{padding:"8px 12px",borderRadius:20,background:T.paper,color:T.ink,fontSize:12,fontWeight:700,textDecoration:"none",border:`1px solid ${T.dust}`}}>📞</a>
              )}
            </div>

            {/* Tab bar */}
            <div style={{display:"flex",borderBottom:`1px solid ${T.dust}`,padding:"0 20px"}}>
              {["overview","reviews","hours"].map(tab=>(
                <button key={tab} onClick={()=>setActiveTab(tab)}
                  style={{flex:1,padding:"12px 0",background:"none",border:"none",fontSize:13,fontWeight:700,cursor:"pointer",color:activeTab===tab?T.ink:T.inkFaint,borderBottom:`2px solid ${activeTab===tab?T.accent:"transparent"}`,textTransform:"capitalize",transition:"all 0.15s"}}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{padding:"20px 20px 40px"}}>

              {/* OVERVIEW */}
              {activeTab==="overview" && (
                <div style={{display:"flex",flexDirection:"column",gap:16}}>
                  {data.description && (
                    <div style={{fontSize:14,color:T.inkLight,lineHeight:1.7}}>{data.description}</div>
                  )}
                  {/* Quick facts */}
                  <div style={{background:T.paper,borderRadius:16,padding:16,display:"flex",flexDirection:"column",gap:10}}>
                    {data.address && (
                      <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                        <span style={{fontSize:16,flexShrink:0}}>📍</span>
                        <span style={{fontSize:13,color:T.inkLight,lineHeight:1.5}}>{data.address}</span>
                      </div>
                    )}
                    {data.price && (
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <span style={{fontSize:16,flexShrink:0}}>💰</span>
                        <span style={{fontSize:13,color:T.inkLight}}>{data.price} · {data.price==="$"?"Budget friendly":data.price==="$$"?"Moderate":data.price==="$$$"?"Upscale":"Fine dining"}</span>
                      </div>
                    )}
                    {data.category && (
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <span style={{fontSize:16,flexShrink:0}}>🏷</span>
                        <span style={{fontSize:13,color:T.inkLight}}>{data.category}</span>
                      </div>
                    )}
                  </div>
                  {/* Photo strip */}
                  {data.photos?.length > 1 && (
                    <div>
                      <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.inkFaint,marginBottom:10}}>Photos</div>
                      <div style={{display:"flex",gap:8,overflowX:"auto"}}>
                        {data.photos.map((p,i)=>(
                          <img key={i} src={p} alt="" onClick={()=>setActivePhoto(i)} style={{width:100,height:72,objectFit:"cover",borderRadius:10,flexShrink:0,cursor:"pointer",border:i===activePhoto?`2px solid ${T.accent}`:"2px solid transparent",transition:"border 0.15s"}} onError={e=>e.target.style.display="none"}/>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* REVIEWS */}
              {activeTab==="reviews" && (
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {data.tips?.length > 0 ? data.tips.map((tip,i)=>(
                    <div key={i} style={{background:T.paper,borderRadius:16,padding:"14px 16px"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:28,height:28,borderRadius:"50%",background:T.dust,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:T.inkFaint}}>
                            {tip.author?.[0] || "G"}
                          </div>
                          <div>
                            <div style={{fontSize:12,fontWeight:700,color:T.ink}}>{tip.author || "Google user"}</div>
                            <div style={{fontSize:10,color:T.inkFaint}}>{tip.time || ""}</div>
                          </div>
                        </div>
                        {tip.rating && (
                          <div style={{display:"flex",gap:2}}>
                            {Array(5).fill(null).map((_,s)=>(
                              <span key={s} style={{fontSize:11,color:s<tip.rating?T.gold:T.dust}}>★</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{fontSize:13,color:T.inkLight,lineHeight:1.65}}>{tip.text}</div>
                    </div>
                  )) : (
                    <div style={{textAlign:"center",padding:"24px 0",color:T.inkFaint,fontSize:13}}>No reviews available for this place.</div>
                  )}
                </div>
              )}

              {/* HOURS */}
              {activeTab==="hours" && (
                <div>
                  {data.hours?.length > 0 ? (
                    <div style={{background:T.paper,borderRadius:16,padding:16,display:"flex",flexDirection:"column",gap:10}}>
                      {data.hours.map((h,i)=>{
                        const today = new Date().toLocaleDateString("en-US",{weekday:"short"});
                        const isToday = h.startsWith(today);
                        return (
                          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:i<data.hours.length-1?`1px solid ${T.dust}`:"none"}}>
                            <span style={{fontSize:13,fontWeight:isToday?700:400,color:isToday?T.ink:T.inkLight}}>{h.split(":")[0]}</span>
                            <span style={{fontSize:13,fontWeight:isToday?700:400,color:isToday?T.accent:T.inkFaint}}>{h.split(": ").slice(1).join(": ")}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{textAlign:"center",padding:"24px 0",color:T.inkFaint,fontSize:13}}>Hours not available.</div>
                  )}
                </div>
              )}

            </div>
          </>
        )}
      </div>
    </div>
  );
}

export { PlaceSheet };