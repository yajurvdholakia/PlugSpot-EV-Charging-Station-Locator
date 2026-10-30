import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { haversineKm, parseStation } from "@/lib/types";
import { LANDMARKS } from "@/lib/seed-data";

// GET — list all landmarks (for the destination picker)
// POST — search stations near a destination + compute charge added in a duration
export async function GET() {
  return NextResponse.json({ landmarks: LANDMARKS });
}

export async function POST(req: Request) {
  try {
    const { landmarkName, durationMinutes } = await req.json();

    const landmark = LANDMARKS.find((l) => l.name === landmarkName);
    if (!landmark) {
      return NextResponse.json({ error: "Landmark not found" }, { status: 404 });
    }

    const duration = Math.max(5, Math.min(600, Number(durationMinutes) || 60));

    const stations = await db.station.findMany();

    // Find stations within 2 km of the landmark
    const nearby = stations
      .map((s) => {
        const distance = haversineKm(landmark.lat, landmark.lng, s.lat, s.lng);
        // Charge added (kWh) = power (kW) × hours, capped at a typical 40 kWh session
        // (assumes ~75% usable battery of a 55 kWh EV pack)
        const hours = duration / 60;
        const chargeAdded = Math.min(
          40,
          Math.round(s.powerKW * hours * 10) / 10
        );
        // Range added (km) at ~6 km/kWh efficiency (typical EV)
        const rangeAdded = Math.round(chargeAdded * 6);
        // Cost for the session
        const cost = Math.round(chargeAdded * s.pricePerKWh);
        return {
          ...parseStation(s),
          distance: Math.round(distance * 10) / 10,
          chargeAddedKWh: s.status === "OPERATIONAL" ? chargeAdded : 0,
          rangeAddedKm: s.status === "OPERATIONAL" ? rangeAdded : 0,
          estimatedCost: s.status === "OPERATIONAL" ? cost : 0,
          walkTimeMin: Math.round(distance * 12), // ~12 min/km walking
        };
      })
      .filter((x) => x.distance <= 2)
      .sort((a, b) => a.distance - b.distance);

    return NextResponse.json({
      landmark,
      durationMinutes: duration,
      stations: nearby,
      total: nearby.length,
    });
  } catch (error) {
    console.error("[DESTINATIONS_POST]", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
