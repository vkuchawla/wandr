import { useState } from "react";
import { T, GLOBAL_CSS, NAV_H, VIBES, VIBE_CATEGORIES } from "./constants.jsx";
import { parseTripDays } from "./utils.jsx";

function getVibesFromProfile(profile, dayCount) {
  if (!profile?.answers) return Array(dayCount).fill([]);
  const a = profile.answers;
  const vibes = [];
  if (a.pace === "slow" || a.sleep === "late") vibes.push("slow-morning");
  if (a.pace === "slow" || a.vibe === "relax") vibes.push("chill-afternoon");
  if (a.food === "everything") { vibes.push("splurge-dinner"); vibes.push("street-food"); }
  if (a.food === "important") vibes.push("street-food");
  if (a.budget === "luxury") { if (!vibes.includes("splurge-dinner")) vibes.push("splurge-dinner"); }
  if (a.budget === "budget") vibes.push("street-food");
  if (a.style === "spontaneous" || a.vibe === "immerse") vibes.push("local-weird");
  if (a.vibe === "explore") { vibes.push("cultural"); vibes.push("adventurous"); }
  if (a.companions === "solo") { vibes.push("local-weird"); vibes.push("cultural"); }
  if (a.companions === "partner") vibes.push("splurge-dinner");
  if (a.crowd === "love") vibes.push("nightlife");
  if (a.crowd === "hate") vibes.push("nature");
  const unique = [...new Set(vibes)].slice(0, 4);
  return Array(dayCount).fill(null).map(() => [...unique]);
}

