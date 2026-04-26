import { useState, useEffect } from "react";
import { T, GLOBAL_CSS, CITY_PHOTOS, TRANSIT_ICONS } from "./constants.jsx";

// Inject OG meta tags for social sharing — called once per public trip load
const setOGMeta = (trip) => {
  const city = trip.city?.split(",")[0] || "your next destination";
  const days = trip.days?.length || 0;
  const title = `${days}-day ${city} itinerary — crafted by WANDR`;
  const desc = `Explore ${city} with a vibe-curated AI itinerary: ${days} days, ${
    trip.days?.reduce((s, d) => s + (d.slots?.length || 0), 0)
  } stops, handpicked by AI.`;
  const img = CITY_PHOTOS[city] || "https://wandr-app-mocha.vercel.app/og-default.png";

  const set = (sel, attr, val) => {
    let el = document.querySelector(sel);
    if (!el) { el = document.createElement("meta"); document.head.appendChild(el); }
    el.setAttribute(attr, val);
  };
  document.title = title;
  set('meta[name="description"]', "content", desc);
  set('meta[property="og:title"]', "content", title);
  set('meta[property="og:description"]', "content", desc);
  set('meta[property="og:image"]', "content", img);
  set('meta[name="twitter:title"]', "content", title);
  set('meta[name="twitter:description"]', "content", desc);
  set('meta[name="twitter:image"]', "content", img);
};

// Bucket colors
const BUCKET_COLORS = { morning: "#c49a3c", afternoon: "#4a7c59", evening: "#8b1a2f" };
const getBucket = (t) => {
  if (!t) return "morning";
  const h = parseInt(t.split(":")[0]);
  const pm = /pm/i.test(t);
  const hour = pm && h !== 12 ? h + 12 : !pm && h === 12 ? 0 : h;
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
};
const BUCKET_LABELS = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };
const BUCKET_ICONS  = { morning: "🌅", afternoon: "☀️", evening: "🌙" };

