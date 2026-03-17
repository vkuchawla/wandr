import { useState } from "react";
import { T, GLOBAL_CSS, NAV_H } from "./constants.jsx";
function NavIcon({ id, active }) {
  const color = active ? T.accent : T.inkFaint;
  const icons = {
    home: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    explore: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={active ? T.accent : "none"}/>
      </svg>
    ),
    saved: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? T.accent : "none"} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
    social: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4" fill={active ? T.accent : "none"} stroke={color}/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    profile: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4" fill={active ? T.accent : "none"} stroke={color}/>
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
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:T.white,borderTop:`1px solid ${T.dust}`,display:"flex",zIndex:100,paddingBottom:"max(env(safe-area-inset-bottom), 8px)"}}>
      {tabs.map(tab => {
        const active = screen === tab.id;
        return (
          <button key={tab.id} onClick={()=>setScreen(tab.id)}
            style={{flex:1,padding:"8px 4px 6px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"opacity 0.15s",position:"relative"}}>
            {/* Active pill indicator */}
            <div style={{
              position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",
              width: active ? 24 : 0,
              height: 2,
              borderRadius: "0 0 2px 2px",
              background: T.accent,
              transition: "width 0.25s cubic-bezier(0.34,1.56,0.64,1)",
            }}/>
            <div style={{transform:active?"scale(1.08)":"scale(1)",transition:"transform 0.2s ease"}}>
              <NavIcon id={tab.id} active={active}/>
            </div>
            <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:active?T.accent:T.inkFaint,transition:"color 0.2s"}}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────
export { NavBar };