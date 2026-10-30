import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { haversineKm, parseStation } from "@/lib/types";

// Plan B Pairing — find the nearest compatible alternative station.
// "Compatible" = shares at least one connector type + is operational or maintenance.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const station = await db.station.findUnique({ where: { id } });
    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    const connectors = station.connectorTypes.split(",").filter(Boolean);

    const all = await db.station.findMany({
      where: { id: { not: id } },
    });

    const candidates = all
      .map((s) => {
        const sConnectors = s.connectorTypes.split(",").filter(Boolean);
        const shared = sConnectors.filter((c) => connectors.includes(c));
        const distance = haversineKm(station.lat, station.lng, s.lat, s.lng);
        return { station: s, shared, distance };
      })
      .filter((x) => x.shared.length > 0 && x.distance <= 15) // within 15 km
      .sort((a, b) => {
        // Prefer operational, then nearest
        const aOp = a.station.status === "OPERATIONAL" ? 0 : 1;
        const bOp = b.station.status === "OPERATIONAL" ? 0 : 1;
        if (aOp !== bOp) return aOp - bOp;
        return a.distance - b.distance;
      });

    const best = candidates[0];
    if (!best) {
      return NextResponse.json({
        planB: null,
        reason: "No compatible charging station found within 15 km.",
      });
    }

    return NextResponse.json({
      planB: {
        ...parseStation(best.station),
        distance: Math.round(best.distance * 10) / 10,
        sharedConnectors: best.shared,
        googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${best.station.lat},${best.station.lng}`,
      },
      reason:
        best.station.status === "OPERATIONAL"
          ? `Nearest compatible charger, ${Math.round(best.distance * 10) / 10} km away.`
          : `Nearest compatible charger is currently ${best.station.status.toLowerCase()}, ${Math.round(best.distance * 10) / 10} km away.`,
    });
  } catch (error) {
    console.error("[PLAN_B]", error);
    return NextResponse.json({ error: "Failed to find Plan B" }, { status: 500 });
  }
}
