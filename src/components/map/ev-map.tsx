"use client";

import * as React from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { MapPin, Zap, Battery, Clock, Star, Navigation } from "lucide-react";
import type { StationWithMeta } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Fix for default marker icons in Leaflet with bundlers
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function makeStationIcon(status: string, isActive: boolean) {
  const statusClass =
    status === "OPERATIONAL"
      ? "operational"
      : status === "MAINTENANCE"
      ? "maintenance"
      : "offline";
  return L.divIcon({
    className: "ev-marker",
    html: `<div class="ev-marker-pin ${statusClass} ${isActive ? "active" : ""}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -34],
  });
}

const USER_ICON = L.divIcon({
  className: "ev-marker",
  html: `<div style="position:relative;width:24px;height:24px;">
    <div class="pulse-ring" style="position:absolute;inset:0;border-radius:50%;background:oklch(0.6 0.2 240);"></div>
    <div style="position:absolute;inset:6px;border-radius:50%;background:oklch(0.5 0.25 240);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const DEFAULT_CENTER: [number, number] = [23.0833, 72.6167]; // Between Gandhinagar & Ahmedabad
const DEFAULT_ZOOM = 12;

// Helper component to fly to a station when active
function FlyToController({
  activeStation,
  stations,
}: {
  activeStation: string | null;
  stations: StationWithMeta[];
}) {
  const map = useMap();
  React.useEffect(() => {
    if (activeStation) {
      const s = stations.find((x) => x.id === activeStation);
      if (s) {
        map.flyTo([s.lat, s.lng], Math.max(map.getZoom(), 14), {
          duration: 0.8,
        });
      }
    }
  }, [activeStation, stations, map]);
  return null;
}

// Helper component to invalidate size after mount (fixes tile gray issue)
function ResizeFix() {
  const map = useMap();
  React.useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export interface EvMapProps {
  stations: StationWithMeta[];
  activeStationId: string | null;
  onStationClick: (id: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  radiusKm?: number;
}

export function EvMap({
  stations,
  activeStationId,
  onStationClick,
  userLocation,
  radiusKm,
}: EvMapProps) {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      className="h-full w-full"
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ResizeFix />
      <FlyToController activeStation={activeStationId} stations={stations} />

      {userLocation && (
        <>
          <Marker position={[userLocation.lat, userLocation.lng]} icon={USER_ICON}>
            <Popup>
              <div className="p-1">
                <p className="font-semibold text-sm">You are here</p>
                <p className="text-xs text-muted-foreground">
                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
          {radiusKm && (
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={radiusKm * 1000}
              pathOptions={{
                color: "#0d9488",
                fillColor: "#0d9488",
                fillOpacity: 0.08,
                weight: 1.5,
              }}
            />
          )}
        </>
      )}

      {stations.map((station) => {
        const isActive = station.id === activeStationId;
        const availability =
          station.status === "OPERATIONAL"
            ? `${station.availablePorts}/${station.numberOfPorts} available`
            : station.status === "MAINTENANCE"
            ? "Under maintenance"
            : "Offline";

        return (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            icon={makeStationIcon(station.status, isActive)}
            eventHandlers={{
              click: () => onStationClick(station.id),
            }}
            zIndexOffset={isActive ? 1000 : 0}
          >
            <Popup minWidth={240} maxWidth={280}>
              <div className="p-3 w-full">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <p className="font-semibold text-sm leading-tight">
                      {station.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {station.operator} · {station.area}, {station.city}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] py-0 px-1.5",
                      station.status === "OPERATIONAL" &&
                        "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                      station.status === "MAINTENANCE" &&
                        "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                      station.status === "OFFLINE" &&
                        "bg-red-500/15 text-red-600 dark:text-red-400"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current mr-1" />
                    {availability}
                  </Badge>
                  {station.rating > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] py-0 px-1.5 gap-0.5"
                    >
                      <Star className="w-2.5 h-2.5 fill-current" />
                      {station.rating}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[11px] mb-2">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Zap className="w-3 h-3 text-primary" />
                    {station.powerKW} kW
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Battery className="w-3 h-3 text-primary" />
                    ₹{station.pricePerKWh}/kWh
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground col-span-2">
                    <Clock className="w-3 h-3 text-primary" />
                    {station.hours}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground col-span-2">
                    <MapPin className="w-3 h-3 text-primary" />
                    {station.connectorTypes.join(", ")}
                  </div>
                </div>

                {station.distance !== undefined && (
                  <p className="text-[11px] text-muted-foreground mb-2">
                    ~{station.distance} km from you
                  </p>
                )}

                <Button
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={() => onStationClick(station.id)}
                >
                  <Navigation className="w-3 h-3 mr-1" />
                  View Details
                </Button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
