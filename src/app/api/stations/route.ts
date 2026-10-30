import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { haversineKm, parseStation, type StationFilters } from "@/lib/types";
import { stationCreateSchema, toCsv } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    const filters: StationFilters = {
      city: params.get("city") || undefined,
      operator: params.get("operator") || undefined,
      connectorType: params.get("connectorType") || undefined,
      status: (params.get("status") as StationFilters["status"]) || undefined,
      search: params.get("search") || undefined,
      availableOnly: params.get("availableOnly") === "true",
      minPower: params.get("minPower") ? Number(params.get("minPower")) : undefined,
      maxPrice: params.get("maxPrice") ? Number(params.get("maxPrice")) : undefined,
      lat: params.get("lat") ? Number(params.get("lat")) : undefined,
      lng: params.get("lng") ? Number(params.get("lng")) : undefined,
      radiusKm: params.get("radiusKm") ? Number(params.get("radiusKm")) : undefined,
    };

    const where: Record<string, unknown> = {};

    if (filters.city) where.city = filters.city;
    if (filters.operator) where.operator = filters.operator;
    if (filters.status) where.status = filters.status;

    if (filters.availableOnly) {
      where.availablePorts = { gt: 0 };
    }
    if (filters.minPower !== undefined) {
      where.powerKW = { gte: filters.minPower };
    }
    if (filters.maxPrice !== undefined) {
      where.pricePerKWh = { lte: filters.maxPrice };
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { area: { contains: filters.search } },
        { operator: { contains: filters.search } },
        { address: { contains: filters.search } },
      ];
    }
    if (filters.connectorType) {
      // SQLite doesn't support array filters; use contains on the CSV string.
      // Match either exact value or value surrounded by commas.
      where.connectorTypes = { contains: filters.connectorType };
    }

    let stations = await db.station.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Geospatial filter (in-memory because SQLite lacks GIS support)
    if (filters.lat !== undefined && filters.lng !== undefined) {
      const withDistance = stations.map((s) => ({
        station: s,
        distance: haversineKm(filters.lat!, filters.lng!, s.lat, s.lng),
      }));
      const filtered = filters.radiusKm
        ? withDistance.filter((x) => x.distance <= filters.radiusKm!)
        : withDistance;
      filtered.sort((a, b) => a.distance - b.distance);
      stations = filtered.map((x) => x.station);
    }

    // Check favorites for current user
    const user = await getCurrentUser();
    let favoriteIds = new Set<string>();
    if (user) {
      const favs = await db.favorite.findMany({
        where: { userId: user.id },
        select: { stationId: true },
      });
      favoriteIds = new Set(favs.map((f) => f.stationId));
    }

    const result = stations.map((s) => {
      const parsed = parseStation(s);
      let distance: number | undefined;
      if (filters.lat !== undefined && filters.lng !== undefined) {
        distance = haversineKm(filters.lat!, filters.lng!, s.lat, s.lng);
      }
      return {
        ...parsed,
        isFavorite: favoriteIds.has(s.id),
        distance: distance !== undefined ? Math.round(distance * 10) / 10 : undefined,
      };
    });

    return NextResponse.json({ stations: result, total: result.length });
  } catch (error) {
    console.error("[STATIONS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch stations" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = stationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const d = parsed.data;

    const station = await db.station.create({
      data: {
        name: d.name,
        operator: d.operator,
        address: d.address,
        area: d.area,
        city: d.city,
        state: d.state,
        lat: d.lat,
        lng: d.lng,
        status: d.status,
        connectorTypes: toCsv(d.connectorTypes),
        powerKW: d.powerKW,
        pricePerKWh: d.pricePerKWh,
        numberOfPorts: d.numberOfPorts,
        availablePorts: d.availablePorts ?? d.numberOfPorts,
        amenities: toCsv(d.amenities),
        hours: d.hours,
        phone: d.phone || null,
        image: d.image || null,
      },
    });

    return NextResponse.json(parseStation(station));
  } catch (error) {
    console.error("[STATIONS_POST]", error);
    return NextResponse.json(
      { error: "Failed to create station" },
      { status: 500 }
    );
  }
}
