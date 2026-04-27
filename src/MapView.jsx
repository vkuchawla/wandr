import { useEffect, useRef, useState } from "react";
import { T, NAV_H, TRANSIT_ICONS } from "./constants.jsx";

// Leaflet CSS — injected once
let leafletCssInjected = false;
const injectLeafletCss = () => {
  if (leafletCssInjected) return;
  leafletCssInjected = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
};

// Time-of-day helpers
const BUCKET_COLORS = { morning: "#c49a3c", afternoon: "#4a7c59", evening: "#8b1a2f" };
const BUCKET_LABELS = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };
const BUCKET_ICONS  = { morning: "🌅", afternoon: "☀️", evening: "🌙" };
const getBucket = (t) => {
  if (!t) return "morning";
  const h = parseInt(t.split(":")[0]);
  const pm = /pm/i.test(t);
  const hour = pm && h !== 12 ? h + 12 : (!pm && h === 12 ? 0 : h);
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
};

// Category emoji
const CAT_EMOJI = {
  food:"🍽", restaurant:"🍽", cafe:"☕", coffee:"☕", bar:"🍸",
  museum:"🏛", gallery:"🎨", landmark:"📍", park:"🌿",
  market:"🛍", shopping:"🛍", activity:"🎯", experience:"✨",
  hotel:"🏨", temple:"⛩", shrine:"⛩", nightlife:"🌙",
};
const getCatEmoji = (cat) => {
  if (!cat) return "📍";
  const c = cat.toLowerCase();
  for (const [k, v] of Object.entries(CAT_EMOJI)) if (c.includes(k)) return v;
  return "📍";
};

