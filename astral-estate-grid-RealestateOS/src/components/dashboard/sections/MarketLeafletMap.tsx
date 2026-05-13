import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { MarkerCategory, MarketZone } from "@/lib/market-map-types";
import { markerCategory } from "@/lib/market-map-marker";

const DARK_TILE = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const CAT_STYLE: Record<MarkerCategory, { bg: string; border: string }> = {
  "high-opportunity": { bg: "#22c55e", border: "#16a34a" },
  emerging: { bg: "#38bdf8", border: "#0ea5e9" },
  stable: { bg: "#eab308", border: "#ca8a04" },
  "high-risk": { bg: "#ef4444", border: "#b91c1c" },
};

function makeDivIcon(cat: MarkerCategory, pulse: boolean) {
  const { bg, border } = CAT_STYLE[cat];
  const pulseClass = pulse ? "mlm-pin-pulse" : "";
  return L.divIcon({
    className: "mlm-leaflet-div-icon",
    html: `<div class="mlm-pin-outer ${pulseClass}" style="border-color:${border}"><div class="mlm-pin-inner" style="background:${bg};box-shadow:0 0 16px ${bg}"></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function FitBounds({ zones }: { zones: MarketZone[] }) {
  const map = useMap();
  useEffect(() => {
    if (!zones.length) return;
    const pts = zones.map(z => L.latLng(z.lat, z.lng));
    const b = L.latLngBounds(pts);
    map.fitBounds(b, { padding: [48, 48], maxZoom: 11, animate: true });
  }, [map, zones]);
  return null;
}

export type MarketLeafletMapProps = {
  zones: MarketZone[];
  selectedId: string | null;
  pulseIds: ReadonlySet<string>;
  onMarkerClick: (z: MarketZone) => void;
  className?: string;
};

export default function MarketLeafletMap({ zones, selectedId, pulseIds, onMarkerClick, className }: MarketLeafletMapProps) {
  const center = useMemo(() => {
    if (!zones.length) return [20, 0] as [number, number];
    const lat = zones.reduce((s, z) => s + z.lat, 0) / zones.length;
    const lng = zones.reduce((s, z) => s + z.lng, 0) / zones.length;
    return [lat, lng] as [number, number];
  }, [zones]);

  return (
    <MapContainer
      center={center}
      zoom={4}
      className={className ?? "h-full min-h-[320px] w-full rounded-xl z-0"}
      scrollWheelZoom
      style={{ minHeight: "min(70vh, 560px)" }}
    >
      <TileLayer attribution={TILE_ATTRIB} url={DARK_TILE} />
      <FitBounds zones={zones} />
      {zones.map(z => {
        const cat = markerCategory(z);
        const pulse = pulseIds.has(z.id) || z.id === selectedId;
        const icon = makeDivIcon(cat, pulse);
        return (
          <Marker
            key={`${z.id}-${pulseIds.has(z.id) ? "p" : "n"}`}
            position={[z.lat, z.lng]}
            icon={icon}
            eventHandlers={{
              click: () => {
                onMarkerClick(z);
              },
            }}
          >
            <Popup className="glass-strong">
              <div className="min-w-[200px] text-foreground">
                <div className="font-semibold text-sm">{z.areaName}</div>
                <div className="text-xs text-muted-foreground mb-2">
                  {z.city}, {z.country}
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                  <span className="text-muted-foreground">Opportunity</span>
                  <span className="font-medium">{z.opportunityScore}</span>
                  <span className="text-muted-foreground">Demand</span>
                  <span className="font-medium">{z.demandScore}</span>
                </div>
                <button
                  type="button"
                  className="w-full rounded-md bg-primary/90 px-2 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary"
                  onClick={() => onMarkerClick(z)}
                >
                  Open intelligence report
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
