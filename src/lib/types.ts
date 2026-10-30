// Shared types used across the app (frontend + API contracts).

export type StationStatus = "OPERATIONAL" | "MAINTENANCE" | "OFFLINE";
export type ConnectorType = "CCS" | "Type2" | "CHAdeMO" | "BharatAC" | "Tesla";

export interface Station {
  id: string;
  name: string;
  operator: string;
  address: string;
  area: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  status: StationStatus;
  connectorTypes: string[];
  powerKW: number;
  pricePerKWh: number;
  numberOfPorts: number;
  availablePorts: number;
  amenities: string[];
  hours: string;
  phone: string | null;
  image: string | null;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StationWithMeta extends Station {
  isFavorite?: boolean;
  distance?: number; // km from user
}

export interface Review {
  id: string;
  userId: string;
  stationId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string | null; email: string };
}

export interface StationFilters {
  city?: string;
  operator?: string;
  connectorType?: string;
  status?: StationStatus;
  search?: string;
  availableOnly?: boolean;
  minPower?: number;
  maxPrice?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export function parseStation(raw: {
  id: string;
  name: string;
  operator: string;
  address: string;
  area: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  status: string;
  connectorTypes: string;
  powerKW: number;
  pricePerKWh: number;
  numberOfPorts: number;
  availablePorts: number;
  amenities: string;
  hours: string;
  phone: string | null;
  image: string | null;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}): Station {
  return {
    ...raw,
    status: raw.status as StationStatus,
    connectorTypes: raw.connectorTypes ? raw.connectorTypes.split(",").filter(Boolean) : [],
    amenities: raw.amenities ? raw.amenities.split(",").filter(Boolean) : [],
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };
}

/**
 * Haversine distance between two lat/lng points, in kilometres.
 *
 * The Haversine formula calculates the great-circle distance — the shortest
 * distance over the Earth's surface — accounting for the planet's curvature.
 * We use this instead of a flat Pythagorean distance because at the scale of
 * a city (10-30 km) the curvature error is small but non-zero, and at highway
 * distances (Kadi, Dehgam) it matters more.
 *
 * Why we can't do this in the database: SQLite has no GIS/geospatial support
 * (no PostGIS equivalent). So we fetch candidate stations from the DB first,
 * then compute distances in the API route and sort nearest-first in memory.
 *
 * R = 6371 km is the Earth's mean radius. The formula uses the spherical law
 * of cosines variant; for distances under ~1000 km the precision is well
 * within what a driver needs.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's mean radius in km
  // Convert coordinate differences to radians
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  // a = square of half the chord length between the points
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const OPERATORS = [
  "Tata Power",
  "ChargeZone",
  "Ather Grid",
  "Statiq",
  "Exicom",
  "Magenta",
] as const;

export const CONNECTOR_TYPES = ["CCS", "Type2", "CHAdeMO", "BharatAC"] as const;

export const CITIES = ["Gandhinagar", "Ahmedabad"] as const;
