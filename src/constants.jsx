import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────
// SUPABASE
// ─────────────────────────────────────────────
const SUPABASE_URL = "https://ejutttjjptmkhyqxoytl.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdXR0dGpqcHRta2h5cXhveXRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NTA4MzgsImV4cCI6MjA4OTAyNjgzOH0.kac5jh8nTs_IoruG2GlNkGWpRWZsyw_XcUj0hQmcdZ4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────
const T = {
  cream:    "#fdf6ed",  // warmer, more golden
  paper:    "#f5ede0",  // warmer paper
  ink:      "#1c1612",
  inkLight: "#5c4f3d",
  inkFaint: "#a89880",  // slightly warmer
  accent:   "#c84b2f",
  gold:     "#c49a3c",
  sage:     "#4a7c59",
  dust:     "#e8dcd0",  // warmer dust
  white:    "#ffffff",
};

// ─── Design system ───────────────────────────────────────────────────────────
// Use these everywhere for consistency

// Primary CTA — "Set the mood", "Build my itinerary", "View itinerary", "Save"
const BTN_PRIMARY = {
  background: `linear-gradient(135deg,#c84b2f,#9b2020)`,
  color: "#fff",
  border: "none",
  borderRadius: 16,
  padding: "14px 0",
  fontSize: 15,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 6px 20px rgba(200,75,47,0.25)",
  width: "100%",
  transition: "all 0.2s",
};

// Secondary CTA — "Skip", "Back", "Cancel", "Edit"
const BTN_SECONDARY = {
  background: "none",
  color: T.inkLight,
  border: `1.5px solid #e8dfd0`,
  borderRadius: 16,
  padding: "13px 0",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%",
};

// Section headers — used above content sections
const SECTION_LABEL = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: T.inkFaint,
  marginBottom: 10,
};

// Card — standard white card
const CARD = {
  background: T.white,
  borderRadius: 18,
  border: `1px solid #e8dfd0`,
  boxShadow: "0 2px 8px rgba(28,22,18,0.05)",
};

