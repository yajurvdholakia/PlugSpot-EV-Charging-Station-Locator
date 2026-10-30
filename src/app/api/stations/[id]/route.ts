import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { parseStation } from "@/lib/types";
import { stationUpdateSchema, toCsv } from "@/lib/validation";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const station = await db.station.findUnique({
      where: { id },
      include: {
        reviews: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    const user = await getCurrentUser();
    let isFavorite = false;
    let myReview = null;
    if (user) {
      const fav = await db.favorite.findUnique({
        where: { userId_stationId: { userId: user.id, stationId: id } },
      });
      isFavorite = !!fav;
      myReview = await db.review.findUnique({
        where: { userId_stationId: { userId: user.id, stationId: id } },
      });
    }

    return NextResponse.json({
      ...parseStation(station),
      isFavorite,
      myReview: myReview
        ? {
            id: myReview.id,
            rating: myReview.rating,
            comment: myReview.comment,
            createdAt: myReview.createdAt.toISOString(),
          }
        : null,
      reviews: station.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        user: r.user,
      })),
    });
  } catch (error) {
    console.error("[STATION_GET]", error);
    return NextResponse.json({ error: "Failed to fetch station" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await db.station.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    const parsed = stationUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const d = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (d.name !== undefined) updateData.name = d.name;
    if (d.operator !== undefined) updateData.operator = d.operator;
    if (d.address !== undefined) updateData.address = d.address;
    if (d.area !== undefined) updateData.area = d.area;
    if (d.city !== undefined) updateData.city = d.city;
    if (d.state !== undefined) updateData.state = d.state;
    if (d.status !== undefined) updateData.status = d.status;
    if (d.hours !== undefined) updateData.hours = d.hours;
    if (d.phone !== undefined) updateData.phone = d.phone || null;
    if (d.image !== undefined) updateData.image = d.image || null;
    if (d.lat !== undefined) updateData.lat = d.lat;
    if (d.lng !== undefined) updateData.lng = d.lng;
    if (d.powerKW !== undefined) updateData.powerKW = d.powerKW;
    if (d.pricePerKWh !== undefined) updateData.pricePerKWh = d.pricePerKWh;
    if (d.numberOfPorts !== undefined) updateData.numberOfPorts = d.numberOfPorts;
    if (d.availablePorts !== undefined) updateData.availablePorts = d.availablePorts;
    if (d.connectorTypes !== undefined) updateData.connectorTypes = toCsv(d.connectorTypes);
    if (d.amenities !== undefined) updateData.amenities = toCsv(d.amenities);

    const station = await db.station.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(parseStation(station));
  } catch (error) {
    console.error("[STATION_PUT]", error);
    return NextResponse.json({ error: "Failed to update station" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    await db.station.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[STATION_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete station" }, { status: 500 });
  }
}