function PublicTrip({ tripId, supabase, onPlanOwn }) {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeDay, setActiveDay] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!tripId || !supabase) { setError("Trip not found"); setLoading(false); return; }
    supabase.from("trips").select("*").eq("id", tripId).single()
      .then(({ data, error: err }) => {
        if (err || !data) { setError("This trip doesn't exist or isn't public."); }
        else {
          const t = { ...data, days: data.days, moodContext: data.mood_context };
          setTrip(t);
          setOGMeta(t);
        }
        setLoading(false);
      });
  }, [tripId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const cityPhoto = trip ? CITY_PHOTOS[trip.city?.split(",")[0]] : null;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ fontSize: 40, color: T.gold, animation: "pulse 1.5s ease infinite" }}>✦</div>
    </div>
  );

  if (error || !trip) return (
    <div style={{ minHeight: "100vh", background: T.cream, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32, fontFamily: "'DM Sans',sans-serif" }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ fontSize: 40 }}>✦</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>Trip not found</div>
      <div style={{ fontSize: 13, color: T.inkFaint, textAlign: "center" }}>{error}</div>
      <button onClick={onPlanOwn} style={{ padding: "13px 28px", borderRadius: 16, background: T.accent, border: "none", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
        Plan your own →
      </button>
    </div>
  );

  const days = trip.days || [];
  const day = days[activeDay];
  const totalSlots = days.reduce((s, d) => s + (d.slots?.length || 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: T.cream, fontFamily: "'DM Sans',sans-serif" }}>
      <style>{GLOBAL_CSS}</style>

      {/* Hero */}
      <div style={{
        position: "relative", height: 320, overflow: "hidden",
        background: `linear-gradient(145deg, ${T.ink}, #2d1a0e)`,
      }}>
        {cityPhoto && (
          <img src={cityPhoto} alt={trip.city} style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
            opacity: 0.45, animation: "kenburns 22s ease-in-out infinite alternate",
          }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(28,22,18,0.88) 100%)" }} />

        {/* WANDR wordmark */}
        <div style={{ position: "absolute", top: 20, left: 20, fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: "0.25em", textTransform: "uppercase" }}>✦ WANDR</div>

        {/* Share + plan CTA */}
        <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
          <button onClick={handleCopyLink} style={{ padding: "7px 14px", borderRadius: 20, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(8px)" }}>
            {copied ? "✓ Copied!" : "Share"}
          </button>
        </div>

        {/* Trip info */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 24px 28px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: T.gold, textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 8 }}>✦ AI Itinerary</div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 900, color: "white", lineHeight: 1.1, marginBottom: 10 }}>
            {trip.city?.split(",")[0]}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {trip.dates && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{trip.dates}</span>}
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>·</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{days.length} day{days.length !== 1 ? "s" : ""}</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>·</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{totalSlots} stops</span>
          </div>
        </div>
      </div>

      {/* Plan your own CTA */}
      <div style={{ padding: "18px 20px 0" }}>
        <button onClick={onPlanOwn} style={{
          width: "100%", padding: "15px 0", borderRadius: 16,
          background: `linear-gradient(135deg, ${T.accent}, #9b2020)`,
          border: "none", color: "white", fontSize: 15, fontWeight: 800,
          cursor: "pointer", boxShadow: "0 6px 20px rgba(200,75,47,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <span>✦</span><span>Plan a trip like this with WANDR</span>
        </button>
      </div>

      {/* Day selector */}
      {days.length > 1 && (
        <div style={{ display: "flex", gap: 8, padding: "16px 20px 0", overflowX: "auto" }}>
          {days.map((d, i) => (
            <button key={i} onClick={() => setActiveDay(i)}
              style={{
                flexShrink: 0, padding: "7px 16px", borderRadius: 20,
                background: activeDay === i ? T.ink : T.white,
                border: `1.5px solid ${activeDay === i ? T.ink : T.dust}`,
                color: activeDay === i ? "white" : T.inkLight,
                fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>
              Day {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Day theme */}
      {day?.theme && (
        <div style={{ padding: "14px 20px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: T.dust }} />
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 13, fontStyle: "italic", color: T.inkFaint, flexShrink: 0, textAlign: "center", maxWidth: 240 }}>{day.theme}</div>
          <div style={{ flex: 1, height: 1, background: T.dust }} />
        </div>
      )}

      {/* Slots list */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 0 }}>
        {(day?.slots || []).map((slot, i) => {
          const bc = BUCKET_COLORS[getBucket(slot.time)];
          const curBucket = getBucket(slot.time);
          const prevBucket = i > 0 ? getBucket((day.slots || [])[i - 1]?.time) : null;
          const showDivider = curBucket !== prevBucket;
          return (
            <div key={i}>
              {showDivider && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0 8px", marginTop: i === 0 ? 0 : 4 }}>
                  <span style={{ fontSize: 13 }}>{BUCKET_ICONS[curBucket]}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: T.inkLight, textTransform: "uppercase", letterSpacing: "0.14em" }}>{BUCKET_LABELS[curBucket]}</span>
                  <div style={{ flex: 1, height: 1, background: T.dust }} />
                </div>
              )}
              <div style={{
                display: "flex", gap: 14, padding: "12px 0",
                borderBottom: i < (day.slots?.length || 0) - 1 ? `1px solid ${T.dust}` : "none",
              }}>
                {/* Time + dot */}
                <div style={{ width: 52, flexShrink: 0, textAlign: "right", paddingTop: 2 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: bc, fontVariantNumeric: "tabular-nums" }}>
                    {slot.time?.replace(" AM", "a").replace(" PM", "p")}
                  </div>
                </div>
                {/* Card */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: T.ink, marginBottom: 2 }}>{slot.name}</div>
                  <div style={{ fontSize: 12, color: T.inkFaint, marginBottom: slot.activity ? 6 : 0 }}>
                    {slot.neighborhood}
                    {slot.category && <> · <span style={{ textTransform: "capitalize" }}>{slot.category}</span></>}
                    {slot.highlight && <> · <span style={{ color: T.gold, fontWeight: 700 }}>★ Must-do</span></>}
                    {slot.rating && <> · <span style={{ fontWeight: 600 }}>★ {Number(slot.rating).toFixed(1)}</span></>}
                  </div>
                  {slot.activity && (
                    <div style={{ fontSize: 13, color: T.inkLight, lineHeight: 1.5, fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {slot.activity}
                    </div>
                  )}
                  {/* Transit to next */}
                  {slot.transit_from_prev && i > 0 && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11, color: T.inkFaint }}>
                      <span>{TRANSIT_ICONS[slot.transit_mode || "walk"] || "🚶"}</span>
                      <span style={{ fontWeight: 600 }}>{slot.transit_from_prev}</span>
                    </div>
                  )}
                </div>
                {/* Photo thumbnail */}
                {slot.photos?.[0] && (
                  <img src={slot.photos[0]} alt={slot.name}
                    style={{ width: 60, height: 60, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
                    onError={e => e.target.style.display = "none"} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div style={{ padding: "8px 20px 48px" }}>
        <button onClick={onPlanOwn} style={{
          width: "100%", padding: "15px 0", borderRadius: 16,
          background: T.ink, border: "none", color: "white",
          fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>
          Create your own WANDR itinerary →
        </button>
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: T.inkFaint }}>
          Free · No signup required · Powered by Claude AI
        </div>
      </div>
    </div>
  );
}

export { PublicTrip };