// Nav bar height constant — used to ensure content isn't hidden behind nav
const NAV_H = 72;

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400&display=swap');
`;

const GLOBAL_CSS = `
  ${FONTS}
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 16px; }
  body { background: #e8d8c8; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  ::-webkit-scrollbar { display: none; }
  input, button, select, textarea { font-family: 'DM Sans', sans-serif; font-size: 1rem; }
  @keyframes fadeUp   { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
  @keyframes pop      { 0%{transform:scale(1)} 40%{transform:scale(1.14)} 100%{transform:scale(1)} }
  @keyframes pulse    { 0%,100%{opacity:0.4} 50%{opacity:1} }
  @keyframes shimmer  { 0%{background-position:200% center} 100%{background-position:-200% center} }
  @keyframes slideUp  { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes spin     { to { transform: rotate(360deg) } }
  @keyframes marquee1 { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  @keyframes marquee2 { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
`;

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────
const VIBES = [
  { id:"slow-morning",    label:"Slow Morning",     emoji:"☕", color:"#a0522d", bg:"#fdf0e8" },
  { id:"chill-afternoon", label:"Chill Afternoon",  emoji:"🌤", color:"#1e6b8a", bg:"#eaf4fb" },
  { id:"golden-hour",     label:"Golden Hour",      emoji:"🌅", color:"#b06000", bg:"#fff5e0" },
  { id:"spa-day",         label:"Spa & Wellness",   emoji:"🧘", color:"#4a7c59", bg:"#eaf6f0" },
  { id:"street-food",     label:"Street Food",      emoji:"🌮", color:"#b5600a", bg:"#fef5e7" },
  { id:"splurge-dinner",  label:"Splurge Dinner",   emoji:"🍷", color:"#8b1a2f", bg:"#fdf0f2" },
  { id:"nightlife",       label:"Nightlife",        emoji:"🌙", color:"#2d2060", bg:"#f0edf8" },
  { id:"coffee-crawl",    label:"Coffee Crawl",     emoji:"☕", color:"#5c3d1e", bg:"#fdf5ed" },
  { id:"brunch",          label:"Brunch Vibes",     emoji:"🥂", color:"#8b4513", bg:"#fef8f0" },
  { id:"cultural",        label:"Cultural",         emoji:"🏛",  color:"#4a3a10", bg:"#faf5e4" },
  { id:"adventurous",     label:"Adventurous",      emoji:"⚡", color:"#9b2020", bg:"#fdecea" },
  { id:"local-weird",     label:"Local & Weird",    emoji:"🔮", color:"#5a2d82", bg:"#f4eefa" },
  { id:"day-trip",        label:"Day Trip",         emoji:"🚗", color:"#255c3f", bg:"#eaf6f0" },
  { id:"nature",          label:"Nature & Parks",   emoji:"🌿", color:"#2d5a1b", bg:"#edf7e8" },
  { id:"shopping",        label:"Shopping",         emoji:"🛍",  color:"#8b1a6b", bg:"#fdf0fa" },
  { id:"sports",          label:"Sports",           emoji:"🏟",  color:"#1a5c30", bg:"#e8f8ef" },
  { id:"art",             label:"Art & Design",     emoji:"🎨", color:"#1a3a6b", bg:"#eaf0fb" },
  { id:"music",           label:"Live Music",       emoji:"🎵", color:"#5a1a6b", bg:"#f4eefa" },
];

const VIBE_CATEGORIES = [
  { label:"Pace",         ids:["slow-morning","chill-afternoon","golden-hour","spa-day"] },
  { label:"Food & Drink", ids:["street-food","splurge-dinner","coffee-crawl","brunch","nightlife"] },
  { label:"Experience",   ids:["cultural","adventurous","local-weird","day-trip","nature","art","music"] },
  { label:"Shopping & Events", ids:["shopping","sports"] },
];

// Shown during onboarding (quick)
const ONBOARDING_QUESTIONS = [
  {
    id:"pace", question:"Your ideal travel pace?",
    options:[{v:"slow",l:"Slow & savour",e:"🧘"},{v:"medium",l:"Balanced mix",e:"⚖"},{v:"fast",l:"Pack it all in",e:"🏃"}],
  },
  {
    id:"food", question:"Food matters how much?",
    options:[{v:"everything",l:"It's the whole trip",e:"🍽"},{v:"important",l:"Very important",e:"🌮"},{v:"fuel",l:"Just fuel",e:"⚡"}],
  },
  {
    id:"vibe", question:"What's your ideal trip vibe?",
    options:[{v:"relax",l:"Total relaxation",e:"🏖"},{v:"explore",l:"Discover everything",e:"🗺"},{v:"immerse",l:"Live like a local",e:"🏘"}],
  },
];

// Full quiz in Profile
const QUIZ_QUESTIONS = [
  {
    id:"pace", question:"Your ideal travel pace?",
    options:[{v:"slow",l:"Slow & savour",e:"🧘"},{v:"medium",l:"Balanced mix",e:"⚖"},{v:"fast",l:"Pack it all in",e:"🏃"}],
  },
  {
    id:"food", question:"Food matters how much?",
    options:[{v:"everything",l:"It's the whole trip",e:"🍽"},{v:"important",l:"Very important",e:"🌮"},{v:"fuel",l:"Just fuel",e:"⚡"}],
  },
  {
    id:"sleep", question:"When do you wake up on vacation?",
    options:[{v:"early",l:"6-8am, let's go",e:"🌅"},{v:"mid",l:"9-10am, perfect",e:"☀"},{v:"late",l:"11am+, no rush",e:"🌙"}],
  },
  {
    id:"crowd", question:"Your crowd tolerance?",
    options:[{v:"love",l:"Love the energy",e:"🎪"},{v:"some",l:"Some is fine",e:"🙂"},{v:"hate",l:"Avoid at all costs",e:"🌿"}],
  },
  {
    id:"style", question:"Your travel style?",
    options:[{v:"planner",l:"I plan everything",e:"📋"},{v:"flex",l:"Rough outline only",e:"🗺"},{v:"spontaneous",l:"Pure spontaneity",e:"🎲"}],
  },
  {
    id:"budget", question:"How do you travel budget-wise?",
    options:[{v:"luxury",l:"Only the best",e:"💎"},{v:"mid",l:"Comfort without excess",e:"✈"},{v:"budget",l:"Stretch every dollar",e:"🎒"}],
  },
  {
    id:"companions", question:"Who do you usually travel with?",
    options:[{v:"solo",l:"Solo — just me",e:"🧍"},{v:"partner",l:"Partner or best friend",e:"👫"},{v:"group",l:"The whole crew",e:"👥"}],
  },
  {
    id:"vibe", question:"What's your ideal trip vibe?",
    options:[{v:"relax",l:"Total relaxation",e:"🏖"},{v:"explore",l:"Discover everything",e:"🗺"},{v:"immerse",l:"Live like a local",e:"🏘"}],
  },
];

const EXPLORE_CITIES = [
  { city:"New Orleans", tag:"Jazz & soul",         emoji:"🎷", bg:"#2d1a0e", accent:"#c49a3c" },
  { city:"Tokyo",       tag:"Ancient meets future", emoji:"🗼", bg:"#0e1a2d", accent:"#c84b2f" },
  { city:"Barcelona",   tag:"Sun & Gaudí",          emoji:"🌊", bg:"#1a2d0e", accent:"#4a7c59" },
  { city:"Nashville",   tag:"Honky-tonk heart",     emoji:"🎸", bg:"#2d200e", accent:"#c49a3c" },
  { city:"Lisbon",      tag:"Fado & hills",          emoji:"🚋", bg:"#1a0e2d", accent:"#a04060" },
  { city:"Miami",       tag:"Heat & art",            emoji:"🌴", bg:"#0e2d20", accent:"#c84b2f" },
  { city:"Paris",       tag:"Romance & culture",     emoji:"🗼", bg:"#1a1a2d", accent:"#c49a3c" },
  { city:"Mexico City", tag:"Color & chaos",         emoji:"🌮", bg:"#2d1a0e", accent:"#c84b2f" },
  { city:"New York",    tag:"The city that never sleeps", emoji:"🗽", bg:"#0e0e1a", accent:"#4a7c59" },
  { city:"Kyoto",       tag:"Temples & cherry blossoms", emoji:"⛩", bg:"#1a0e0e", accent:"#a04060" },
  { city:"Amsterdam",   tag:"Canals & creativity",   emoji:"🚲", bg:"#0e1a1a", accent:"#4a7c59" },
  { city:"Buenos Aires",tag:"Tango & steak",         emoji:"💃", bg:"#2d0e1a", accent:"#c49a3c" },
  { city:"Cape Town",   tag:"Mountains meet ocean",  emoji:"🏔", bg:"#0e2d2d", accent:"#c84b2f" },
  { city:"Seoul",       tag:"K-culture & street food", emoji:"🏙", bg:"#1a1a0e", accent:"#a04060" },
  { city:"London",      tag:"History & cool",        emoji:"🎡", bg:"#0e0e2d", accent:"#c49a3c" },
  { city:"Marrakech",   tag:"Spice & color",         emoji:"🕌", bg:"#2d1a00", accent:"#c84b2f" },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const MONTHS_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];


const TRANSIT_ICONS = { walk:"🚶", subway:"🚇", taxi:"🚕", uber:"U", lyft:"L", bus:"🚌", tram:"🚊", "tuk-tuk":"🛺", ferry:"🚢", bike:"🚲", drive:"🚗" };
const TRANSIT_COLORS = { walk:"#4a7c59", subway:"#1e6b8a", taxi:"#c49a3c", uber:"#000000", lyft:"#ea0083", bus:"#5a2d82", tram:"#255c3f", "tuk-tuk":"#b5600a", ferry:"#1a3a6b", bike:"#4a7c59", drive:"#555" };
const VIBE_COLORS_MAP = { "slow-morning":"#a0522d","splurge-dinner":"#8b1a2f","street-food":"#b5600a","nightlife":"#2d2060","day-trip":"#255c3f","adventurous":"#9b2020","chill-afternoon":"#1e6b8a","local-weird":"#5a2d82","cultural":"#4a3a10","sports":"#1a5c30","golden-hour":"#b06000","spa-day":"#4a7c59","coffee-crawl":"#5c3d1e","brunch":"#8b4513","nature":"#2d5a1b","shopping":"#8b1a6b","art":"#1a3a6b","music":"#5a1a6b" };
const TRAVEL_DNAS = {
  slow_savourer:  { label:"The Slow Savourer",  emoji:"☕", color:"#8b5e3c", bg:"linear-gradient(135deg,#1a0f00,#3d1f00)", description:"You travel to feel a place, not tick it off. Lingering over coffee, wandering without a plan, finding beauty in ordinary moments.", traits:["Unhurried","Sensory","Spontaneous","Immersive"] },
  hyper_planner:  { label:"The Hyper Planner",  emoji:"📋", color:"#1e6b8a", bg:"linear-gradient(135deg,#000d1a,#001f3d)", description:"You arrive with a color-coded itinerary and leave having seen everything on it. Efficiency is your love language.", traits:["Organized","Ambitious","Thorough","Efficient"] },
  food_explorer:  { label:"The Food Explorer",  emoji:"🍜", color:"#8b1a2f", bg:"linear-gradient(135deg,#1a0005,#3d000f)", description:"Every trip is really a food trip with some sightseeing attached. You research restaurants before hotels.", traits:["Curious","Adventurous","Indulgent","Local"] },
  off_path:       { label:"The Off-Path Seeker", emoji:"🗺", color:"#5a2d82", bg:"linear-gradient(135deg,#0d001a,#1f003d)", description:"Tourist traps are your enemy. You want the hidden courtyard, the unmarked bar, the neighborhood no guidebook covers.", traits:["Independent","Curious","Authentic","Bold"] },
  free_spirit:    { label:"The Free Spirit",    emoji:"🌊", color:"#255c3f", bg:"linear-gradient(135deg,#001a0d,#003d1f)", description:"Itineraries are suggestions. You go where the day takes you, say yes to strangers, and find the best stories by accident.", traits:["Spontaneous","Open","Social","Adventurous"] },
  balanced:       { label:"The Balanced Traveller", emoji:"⚡", color:"#7a5c2a", bg:"linear-gradient(135deg,#1a1200,#3d2d00)", description:"You want it all — culture, food, relaxation, adventure — in perfect proportion. You're the one who finds the best compromise.", traits:["Versatile","Thoughtful","Social","Grounded"] }
};

export { BTN_PRIMARY, BTN_SECONDARY, CARD, DAYS, EXPLORE_CITIES, FONTS, GLOBAL_CSS, MONTHS_FULL, MONTHS_SHORT, NAV_H, ONBOARDING_QUESTIONS, QUIZ_QUESTIONS, SECTION_LABEL, T, TRANSIT_COLORS, TRANSIT_ICONS, TRAVEL_DNAS, VIBES, VIBE_CATEGORIES, VIBE_COLORS_MAP };
;;