function MapView({ day, activeDay, city, ratings, onSlotSelect, onReorderSlots }) {
  const mapRef       = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef   = useRef([]);
  const polylineRef  = useRef(null);
  const cardRefs     = useRef([]);
  const listRef      = useRef(null);

  const [selectedIdx, setSelectedIdx] = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);

  const slots = (day?.slots || []).filter(s =>
    typeof s.lat === "number" && typeof s.lng === "number" &&
    Number.isFinite(s.lat) && Number.isFinite(s.lng)
  );

  // Stable key for the markers effect — changes when slot order or names change
  const slotsKey = slots.map(s => s.name).join("|");

  // ── Load Leaflet from CDN ──────────────────────────────────────────
  useEffect(() => {
    injectLeafletCss();
    if (window.L) { setLeafletReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLeafletReady(true);
    document.head.appendChild(script);
  }, []);

  // ── Effect 1: Create map shell (tiles, controls) ───────────────────
  // Re-runs only when the day changes, NOT on slot reorder.
  useEffect(() => {
    if (!leafletReady || !mapRef.current || slots.length === 0) return;
    const L = window.L;

    // Destroy previous instance
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
      markersRef.current = [];
      polylineRef.current = null;
    }

    const avgLat = slots.reduce((s, p) => s + p.lat, 0) / slots.length;
    const avgLng = slots.reduce((s, p) => s + p.lng, 0) / slots.length;

    const map = L.map(mapRef.current, {
      center: [avgLat, avgLng], zoom: 14,
      zoomControl: false, attributionControl: false,
    });
    leafletMapRef.current = map;

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.attribution({ prefix: false, position: "bottomleft" }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '© <a href="https://carto.com">CARTO</a>',
      subdomains: "abcd", maxZoom: 20,
    }).addTo(map);

    return () => {
      if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; }
    };
  }, [leafletReady, day?.day, activeDay]); // eslint-disable-line

  // ── Effect 2: Draw markers + polyline ─────────────────────────────
  // Re-runs on every slot reorder — updates route without recreating the map.
  useEffect(() => {
    if (!leafletMapRef.current || !window.L || slots.length === 0) return;
    const L = window.L;
    const map = leafletMapRef.current;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Clear old polyline
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }

    // Draw new route
    const coords = slots.map(s => [s.lat, s.lng]);
    polylineRef.current = L.polyline(coords, {
      color: T.accent, weight: 4, opacity: 0.75, lineJoin: "round",
    }).addTo(map);

    // Draw markers
    slots.forEach((slot, i) => {
      const userRating = ratings[`${activeDay}-${i}`];
      const isCompleted = userRating !== undefined;
      const bc = BUCKET_COLORS[getBucket(slot.time)];
      const ratingColor = isCompleted
        ? (userRating >= 9 ? "#22c55e" : userRating >= 7 ? "#84cc16" : userRating >= 5 ? "#eab308" : userRating >= 3 ? "#f97316" : "#ef4444")
        : null;
      const markerColor = ratingColor || (slot.highlight ? T.gold : bc);
      const isSelected = selectedIdx === i;

      const icon = L.divIcon({
        html: `<div style="
          width:${isSelected ? 38 : 32}px;height:${isSelected ? 38 : 32}px;border-radius:50%;
          background:${markerColor};border:${isSelected ? "3px" : "2.5px"} solid white;
          box-shadow:${isSelected ? "0 4px 16px rgba(0,0,0,0.45)" : "0 2px 8px rgba(0,0,0,0.3)"};
          display:flex;align-items:center;justify-content:center;
          font-size:${isSelected ? 14 : 12}px;font-weight:800;color:white;
          font-family:'DM Sans',sans-serif;cursor:pointer;transition:all 0.15s;
        ">${i + 1}</div>`,
        className: "", iconSize: [isSelected?38:32, isSelected?38:32],
        iconAnchor: [isSelected?19:16, isSelected?19:16], popupAnchor: [0, -22],
      });

      const cat = slot.category ? slot.category.charAt(0).toUpperCase() + slot.category.slice(1) : "";
      const emoji = getCatEmoji(slot.category);

      const marker = L.marker([slot.lat, slot.lng], { icon })
        .addTo(map)
        .on("click", () => {
          setSelectedIdx(i);
          if (onSlotSelect) onSlotSelect(i);
          cardRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });

      marker.bindPopup(
        `<div style="font-family:'DM Sans',sans-serif;min-width:200px;max-width:260px;padding:2px 0">
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px">
            <div style="width:32px;height:32px;border-radius:50%;background:${markerColor};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:white;flex-shrink:0">${i + 1}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:800;font-size:14px;color:#1c1612;line-height:1.2;margin-bottom:2px">${slot.name}</div>
              <div style="font-size:11px;color:#a89880">${emoji} ${cat || "Stop"}${slot.neighborhood ? " · " + slot.neighborhood : ""}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
            <div style="background:#f5ede0;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:700;color:#1c1612">🕐 ${slot.time || ""}</div>
            ${slot.rating ? `<div style="background:#fff8ec;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:700;color:#c49a3c">★ ${Number(slot.rating).toFixed(1)}</div>` : ""}
            ${slot.highlight ? `<div style="background:#c49a3c20;border-radius:8px;padding:3px 8px;font-size:10px;font-weight:700;color:#c49a3c">Must-do</div>` : ""}
          </div>
          ${slot.must_know ? `<div style="margin-top:7px;font-size:11px;color:#5c4f3d;line-height:1.5;border-top:1px solid #f0e8dc;padding-top:6px">${slot.must_know}</div>` : ""}
        </div>`,
        { maxWidth: 280, closeButton: false }
      );

      markersRef.current.push(marker);
    });

    // Fit bounds only on first load (not on reorder — preserve viewport)
    if (selectedIdx === null) {
      map.fitBounds(L.latLngBounds(coords), { padding: [48, 32] });
    }
  }, [slotsKey, ratings, selectedIdx, activeDay, leafletReady]); // eslint-disable-line

  // ── Reorder handler ────────────────────────────────────────────────
  const handleMove = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= slots.length) return;
    const newSlots = [...(day?.slots || [])]; // use full slots array (including non-mapped)
    // Find actual indices in full slots array
    const allSlots = day?.slots || [];
    const mappedNames = slots.map(s => s.name);
    const fullIdxI = allSlots.findIndex(s => s.name === mappedNames[i]);
    const fullIdxJ = allSlots.findIndex(s => s.name === mappedNames[j]);
    if (fullIdxI === -1 || fullIdxJ === -1) return;
    [newSlots[fullIdxI], newSlots[fullIdxJ]] = [newSlots[fullIdxJ], newSlots[fullIdxI]];
    setSelectedIdx(j); // follow the card you moved
    if (onReorderSlots) onReorderSlots(newSlots);
  };

  // ── Empty state ────────────────────────────────────────────────────
  if (slots.length === 0) {
    return (
      <div style={{ padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 300, fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ fontSize: 40 }}>🗺</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>Map coming soon</div>
        <div style={{ fontSize: 13, color: T.inkFaint, textAlign: "center", maxWidth: 260, lineHeight: 1.6 }}>
          Generate a new itinerary to see your route on an interactive map.
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", paddingBottom: NAV_H + 20, fontFamily: "'DM Sans',sans-serif" }}>

      {/* Map */}
      <div style={{ position: "relative" }}>
        <div ref={mapRef} style={{ height: 340, width: "100%", background: T.paper }} />
        {!leafletReady && (
          <div style={{ position: "absolute", inset: 0, background: T.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: T.inkFaint }}>
            <div style={{ animation: "pulse 1.5s ease infinite" }}>Loading map…</div>
          </div>
        )}
      </div>

      {/* Legend strip — below map, no z-index conflict with popups */}
      <div style={{ padding: "10px 16px 8px", borderBottom: `1px solid ${T.dust}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.entries(BUCKET_COLORS).map(([b, color]) => (
            <div key={b} style={{ display: "flex", alignItems: "center", gap: 5, background: T.white, borderRadius: 20, padding: "4px 10px", border: `1px solid ${T.dust}`, fontSize: 11, fontWeight: 700, color: T.inkLight }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
              {BUCKET_ICONS[b]} {BUCKET_LABELS[b]}
            </div>
          ))}
        </div>
        {selectedIdx !== null && (
          <button
            onClick={() => {
              setSelectedIdx(null);
              if (leafletMapRef.current && window.L) {
                leafletMapRef.current.fitBounds(window.L.latLngBounds(slots.map(s => [s.lat, s.lng])), { padding: [48, 32] });
              }
            }}
            style={{ fontSize: 11, fontWeight: 700, color: T.accent, background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
            Show all
          </button>
        )}
      </div>

      {/* Stop count + reorder hint */}
      <div style={{ padding: "10px 16px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: T.inkFaint, textTransform: "uppercase", letterSpacing: "0.14em" }}>
          {slots.length} stop{slots.length !== 1 ? "s" : ""} · tap to zoom
        </div>
        {onReorderSlots && (
          <div style={{ fontSize: 11, color: T.inkFaint, display: "flex", alignItems: "center", gap: 4 }}>
            <span>↕</span> drag to reorder
          </div>
        )}
      </div>

      {/* Stop cards with transit connectors + reorder buttons */}
      <div ref={listRef} style={{ padding: "4px 16px 0" }}>
        {slots.map((slot, i) => {
          const userRating = ratings[`${activeDay}-${i}`];
          const isCompleted = userRating !== undefined;
          const bc = BUCKET_COLORS[getBucket(slot.time)];
          const ratingColor = isCompleted
            ? (userRating >= 9 ? "#22c55e" : userRating >= 7 ? "#84cc16" : userRating >= 5 ? "#eab308" : userRating >= 3 ? "#f97316" : "#ef4444")
            : null;
          const markerColor = ratingColor || (slot.highlight ? T.gold : bc);
          const isSelected = selectedIdx === i;
          const nextSlot = slots[i + 1];
          const emoji = getCatEmoji(slot.category);

          return (
            <div key={slot.name + i} ref={el => cardRefs.current[i] = el}>
              {/* Stop card */}
              <button
                onClick={() => {
                  setSelectedIdx(i);
                  if (onSlotSelect) onSlotSelect(i);
                  if (markersRef.current[i] && leafletMapRef.current) {
                    leafletMapRef.current.setView([slot.lat, slot.lng], 16, { animate: true });
                    markersRef.current[i].openPopup();
                  }
                }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 16,
                  background: isSelected ? `${markerColor}10` : T.white,
                  border: `${isSelected ? "2px" : "1.5px"} solid ${isSelected ? markerColor : T.dust}`,
                  cursor: "pointer", textAlign: "left",
                  boxShadow: isSelected ? `0 4px 16px ${markerColor}25` : "none",
                  transition: "all 0.15s",
                }}>

                {/* Number badge */}
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", background: markerColor, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, color: "white",
                  boxShadow: isSelected ? `0 2px 8px ${markerColor}50` : "none",
                }}>{i + 1}</div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                    <span style={{ fontSize: 12 }}>{emoji}</span>
                    <span style={{
                      fontSize: 14, fontWeight: 700,
                      color: isCompleted ? T.inkFaint : T.ink,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      textDecoration: isCompleted ? "line-through" : "none", flex: 1,
                    }}>{slot.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: T.inkFaint }}>{slot.time}</span>
                    {slot.neighborhood && (
                      <><span style={{ fontSize: 11, color: T.dust }}>·</span>
                      <span style={{ fontSize: 11, color: T.inkFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>{slot.neighborhood}</span></>
                    )}
                    {slot.rating && (
                      <><span style={{ fontSize: 11, color: T.dust }}>·</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.gold }}>★ {Number(slot.rating).toFixed(1)}</span></>
                    )}
                  </div>
                </div>

                {/* Right side: photo + user rating */}
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                  {slot.photos?.[0] ? (
                    <img src={slot.photos[0]} alt={slot.name}
                      style={{ width: 40, height: 40, borderRadius: 9, objectFit: "cover" }}
                      onError={e => e.target.style.display = "none"} />
                  ) : slot.highlight ? (
                    <div style={{ fontSize: 9, fontWeight: 800, color: T.gold, background: "#c49a3c18", borderRadius: 8, padding: "2px 6px", textTransform: "uppercase" }}>★ Must-do</div>
                  ) : null}
                  {isCompleted && (
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: ratingColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "white" }}>{userRating}</div>
                  )}
                </div>

                {/* Reorder buttons — only when callback provided */}
                {onReorderSlots && (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{ display: "flex", flexDirection: "column", gap: 3, flexShrink: 0, marginLeft: 4 }}>
                    <button
                      onClick={e => { e.stopPropagation(); handleMove(i, -1); }}
                      disabled={i === 0}
                      style={{
                        width: 24, height: 24, borderRadius: 7, fontSize: 11, lineHeight: 1,
                        background: i === 0 ? "transparent" : T.paper,
                        border: `1px solid ${i === 0 ? "transparent" : T.dust}`,
                        color: i === 0 ? "transparent" : T.inkLight,
                        cursor: i === 0 ? "default" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>↑</button>
                    <button
                      onClick={e => { e.stopPropagation(); handleMove(i, 1); }}
                      disabled={i === slots.length - 1}
                      style={{
                        width: 24, height: 24, borderRadius: 7, fontSize: 11, lineHeight: 1,
                        background: i === slots.length - 1 ? "transparent" : T.paper,
                        border: `1px solid ${i === slots.length - 1 ? "transparent" : T.dust}`,
                        color: i === slots.length - 1 ? "transparent" : T.inkLight,
                        cursor: i === slots.length - 1 ? "default" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>↓</button>
                  </div>
                )}
              </button>

              {/* Transit connector between stops */}
              {i < slots.length - 1 && (
                <div style={{ display: "flex", alignItems: "center", padding: "0 17px", height: 28 }}>
                  <div style={{ width: 2, height: "100%", background: T.dust, marginLeft: 17, flexShrink: 0 }} />
                  {nextSlot?.transit_from_prev && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 10, background: T.paper, borderRadius: 20, padding: "2px 10px", border: `1px solid ${T.dust}` }}>
                      <span style={{ fontSize: 11 }}>{TRANSIT_ICONS[nextSlot.transit_mode || "walk"] || "🚶"}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: T.inkLight }}>{nextSlot.transit_from_prev}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { MapView };
