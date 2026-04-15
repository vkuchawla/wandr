import { useState } from "react";
import { T, GLOBAL_CSS, NAV_H } from "./constants.jsx";
function NavIcon({ id, active }) {
  const color = active ? "#fff" : "rgba(255,255,255,0.45)";
  const sz = 22;
  const sw = active ? 2.2 : 1.8;
  const icons = {
    home: (
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    explore: (
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={active ? "rgba(255,255,255,0.3)" : "none"} stroke={color}/>
      </svg>
    ),
    saved: (
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill={active ? "rgba(255,255,255,0.25)" : "none"} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
    social: (
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4" fill={active ? "rgba(255,255,255,0.2)" : "none"} stroke={color}/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    profile: (
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4" fill={active ? "rgba(255,255,255,0.2)" : "none"} stroke={color}/>
      </svg>
    ),
  };
  return icons[id] || null;
}

function NavBar({ screen, setScreen }) {
  const tabs = [
    { id:"home",    label:"Home"    },
    { id:"explore", label:"Explore" },
    { id:"social",  label:"Friends" },
    { id:"saved",   label:"Trips"   },
    { id:"profile", label:"Profile" },
  ];
  const showNav = !["loading","onboarding","auth","reveal"].includes(screen);
  if (!showNav) return null;

  return (
    <div style={{
      position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
      width:"100%", maxWidth:480, zIndex:100,
      paddingBottom:"max(env(safe-area-inset-bottom), 12px)",
      pointerEvents:"none",
    }}>
      {/* Floating pill container */}
      <div style={{
        margin:"0 16px",
        background:"rgba(22,16,12,0.82)",
        backdropFilter:"blur(20px)",
        WebkitBackdropFilter:"blur(20px)",
        borderRadius:28,
        border:"1px solid rgba(255,255,255,0.08)",
        boxShadow:"0 8px 32px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
        display:"flex",
        alignItems:"center",
        padding:"6px 4px",
        pointerEvents:"all",
      }}>
        {tabs.map(tab => {
          const active = screen === tab.id;
          return (
            <button key={tab.id}
              onClick={() => setScreen(tab.id)}
              aria-label={tab.label}
              style={{
                flex:1, padding:"8px 4px", background:"none", border:"none",
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                position:"relative", borderRadius:22, transition:"transform 0.15s ease",
              }}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.88)"}
              onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              onTouchStart={e => e.currentTarget.style.transform = "scale(0.88)"}
              onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
            >
              {/* Active glow pill behind icon */}
              <div style={{
                position:"absolute", inset:"2px 6px",
                borderRadius:18,
                background: active ? "rgba(200,75,47,0.22)" : "transparent",
                transition:"background 0.25s ease",
              }}/>
              <div style={{
                position:"relative", zIndex:1,
                transform: active ? "scale(1.1)" : "scale(1)",
                transition:"transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
              }}>
                <NavIcon id={tab.id} active={active}/>
              </div>
              {/* Active dot */}
              {active && (
                <div style={{
                  position:"absolute", bottom:2, left:"50%", transform:"translateX(-50%)",
                  width:4, height:4, borderRadius:"50%",
                  background:T.accent,
                  animation:"fadeIn 0.2s ease",
                }}/>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────
export { NavBar };
