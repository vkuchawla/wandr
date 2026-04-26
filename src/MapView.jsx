import { useEffect, useRef, useState } from "react";
import { T, NAV_H, TRANSIT_ICONS } from "./constants.jsx";

// Leaflet CSS injected once into <head>
let leafletCssInjected = false;
const injectLeafletCss = () => {
  if (leafletCssInjected) return;
  leafletCssInjected = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
};

// Bucket colors for markers
const BUCKET_COLORS = { morning: "#c49a3c", afternoon: "#4a7c59", evening: "#8b1a2f" };
const getBucket = (t) => {
  if (!t) return "morning";
  const h = parseInt(t.split(":")[0]);
  const pm = /pm/i.test(t);
  const hour = pm && h !== 12 ? h + 12 : (!pm && h === 12 ? 0 : h);
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
};

function MapView({ day, activeDay, city, ratings, onSlotSelect }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);

  const slots = (day?.slots || []).filter(s =>
    typeof s.lat === "number" && typeof s.lng === "number" &&
    Number.isFinite(s.lat) && Number.isFinite(s.lng)
  );

  // Load Leaflet dynamically (heavy dep — only when map is shown)
  useEffect(() => {
    injectLeafletCss();
    if (window.L) { setLeafletReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLeafletReady(true);
    document.head.appendChild(script);
  }, []);

  // Init / reinit map whenever slots or Leaflet readiness changes
  useEffect(() => {
    if (!leafletReady || !mapRef.current) return;
    const L = window.L;

    // Destroy existing map instance before creating a new one
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
      markersRef.current = [];
    }

    if (slots.length === 0) return;

    // Center on centroid of all points
    const avgLat = slots.reduce((s, p) => s + p.lat, 0) / slots.length;
    const avgLng = slots.reduce((s, p) => s + p.lng, 0) / slots.length;

    const map = L.map(mapRef.current, {
      center: [avgLat, avgLng],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });
    leafletMapRef.current = map;

    // Minimal attribution
    L.control.attribution({ prefix: false, position: "bottomright" }).addTo(map);

    // Tile layer — Carto Voyager (clean, no API key)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '© <a href="https://carto.com">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    // Draw route polyline
    const coords = slots.map(s => [s.lat, s.lng]);
    L.polyline(coords, {
      color: T.accent,
      weight: 3,
      opacity: 0.65,
      dashArray: "6, 6",
    }).addTo(map);

    // Custom numbered markers
    slots.forEach((slot, i) => {
      const rating = ratings[`${activeDay}-${i}`];
      const isCompleted = rating !== undefined;
      const bc = BUCKET_COLORS[getBucket(slot.time)];
      const ratingColor = isCompleted
        ? (rating >= 9 ? "#22c55e" : rating >= 7 ? "#84cc16" : rating >= 5 ? "#eab308" : rating >= 3 ? "#f97316" : "#ef4444")
        : null;
      const markerColor = ratingColor || (slot.highlight ? T.gold : bc);

      const icon = L.divIcon({
        html: `<div style="
          width:30px;height:30px;border-radius:50%;
          background:${markerColor};
          border:2.5px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:800;color:white;
          font-family:'DM Sans',sans-serif;
          cursor:pointer;transition:transform 0.15s;
        ">${i + 1}</div>`,
        className: "",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([slot.lat, slot.lng], { icon })
        .addTo(map)
        .on("click", () => {
          setSelectedIdx(i);
          if (onSlotSelect) onSlotSelect(i);
        });

      // Popup with slot summary
      const cat = slot.category ? slot.category.charAt(0).toUpperCase() + slot.category.slice(1) : "";
      marker.bindPopup(
        `<div style="font-family:'DM Sans',sans-serif;min-width:180px;max-width:240px">
          <div style="font-weight:800;font-size:14px;color:#1c1612;margin-bottom:3px">${slot.name}</div>
          <div style="font-size:11px;color:#5c4f3d;margin-bottom:6px">${slot.time || ""}${cat ? " · " + cat : ""}${slot.neighborhood ? " · " + slot.neighborhood : ""}</div>
          ${slot.rating ? `<div style="display:inline-flex;align-items:center;gap:3px;background:#f5ede0;border-radius:8px;padding:2px 7px;font-size:11px;font-weight:700;color:#1c1612"><span style="color:#c49a3c">★</span>${Number(slot.rating).toFixed(1)}</div>` : ""}
          ${slot.highlight ? `<div style="display:inline-flex;align-items:center;gap:3px;background:#c49a3c20;border-radius:8px;padding:2px 7px;font-size:10px;font-weight:700;color:#c49a3c;margin-left:4px">★ Must-do</div>` : ""}
        </div>`,
        { maxWidth: 260, closeButton: false }
      );

      markersRef.current.push(marker);
    });

    // Fit bounds with padding
    if (slots.length > 1) {
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [leafletReady, day?.day, activeDay]);

  // No coords at all
  if (slots.length === 0) {
    return (
      <div style={{
        padding: "48px 24px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 12, minHeight: 300, fontFamily: "'DM Sans',sans-serif",
      }}>
        <div style={{ fontSize: 40 }}>🗺</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>Map coming soon</div>
        <div style={{ fontSize: 13, color: T.inkFaint, textAlign: "center", maxWidth: 260, lineHeight: 1.6 }}>
          Location data is added when you generate a new itinerary. Your next trip will show an interactive route map here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", paddingBottom: NAV_H + 20 }}>
      {/* Map container */}
      <div
        ref={mapRef}
        style={{
          height: 420,
          width: "100%",
          background: T.paper,
          position: "relative",
        }}
      />

      {/* Loading overlay */}
      {!leafletReady && (
        <div style={{
          position: "absolute", inset: 0, height: 420,
          background: T.paper, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.inkFaint,
        }}>
          <div style={{ animation: "pulse 1.5s ease infinite" }}>Loading map…</div>
        </div>
      )}

      {/* Stop list below map */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: T.inkFaint, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 12 }}>
          {slots.length} mapped stop{slots.length !== 1 ? "s" : ""}
        </div>
        {slots.map((slot, i) => {
          const rating = ratings[`${activeDay}-${i}`];
          const isCompleted = rating !== undefined;
          const bc = BUCKET_COLORS[getBucket(slot.time)];
          const ratingColor = isCompleted
            ? (rating >= 9 ? "#22c55e" : rating >= 7 ? "#84cc16" : rating >= 5 ? "#eab308" : rating >= 3 ? "#f97316" : "#ef4444")
            : null;
          const markerColor = ratingColor || (slot.highlight ? T.gold : bc);

          return (
            <button
              key={i}
              onClick={() => {
                setSelectedIdx(i);
                if (markersRef.current[i] && leafletMapRef.current) {
                  leafletMapRef.current.setView([slot.lat, slot.lng], 16, { animate: true });
                  markersRef.current[i].openPopup();
                }
              }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", borderRadius: 14, marginBottom: 6,
                background: selectedIdx === i ? `${markerColor}12` : T.white,
                border: `1.5px solid ${selectedIdx === i ? markerColor : T.dust}`,
                cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans',sans-serif",
                transition: "all 0.15s",
              }}>
              {/* Number badge */}
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: markerColor,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, fontSize: 12, fontWeight: 800, color: "white",
              }}>{i + 1}</div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: isCompleted ? T.inkFaint : T.ink,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  textDecoration: isCompleted ? "line-through" : "none",
                }}>{slot.name}</div>
                <div style={{ fontSize: 11, color: T.inkFaint, marginTop: 1 }}>
                  {slot.time}{slot.neighborhood ? " · " + slot.neighborhood : ""}
                </div>
              </div>
              {/* Transit to next */}
              {i < slots.length - 1 && slot.transit_from_prev && (
                <div style={{ fontSize: 10, color: T.inkFaint, flexShrink: 0, textAlign: "right" }}>
                  <div>{TRANSIT_ICONS[slots[i + 1]?.transit_mode || "walk"] || "🚶"}</div>
                  <div style={{ fontWeight: 600 }}>{(slots[i + 1]?.transit_from_prev || "").match(/\d+/)?.[0]}m</div>
                </div>
              )}
              {/* Rating badge */}
              {isCompleted && (
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", background: ratingColor,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: 11, fontWeight: 900, color: "white",
                }}>{rating}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { MapView };
