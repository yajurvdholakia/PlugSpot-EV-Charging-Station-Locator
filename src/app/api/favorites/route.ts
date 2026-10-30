import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { haversineKm, parseStation } from "@/lib/types";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favorites = await db.favorite.findMany({
      where: { userId: user.id },
      include: { station: true },
      orderBy: { createdAt: "desc" },
    });

    const stations = favorites.map((f) => ({
      ...parseStation(f.station),
      isFavorite: true,
    }));

    return NextResponse.json({ stations, total: stations.length });
  } catch (error) {
    console.error("[FAVORITES_GET]", error);
    return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { stationId } = await req.json();
    if (!stationId) {
      return NextResponse.json({ error: "stationId is required" }, { status: 400 });
    }

    const favorite = await db.favorite.create({
      data: { userId: user.id, stationId },
    });

    return NextResponse.json({ success: true, favorite });
  } catch (error) {
    console.error("[FAVORITES_POST]", error);
    return NextResponse.json({ error: "Failed to add favorite" }, { status: 500 });
  }
}