function MoodBoard({ city, dates, onBuild, onBack, profile, remixContext }) {
  const tripDays = parseTripDays(dates);

  const initBoard = () => {
    if (remixContext) {
      const lines = remixContext.split("\n").filter(Boolean);
      return tripDays.map((_, i) => {
        const line = lines[i] || "";
        const vibeLabels = line.split(":")[1]?.split(",").map(v => v.trim()).filter(Boolean) || [];
        return vibeLabels.map(label => {
          const found = VIBES.find(v => v.label.toLowerCase() === label.toLowerCase());
          return found?.id;
        }).filter(Boolean);
      });
    }
    return getVibesFromProfile(profile, tripDays.length);
  };

  const [board, setBoard] = useState(initBoard);
  const [activeDay, setActiveDay] = useState(0);
  const [justAdded, setJustAdded] = useState(null);
  const [homeBase, setHomeBase] = useState("");
  const [applyAll, setApplyAll] = useState(false);
  const [hotelFocused, setHotelFocused] = useState(false);

  const toggleVibe = (vibeId) => {
    setBoard(prev => {
      const next = prev.map(d => [...d]);
      const isSelected = next[activeDay].includes(vibeId);
      if (applyAll && tripDays.length > 1) {
        next.forEach((_, i) => {
          next[i] = isSelected ? next[i].filter(v => v !== vibeId) : [...next[i], vibeId];
        });
      } else {
        next[activeDay] = isSelected
          ? next[activeDay].filter(v => v !== vibeId)
          : [...next[activeDay], vibeId];
      }
      return next;
    });
    if (!board[activeDay].includes(vibeId)) {
      setJustAdded(vibeId);
      setTimeout(() => setJustAdded(null), 350);
    }
  };

  const totalVibes = board.reduce((s, d) => s + d.length, 0);
  const buildContext = () => tripDays.map((day, i) => {
    const vibes = board[i].map(id => VIBES.find(v => v.id === id)?.label).filter(Boolean);
    return `${day}: ${vibes.length ? vibes.join(", ") : "open / flexible"}`;
  }).join("\n");

  const cityShort = city?.split(",")[0] || city;
  const daysCount = tripDays.length;
  const topVibeLabels = [...new Set(board.flat().map(id => VIBES.find(v => v.id === id)?.label).filter(Boolean))].slice(0, 3);

  return (
    <div style={{ minHeight: "100vh", background: T.cream, fontFamily: "'DM Sans',sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{GLOBAL_CSS}
        {`
          @keyframes vibeIn { from { opacity:0; transform:scale(0.88) translateY(4px); } to { opacity:1; transform:scale(1) translateY(0); } }
          @keyframes pop2 { 0%{transform:scale(1)} 40%{transform:scale(1.13)} 100%{transform:scale(1)} }
        `}
      </style>

      {/* ── Compact dark header ── */}
      <div style={{ background: `linear-gradient(160deg, ${T.ink} 0%, #2d1f10 100%)`, padding: "48px 20px 24px", position: "relative", flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: "radial-gradient(circle at 70% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none" }} />

        {/* Top row: back + remix badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 5 }}>
            ← {cityShort}
          </button>
          {remixContext && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(200,75,47,0.15)", border: "1px solid rgba(200,75,47,0.3)", borderRadius: 20, padding: "5px 12px" }}>
              <span style={{ fontSize: 11, color: T.accent, fontWeight: 700, letterSpacing: "0.05em" }}>✦ REMIXING</span>
            </div>
          )}
        </div>

        {/* City + tagline */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(196,154,60,0.7)", marginBottom: 6 }}>✦ SET THE MOOD</div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 700, color: T.white, lineHeight: 1.1, margin: "0 0 4px" }}>
          {cityShort}.
        </h1>
        <p style={{ fontSize: 16, fontStyle: "italic", color: "rgba(255,255,255,0.4)", margin: "0 0 16px", fontFamily: "'Playfair Display',serif", fontWeight: 400 }}>
          How do you want it to feel?
        </p>

        {/* Meta pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "5px 12px", fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>
            📅 {daysCount} day{daysCount !== 1 ? "s" : ""}
          </div>
          {profile?.answers && (
            <div style={{ background: "rgba(196,154,60,0.12)", border: "1px solid rgba(196,154,60,0.2)", borderRadius: 20, padding: "5px 12px", fontSize: 12, color: "rgba(196,154,60,0.8)", fontWeight: 600 }}>
              ✦ Vibes pre-filled for you
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky controls: day tabs + hotel ── */}
      <div style={{ background: T.paper, borderBottom: `1px solid ${T.dust}`, flexShrink: 0 }}>

        {/* Day tabs row */}
        {daysCount > 1 && (
          <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${T.dust}` }}>
            <div style={{ flex: 1, display: "flex", overflowX: "auto" }}>
              {tripDays.map((day, i) => {
                const count = board[i].length, active = activeDay === i;
                return (
                  <button key={day} onClick={() => setActiveDay(i)}
                    style={{ flexShrink: 0, padding: "12px 16px", border: "none", borderBottom: active ? `2.5px solid ${T.ink}` : "2.5px solid transparent", background: "none", color: active ? T.ink : T.inkFaint, fontSize: 13, fontWeight: active ? 800 : 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}>
                    {day}
                    {count > 0 && (
                      <span style={{ background: active ? T.ink : T.dust, color: active ? T.white : T.inkFaint, borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 800, transition: "all 0.15s" }}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Inline apply-to-all toggle */}
            <button onClick={() => setApplyAll(a => !a)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 14px", background: "none", border: "none", cursor: "pointer", flexShrink: 0, height: "100%" }}>
              <div style={{ width: 32, height: 18, borderRadius: 9, background: applyAll ? T.ink : T.dust, position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 2, left: applyAll ? 15 : 2, width: 14, height: 14, borderRadius: "50%", background: T.white, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
              </div>
              <span style={{ fontSize: 11, color: applyAll ? T.ink : T.inkFaint, fontWeight: 700, whiteSpace: "nowrap" }}>All days</span>
            </button>
          </div>
        )}

        {/* Hotel input — below set the mood / tabs */}
        <div style={{ padding: "10px 16px 12px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🏨</span>
          <input
            value={homeBase}
            onChange={e => setHomeBase(e.target.value)}
            onFocus={() => setHotelFocused(true)}
            onBlur={() => setHotelFocused(false)}
            placeholder="Where are you staying? (optional)"
            style={{
              flex: 1, padding: "0", border: "none", background: "transparent",
              color: homeBase ? T.ink : T.inkFaint, fontSize: 13, fontWeight: homeBase ? 600 : 400,
              outline: "none", fontFamily: "'DM Sans',sans-serif"
            }} />
          {homeBase && (
            <button onClick={() => setHomeBase("")} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkFaint, fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
          )}
        </div>
        {homeBase && (
          <div style={{ padding: "0 16px 10px", fontSize: 11, color: T.sage, fontWeight: 600 }}>
            ✓ Routing your day from {homeBase.split(",")[0]}
          </div>
        )}
      </div>

      {/* ── Scrollable vibe categories ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>
        {VIBE_CATEGORIES.map(cat => {
          const vibes = cat.ids.map(id => VIBES.find(v => v.id === id)).filter(Boolean);
          return (
            <div key={cat.label} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: T.inkFaint, marginBottom: 10 }}>{cat.label}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                {vibes.map(vibe => {
                  const selected = board[activeDay].includes(vibe.id);
                  const popping = justAdded === vibe.id;
                  return (
                    <button key={vibe.id} onClick={() => toggleVibe(vibe.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 9,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: `1.5px solid ${selected ? T.ink : T.dust}`,
                        background: selected ? T.ink : T.white,
                        cursor: "pointer",
                        animation: popping ? "pop2 0.35s ease" : undefined,
                        transition: "all 0.15s",
                        boxShadow: selected ? "0 2px 10px rgba(28,22,18,0.15)" : "0 1px 2px rgba(28,22,18,0.04)",
                        textAlign: "left",
                      }}>
                      <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>{vibe.emoji}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: selected ? T.white : T.ink, lineHeight: 1.2 }}>{vibe.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div style={{ height: 16 }} />
      </div>

      {/* ── Sticky build bar ── */}
      <div style={{ borderTop: `1px solid ${T.dust}`, background: T.cream, padding: "14px 16px", paddingBottom: NAV_H + 14, flexShrink: 0 }}>
        <button onClick={() => onBuild(buildContext(), homeBase.trim())}
          style={{
            width: "100%", padding: "16px 20px", borderRadius: 16,
            background: totalVibes > 0
              ? `linear-gradient(135deg, ${T.ink} 0%, #2d1f10 100%)`
              : `linear-gradient(135deg, ${T.accent} 0%, #9b2020 100%)`,
            border: "none", color: T.white, cursor: "pointer",
            boxShadow: totalVibes > 0 ? "0 4px 20px rgba(28,22,18,0.18)" : "0 4px 18px rgba(200,75,47,0.28)",
            transition: "all 0.2s", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>
              {totalVibes === 0 ? "Let AI decide ✦" : `Build my ${daysCount}-day itinerary →`}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 3, fontWeight: 500 }}>
              {totalVibes === 0
                ? `AI picks the perfect mix for ${cityShort}`
                : topVibeLabels.join(" · ") + (totalVibes > topVibeLabels.length ? ` +${totalVibes - topVibeLabels.length} more` : "")}
            </div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>
            {totalVibes === 0 ? "✦" : "→"}
          </div>
        </button>
      </div>
    </div>
  );
}

export { MoodBoard };
